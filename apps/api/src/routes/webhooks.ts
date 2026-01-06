import { Hono } from 'hono';
import type { AppContext } from '../types';

export const webhooksRoutes = new Hono<AppContext>();

// GET /v1/webhooks
webhooksRoutes.get('/', async (c) => {
  // TODO: Implement list webhooks
  return c.json({ webhooks: [], message: 'Not yet implemented' });
});

// GET /v1/webhooks/:id
webhooksRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  // TODO: Implement get webhook
  return c.json({ id, message: 'Not yet implemented' });
});

// POST /v1/webhooks/:id/replay
webhooksRoutes.post('/:id/replay', async (c) => {
  const id = c.req.param('id');
  // TODO: Implement replay webhook
  return c.json({ id, message: 'Not yet implemented' }, 501);
});

// GET /v1/webhooks/:id/attempts
webhooksRoutes.get('/:id/attempts', async (c) => {
  const id = c.req.param('id');
  // TODO: Implement get delivery attempts
  return c.json({ webhookId: id, attempts: [], message: 'Not yet implemented' });
});
