-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  settings TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Integrations
CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'generic',
  signing_secret TEXT,
  retry_policy TEXT NOT NULL,
  idempotency_key_path TEXT,
  ordering_key_path TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
CREATE INDEX IF NOT EXISTS idx_integrations_org_id ON integrations (organization_id);

-- Webhooks
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY,
  integration_id TEXT NOT NULL,
  idempotency_key TEXT,
  ordering_key TEXT,
  source_ip TEXT,
  headers TEXT NOT NULL,
  payload TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  payload_location TEXT,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'pending',
  FOREIGN KEY (integration_id) REFERENCES integrations(id)
);
CREATE INDEX IF NOT EXISTS idx_webhooks_integration_status ON webhooks (integration_id, status);
CREATE INDEX IF NOT EXISTS idx_webhooks_ordering ON webhooks (integration_id, ordering_key, received_at);
CREATE INDEX IF NOT EXISTS idx_webhooks_received ON webhooks (received_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhooks_idempotency ON webhooks (integration_id, idempotency_key);

-- Delivery Attempts
CREATE TABLE IF NOT EXISTS delivery_attempts (
  id TEXT PRIMARY KEY,
  webhook_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  FOREIGN KEY (webhook_id) REFERENCES webhooks(id)
);
CREATE INDEX IF NOT EXISTS idx_delivery_webhook ON delivery_attempts (webhook_id);
