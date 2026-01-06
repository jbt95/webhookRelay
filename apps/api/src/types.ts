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
