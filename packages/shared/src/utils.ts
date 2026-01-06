import type { RetryPolicy } from './schemas';

/**
 * Calculate backoff delay for a given retry attempt
 */
export function calculateBackoff(policy: RetryPolicy, attempt: number): number {
  let delay: number;

  switch (policy.backoffType) {
    case 'exponential':
      delay = policy.initialDelayMs * Math.pow(2, attempt - 1);
      break;
    case 'linear':
      delay = policy.initialDelayMs * attempt;
      break;
    case 'fixed':
      delay = policy.initialDelayMs;
      break;
    default:
      delay = policy.initialDelayMs;
  }

  // Add jitter (±30%)
  const jitter = delay * 0.3 * (Math.random() * 2 - 1);
  delay = delay + jitter;

  // Cap at max delay
  return Math.min(delay, policy.maxDelayMs);
}

/**
 * Hash a string using SHA-256
 */
export async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Extract value from object using JSONPath-like path
 * Supports simple dot notation: $.data.object.id
 */
export function extractByPath(obj: unknown, path: string): unknown {
  if (!path || typeof obj !== 'object' || obj === null) {
    return undefined;
  }

  // Remove leading $. if present
  const normalizedPath = path.startsWith('$.') ? path.slice(2) : path;
  const parts = normalizedPath.split('.');

  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Check if a status code should trigger a retry
 */
export function isRetryableStatusCode(statusCode: number): boolean {
  // 408 Request Timeout
  // 429 Too Many Requests
  // 5xx Server errors
  return statusCode === 408 || statusCode === 429 || (statusCode >= 500 && statusCode < 600);
}

/**
 * Generate a request ID
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}
