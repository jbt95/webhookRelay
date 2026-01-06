// Default retry policy
export const DEFAULT_RETRY_POLICY = {
  maxAttempts: 5,
  backoffType: 'exponential' as const,
  initialDelayMs: 1000,
  maxDelayMs: 3600000, // 1 hour
};

// HTTP status codes that should trigger a retry
export const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// HTTP status codes that indicate permanent failure (no retry)
export const PERMANENT_FAILURE_STATUS_CODES = [400, 401, 403, 404, 405, 410, 422];

// Maximum payload size (5MB)
export const MAX_PAYLOAD_SIZE_BYTES = 5 * 1024 * 1024;

// Payload size threshold for R2 storage (100KB)
export const R2_THRESHOLD_BYTES = 100 * 1024;

// Default timeout for webhook delivery (30 seconds)
export const DEFAULT_DELIVERY_TIMEOUT_MS = 30000;

// Deduplication window (24 hours)
export const DEFAULT_DEDUPLICATION_WINDOW_MS = 24 * 60 * 60 * 1000;
