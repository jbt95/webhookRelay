import { Hono } from 'hono';
import type { HonoRequest } from 'hono';
import { z } from 'zod';
import { ulid } from 'ulid';
import { drizzle } from 'drizzle-orm/d1';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '@webhook-relay/db';
import type { AppContext } from '../types';

const requestSchema = z.object({
  headers: z.record(z.string()).default({}),
  payload: z.unknown(),
});

const hashPayload = async (input: unknown): Promise<string> => {
  const encoder = new TextEncoder();
  const json = typeof input === 'string' ? input : JSON.stringify(input ?? {});
  const data = encoder.encode(json);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const buildDb = (db: D1Database): DrizzleD1Database<typeof schema> => drizzle(db, { schema });

const parsers = [
  {
    match: (ct: string) => ct.includes('application/json'),
    parse: (req: HonoRequest) => req.json() as Promise<unknown>,
  },
  {
    match: (ct: string) => ct.includes('application/x-www-form-urlencoded'),
    parse: (req: HonoRequest) => req.parseBody(),
  },
];

const parsePayload = (req: HonoRequest): Promise<unknown> => {
  const contentType = req.header('content-type') ?? 'application/json';
  const selected = parsers.find(({ match }) => match(contentType)) ?? {
    parse: (r: HonoRequest) => r.text() as Promise<unknown>,
  };
  return selected.parse(req);
};

export const ingressRoutes = new Hono<AppContext>();

// POST /v1/webhooks/in/:integrationId
// Public endpoint for receiving webhooks
ingressRoutes.post('/:integrationId', async (c) => {
  const integrationId = c.req.param('integrationId');

  // Validate integration exists and is active
  const db = buildDb(c.env.DB);
  const integration = await db.query.integrations.findFirst({
    where: ({ id, isActive }, operators) =>
      operators.and(operators.eq(id, integrationId), operators.eq(isActive, true)),
  });

  if (!integration) {
    return c.json(
      { error: 'integration_not_found', message: 'Integration not found or inactive' },
      404
    );
  }

  // Extract headers and payload
  const rawHeaders = Object.fromEntries(c.req.raw.headers.entries());
  const payload = await parsePayload(c.req);

  const parsed = requestSchema.safeParse({ headers: rawHeaders, payload });
  if (!parsed.success) {
    return c.json(
      { error: 'invalid_request', message: 'Invalid payload', details: parsed.error.format() },
      400
    );
  }

  const webhookId = ulid();
  const now = new Date().toISOString();
  const payloadHash = await hashPayload(parsed.data.payload);

  // Persist to D1 with status 'pending'
  await db.insert(schema.webhooks).values({
    id: webhookId,
    integrationId,
    idempotencyKey: null,
    orderingKey: null,
    sourceIp: c.req.header('cf-connecting-ip') ?? null,
    headers: JSON.stringify(parsed.data.headers),
    payload:
      typeof parsed.data.payload === 'string'
        ? parsed.data.payload
        : JSON.stringify(parsed.data.payload ?? {}),
    payloadHash,
    payloadLocation: null,
    receivedAt: now,
    status: 'pending',
  });

  // Enqueue message to delivery queue
  await c.env.DELIVERY_QUEUE.send({ webhookId, attempt: 1 });

  return c.json({ id: webhookId, status: 'accepted' });
});
