import { Hono } from 'hono';
import type { AppContext } from '../types';

export const ingressRoutes = new Hono<AppContext>();

// POST /v1/webhooks/in/:integrationId
// Public endpoint for receiving webhooks
ingressRoutes.post('/:integrationId', async (c) => {
  const integrationId = c.req.param('integrationId');

  // TODO: Implement webhook ingress
  // 1. Validate integration exists and is active
  // 2. Extract headers and payload
  // 3. Generate webhook ID (ULID)
  // 4. Persist to D1 with status 'pending'
  // 5. Enqueue message to delivery queue
  // 6. Return 200 OK

  return c.json({
    received: true,
    integrationId,
    message: 'Not yet implemented',
  });
});
