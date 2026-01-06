import { drizzle } from 'drizzle-orm/d1';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '@webhook-relay/db';
import { eq } from 'drizzle-orm';
import type { Env, DeliveryMessage } from '../types';

const buildDb = (db: D1Database): DrizzleD1Database<typeof schema> => drizzle(db, { schema });

const forwardWebhook = async (
  targetUrl: string,
  payload: string,
  headers: Record<string, string>
): Promise<Response> => {
  return fetch(targetUrl, {
    method: 'POST',
    headers,
    body: payload,
  });
};

export const deliveryConsumer = {
  async queue(batch: MessageBatch<DeliveryMessage>, env: Env): Promise<void> {
    const db = buildDb(env.DB);

    for (const message of batch.messages) {
      const { webhookId, attempt } = message.body;

      try {
        console.log(`Processing webhook ${webhookId}, attempt ${attempt}`);

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
          message.ack();
          continue;
        }

        const parsedHeaders: Record<string, string> = (() => {
          try {
            const value = webhook.headers ? JSON.parse(webhook.headers) : {};
            return typeof value === 'object' && value !== null
              ? (value as Record<string, string>)
              : {};
          } catch (error) {
            console.warn('Failed to parse headers JSON, defaulting to empty object', error);
            return {};
          }
        })();

        const response = await forwardWebhook(
          integration.targetUrl,
          webhook.payload,
          parsedHeaders
        );
        const responseBody = await response.text();

        await db.insert(schema.deliveryAttempts).values({
          id: crypto.randomUUID(),
          webhookId,
          attemptNumber: attempt,
          startedAt: webhook.receivedAt,
          completedAt: new Date().toISOString(),
          statusCode: response.status,
          responseBody,
          errorMessage: response.ok ? null : response.statusText,
          durationMs: null,
        });

        if (response.ok) {
          await db
            .update(schema.webhooks)
            .set({ status: 'delivered' })
            .where(eq(schema.webhooks.id, webhookId));
          message.ack();
        } else {
          await db
            .update(schema.webhooks)
            .set({ status: 'failed' })
            .where(eq(schema.webhooks.id, webhookId));
          message.retry();
        }
      } catch (error) {
        console.error(`Failed to process webhook ${webhookId}:`, error);
        message.retry();
      }
    }
  },
};
