import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { and, eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import * as schema from '@webhook-relay/db';
import { CreateIntegrationSchema, UpdateIntegrationSchema } from '@webhook-relay/shared';
import type { AppContext } from '../types';

const buildDb = (db: D1Database) => drizzle(db, { schema });

const defaultRetryPolicy = {
  maxAttempts: 5,
  backoffType: 'exponential' as const,
  initialDelayMs: 1000,
  maxDelayMs: 16000,
};

const toDto = (integration: schema.Integration) => ({
  ...integration,
  retryPolicy: JSON.parse(integration.retryPolicy),
  signingSecret: integration.signingSecret ?? null,
  idempotencyKeyPath: integration.idempotencyKeyPath ?? null,
  orderingKeyPath: integration.orderingKeyPath ?? null,
});

export const integrationsRoutes = new Hono<AppContext>();

const getUserId = (c: import('hono').Context<AppContext>) => c.get('userId');

// GET /v1/integrations
integrationsRoutes.get('/', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ error: 'unauthorized', message: 'Unauthorized' }, 401);
  const db = buildDb(c.env.DB);

  const results = await db
    .select()
    .from(schema.integrations)
    .where(eq(schema.integrations.organizationId, userId))
    .orderBy(schema.integrations.createdAt);

  return c.json({ data: results.map(toDto) });
});

// POST /v1/integrations
integrationsRoutes.post('/', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ error: 'unauthorized', message: 'Unauthorized' }, 401);
  const db = buildDb(c.env.DB);
  const body = await c.req.json().catch(() => ({}));
  const parsed = CreateIntegrationSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: 'validation_error', message: 'Invalid integration', details: parsed.error.format() },
      400
    );
  }

  const id = ulid();
  const now = new Date().toISOString();
  const retryPolicy = parsed.data.retryPolicy ?? defaultRetryPolicy;

  await db.insert(schema.integrations).values({
    id,
    organizationId: userId,
    name: parsed.data.name,
    targetUrl: parsed.data.targetUrl,
    sourceType: parsed.data.sourceType ?? 'generic',
    signingSecret: parsed.data.signingSecret ?? null,
    retryPolicy: JSON.stringify(retryPolicy),
    idempotencyKeyPath: parsed.data.idempotencyKeyPath ?? null,
    orderingKeyPath: parsed.data.orderingKeyPath ?? null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  const created = await db.query.integrations.findFirst({
    where: and(eq(schema.integrations.id, id), eq(schema.integrations.organizationId, userId)),
  });

  return c.json({ data: created ? toDto(created) : null }, 201);
});

// GET /v1/integrations/:id
integrationsRoutes.get('/:id', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ error: 'unauthorized', message: 'Unauthorized' }, 401);
  const db = buildDb(c.env.DB);
  const id = c.req.param('id');

  const integration = await db.query.integrations.findFirst({
    where: and(eq(schema.integrations.id, id), eq(schema.integrations.organizationId, userId)),
  });

  if (!integration) {
    return c.json({ error: 'not_found', message: 'Integration not found' }, 404);
  }

  return c.json({ data: toDto(integration) });
});

// PATCH /v1/integrations/:id
integrationsRoutes.patch('/:id', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ error: 'unauthorized', message: 'Unauthorized' }, 401);
  const db = buildDb(c.env.DB);
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const parsed = UpdateIntegrationSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      {
        error: 'validation_error',
        message: 'Invalid integration update',
        details: parsed.error.format(),
      },
      400
    );
  }

  const existing = await db.query.integrations.findFirst({
    where: and(eq(schema.integrations.id, id), eq(schema.integrations.organizationId, userId)),
  });

  if (!existing) {
    return c.json({ error: 'not_found', message: 'Integration not found' }, 404);
  }

  const retryPolicy = parsed.data.retryPolicy
    ? JSON.stringify(parsed.data.retryPolicy)
    : existing.retryPolicy;

  await db
    .update(schema.integrations)
    .set({
      name: parsed.data.name ?? existing.name,
      targetUrl: parsed.data.targetUrl ?? existing.targetUrl,
      sourceType: parsed.data.sourceType ?? existing.sourceType,
      signingSecret: parsed.data.signingSecret ?? existing.signingSecret,
      retryPolicy,
      idempotencyKeyPath: parsed.data.idempotencyKeyPath ?? existing.idempotencyKeyPath,
      orderingKeyPath: parsed.data.orderingKeyPath ?? existing.orderingKeyPath,
      isActive: parsed.data.isActive ?? existing.isActive,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(schema.integrations.id, id), eq(schema.integrations.organizationId, userId)));

  const updated = await db.query.integrations.findFirst({
    where: and(eq(schema.integrations.id, id), eq(schema.integrations.organizationId, userId)),
  });

  return c.json({ data: updated ? toDto(updated) : null });
});

// DELETE /v1/integrations/:id
integrationsRoutes.delete('/:id', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ error: 'unauthorized', message: 'Unauthorized' }, 401);
  const db = buildDb(c.env.DB);
  const id = c.req.param('id');

  const existing = await db.query.integrations.findFirst({
    where: and(eq(schema.integrations.id, id), eq(schema.integrations.organizationId, userId)),
  });

  if (!existing) {
    return c.json({ error: 'not_found', message: 'Integration not found' }, 404);
  }

  await db
    .delete(schema.integrations)
    .where(and(eq(schema.integrations.id, id), eq(schema.integrations.organizationId, userId)));

  return c.json({ success: true });
});
