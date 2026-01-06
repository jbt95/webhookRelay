import { drizzle } from 'drizzle-orm/d1';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '@webhook-relay/db';
import { eq } from 'drizzle-orm';
import type { Env, DeliveryMessage } from '../types';

const buildDb = (db: D1Database): DrizzleD1Database<typeof schema> => drizzle(db, { schema });

const parseHeaders = (raw: string | null): Record<string, string> => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, string>) : {};
  } catch (error) {
    console.warn('Failed to parse headers JSON, defaulting to empty object', error);
    return {};
  }
};

const forwardWithTimeout = async (
  targetUrl: string,
  payload: string,
  headers: Record<string, string>,
  timeoutMs = 30_000
): Promise<{ response: Response | null; error: Error | null; timedOut: boolean }> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: payload,
      signal: controller.signal,
    });
    return { response, error: null, timedOut: false };
  } catch (error) {
    const timedOut = controller.signal.aborted;
    return { response: null, error: error as Error, timedOut };
  } finally {
    clearTimeout(timer);
  }
};

const classifyOutcome = (args: {
  response: Response | null;
  error: Error | null;
  timedOut: boolean;
}): {
  status: 'delivered' | 'failed' | 'retryable';
  errorMessage: string | null;
  statusCode: number | null;
} => {
  const { response, error, timedOut } = args;

  if (timedOut) {
    return { status: 'retryable', errorMessage: 'timeout', statusCode: null };
  }

  if (error) {
    return { status: 'retryable', errorMessage: error.message, statusCode: null };
  }

  if (!response) {
    return { status: 'retryable', errorMessage: 'unknown_error', statusCode: null };
  }

  if (response.ok) {
    return { status: 'delivered', errorMessage: null, statusCode: response.status };
  }

  if (response.status >= 500) {
    return { status: 'retryable', errorMessage: response.statusText, statusCode: response.status };
  }

  if (response.status >= 400) {
    return { status: 'failed', errorMessage: response.statusText, statusCode: response.status };
  }

  return { status: 'retryable', errorMessage: 'unexpected_status', statusCode: response.status };
};

export const deliveryConsumer = {
  async queue(batch: MessageBatch<DeliveryMessage>, env: Env): Promise<void> {
    const db = buildDb(env.DB);

    for (const message of batch.messages) {
      const { webhookId, attempt } = message.body;

      try {
        const webhook = await db.query.webhooks.findFirst({
          where: ({ id }, operators) => operators.eq(id, webhookId),
        });

        if (!webhook) {
          console.warn(`Webhook ${webhookId} not found`);
          message.ack();
          continue;
        }

        const integration = await db.query.integrations.findFirst({
          where: ({ id }, operators) => operators.eq(id, webhook.integrationId),
        });

        if (!integration || !integration.isActive) {
          console.warn(`Integration ${webhook.integrationId} not found or inactive`);
          await db
            .update(schema.webhooks)
            .set({ status: 'failed' })
            .where(eq(schema.webhooks.id, webhookId));
          message.ack();
          continue;
        }

        const headers = parseHeaders(webhook.headers);
        const start = Date.now();

        const { response, error, timedOut } = await forwardWithTimeout(
          integration.targetUrl,
          webhook.payload,
          headers
        );

        const durationMs = Date.now() - start;
        const responseBody = response ? await response.text() : null;

        const outcome = classifyOutcome({ response, error, timedOut });

        await db.insert(schema.deliveryAttempts).values({
          id: crypto.randomUUID(),
          webhookId,
          attemptNumber: attempt,
          startedAt: new Date(start).toISOString(),
          completedAt: new Date().toISOString(),
          statusCode: outcome.statusCode,
          responseBody,
          errorMessage: outcome.errorMessage,
          durationMs,
        });

        if (outcome.status === 'delivered') {
          await db
            .update(schema.webhooks)
            .set({ status: 'delivered' })
            .where(eq(schema.webhooks.id, webhookId));
          message.ack();
          continue;
        }

        if (outcome.status === 'failed') {
          await db
            .update(schema.webhooks)
            .set({ status: 'failed' })
            .where(eq(schema.webhooks.id, webhookId));
          message.ack();
          continue;
        }

        // Retryable path
        await db
          .update(schema.webhooks)
          .set({ status: 'pending' })
          .where(eq(schema.webhooks.id, webhookId));
        message.retry();
      } catch (error) {
        console.error(`Failed to process webhook ${webhookId}:`, error);
        await db
          .update(schema.webhooks)
          .set({ status: 'pending' })
          .where(eq(schema.webhooks.id, webhookId));
        message.retry();
      }
    }
  },
};
