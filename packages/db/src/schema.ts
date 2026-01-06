import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Organizations table
export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  plan: text('plan').notNull().default('free'),
  settings: text('settings'), // JSON
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
});

// Integrations table
export const integrations = sqliteTable(
  'integrations',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    targetUrl: text('target_url').notNull(),
    sourceType: text('source_type').notNull().default('generic'),
    signingSecret: text('signing_secret'),
    retryPolicy: text('retry_policy').notNull(), // JSON
    idempotencyKeyPath: text('idempotency_key_path'),
    orderingKeyPath: text('ordering_key_path'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    orgIdIdx: index('idx_integrations_org_id').on(table.organizationId),
  })
);

// Webhooks table
export const webhooks = sqliteTable(
  'webhooks',
  {
    id: text('id').primaryKey(),
    integrationId: text('integration_id')
      .notNull()
      .references(() => integrations.id),
    idempotencyKey: text('idempotency_key'),
    orderingKey: text('ordering_key'),
    sourceIp: text('source_ip'),
    headers: text('headers').notNull(), // JSON
    payload: text('payload').notNull(), // JSON or raw string
    payloadHash: text('payload_hash').notNull(),
    payloadLocation: text('payload_location'), // R2 key if stored externally
    receivedAt: text('received_at')
      .notNull()
      .default(sql`(datetime('now'))`),
    status: text('status').notNull().default('pending'),
  },
  (table) => ({
    integrationStatusIdx: index('idx_webhooks_integration_status').on(
      table.integrationId,
      table.status
    ),
    orderingIdx: index('idx_webhooks_ordering').on(
      table.integrationId,
      table.orderingKey,
      table.receivedAt
    ),
    receivedAtIdx: index('idx_webhooks_received').on(table.receivedAt),
    idempotencyIdx: uniqueIndex('idx_webhooks_idempotency').on(
      table.integrationId,
      table.idempotencyKey
    ),
  })
);

// Delivery attempts table
export const deliveryAttempts = sqliteTable(
  'delivery_attempts',
  {
    id: text('id').primaryKey(),
    webhookId: text('webhook_id')
      .notNull()
      .references(() => webhooks.id),
    attemptNumber: integer('attempt_number').notNull(),
    startedAt: text('started_at').notNull(),
    completedAt: text('completed_at'),
    statusCode: integer('status_code'),
    responseBody: text('response_body'),
    errorMessage: text('error_message'),
    durationMs: integer('duration_ms'),
  },
  (table) => ({
    webhookIdIdx: index('idx_delivery_webhook').on(table.webhookId),
  })
);

// Type exports
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;

export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;

export type DeliveryAttempt = typeof deliveryAttempts.$inferSelect;
export type NewDeliveryAttempt = typeof deliveryAttempts.$inferInsert;
