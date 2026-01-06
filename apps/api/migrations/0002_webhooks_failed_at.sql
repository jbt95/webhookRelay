ALTER TABLE webhooks ADD COLUMN failed_at TEXT;
CREATE INDEX IF NOT EXISTS idx_webhooks_failed_at ON webhooks (failed_at);
