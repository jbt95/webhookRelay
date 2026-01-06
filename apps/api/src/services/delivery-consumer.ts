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

const exponentialBackoff = (attempt: number, initialMs: number, maxMs: number): number => {
  const delay = Math.min(initialMs * 2 ** Math.max(attempt - 1, 0), maxMs);
  return delay;
};

const applyJitter = (delayMs: number, jitterRatio = 0.3): number => {
  const jitter = delayMs * jitterRatio;
  const min = delayMs - jitter;
  const max = delayMs + jitter;
  return Math.max(0, min + Math.random() * (max - min));
};

const nextDelayMs = (attempt: number, retryPolicyJson: string | null): number => {
  if (!retryPolicyJson) return applyJitter(exponentialBackoff(attempt, 1000, 16000));
  try {
    const policy = JSON.parse(retryPolicyJson) as {
      maxAttempts?: number;
      initialDelayMs?: number;
      maxDelayMs?: number;
    };
    const initial = policy.initialDelayMs ?? 1000;
    const max = policy.maxDelayMs ?? 16000;
    return applyJitter(exponentialBackoff(attempt, initial, max));
  } catch (error) {
    console.warn('Failed to parse retry policy, using defaults', error);
    return applyJitter(exponentialBackoff(attempt, 1000, 16000));
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
          const failureTimestamp = new Date().toISOString();
          await db
            .update(schema.webhooks)
            .set({ status: 'failed', failedAt: failureTimestamp })
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

        const policy = (() => {
          try {
            return JSON.parse(integration.retryPolicy) as {
              maxAttempts?: number;
              initialDelayMs?: number;
              maxDelayMs?: number;
            };
          } catch {
            return {} as Record<string, never>;
          }
        })();

        const maxAttempts = policy.maxAttempts ?? 5;
        const delayMs = nextDelayMs(attempt + 1, integration.retryPolicy);
        const canRetry = outcome.status === 'retryable' && attempt < maxAttempts;
        const failedAt =
          !canRetry && outcome.status !== 'delivered' ? new Date().toISOString() : undefined;

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

        if (!canRetry) {
          await db
            .update(schema.webhooks)
            .set({ status: 'failed', failedAt: new Date().toISOString() })
            .where(eq(schema.webhooks.id, webhookId));
          console.warn(
            `Webhook ${webhookId} failed after ${attempt} attempts`,
            outcome.errorMessage ?? 'max attempts reached'
          );
          message.ack();
          continue;
        }

        await db
          .update(schema.webhooks)
          .set({ status: 'pending' })
          .where(eq(schema.webhooks.id, webhookId));

        await message.retry({ delaySeconds: Math.ceil(delayMs / 1000) });
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
