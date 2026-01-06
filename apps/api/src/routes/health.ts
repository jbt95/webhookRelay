import { Hono } from 'hono';
import type { AppContext } from '../types';

export const healthRoutes = new Hono<AppContext>();

healthRoutes.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
  });
});

healthRoutes.get('/ready', async (c) => {
  try {
    // Check D1 connection
    await c.env.DB.prepare('SELECT 1').first();

    return c.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
      },
    });
  } catch (error) {
    return c.json(
      {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'failed',
        },
      },
      503
    );
  }
});
