export interface Env {
  // Environment
  ENVIRONMENT: 'development' | 'production';

  // D1 Database
  DB: D1Database;

  // Queues
  DELIVERY_QUEUE: Queue<DeliveryMessage>;

  // R2 Bucket
  PAYLOADS: R2Bucket;

  // KV Namespace
  CACHE: KVNamespace;

  // Auth
  CLERK_ISSUER: string;
  CLERK_AUDIENCE: string;
  CLERK_JWKS_URL: string;
}

export interface DeliveryMessage {
  webhookId: string;
  attempt: number;
}

export interface Variables {
  requestId: string;
  organizationId?: string;
  userId?: string;
}

export type AppContext = {
  Bindings: Env;
  Variables: Variables;
};
