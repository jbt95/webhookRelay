import { z } from 'zod';

// Webhook status enum
export const WebhookStatus = z.enum(['pending', 'delivered', 'failed', 'replayed']);
export type WebhookStatus = z.infer<typeof WebhookStatus>;

// Source type enum
export const SourceType = z.enum(['stripe', 'github', 'shopify', 'generic']);
export type SourceType = z.infer<typeof SourceType>;

// Retry policy schema
export const RetryPolicySchema = z.object({
  maxAttempts: z.number().int().min(1).max(10).default(5),
  backoffType: z.enum(['exponential', 'linear', 'fixed']).default('exponential'),
  initialDelayMs: z.number().int().min(100).max(60000).default(1000),
  maxDelayMs: z.number().int().min(1000).max(3600000).default(3600000),
});
export type RetryPolicy = z.infer<typeof RetryPolicySchema>;

// Integration schemas
export const CreateIntegrationSchema = z.object({
  name: z.string().min(1).max(100),
  targetUrl: z.string().url(),
  sourceType: SourceType.optional().default('generic'),
  signingSecret: z.string().optional(),
  retryPolicy: RetryPolicySchema.optional(),
  idempotencyKeyPath: z.string().optional(),
  orderingKeyPath: z.string().optional(),
});
export type CreateIntegration = z.infer<typeof CreateIntegrationSchema>;

export const UpdateIntegrationSchema = CreateIntegrationSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateIntegration = z.infer<typeof UpdateIntegrationSchema>;

// Integration entity
export const IntegrationSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  targetUrl: z.string(),
  sourceType: SourceType,
  signingSecret: z.string().nullable(),
  retryPolicy: RetryPolicySchema,
  idempotencyKeyPath: z.string().nullable(),
  orderingKeyPath: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Integration = z.infer<typeof IntegrationSchema>;

// Webhook entity
export const WebhookSchema = z.object({
  id: z.string(),
  integrationId: z.string(),
  idempotencyKey: z.string().nullable(),
  orderingKey: z.string().nullable(),
  sourceIp: z.string().nullable(),
  headers: z.record(z.string()),
  payload: z.unknown(),
  payloadHash: z.string(),
  receivedAt: z.string(),
  status: WebhookStatus,
});
export type Webhook = z.infer<typeof WebhookSchema>;

// Delivery attempt entity
export const DeliveryAttemptSchema = z.object({
  id: z.string(),
  webhookId: z.string(),
  attemptNumber: z.number(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  statusCode: z.number().nullable(),
  responseBody: z.string().nullable(),
  errorMessage: z.string().nullable(),
  durationMs: z.number().nullable(),
});
export type DeliveryAttempt = z.infer<typeof DeliveryAttemptSchema>;

// API response schemas
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      total: z.number(),
      page: z.number(),
      pageSize: z.number(),
      totalPages: z.number(),
    }),
  });

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
