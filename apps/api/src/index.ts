import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { ingressRoutes } from './routes/ingress';
import { integrationsRoutes } from './routes/integrations';
import { webhooksRoutes } from './routes/webhooks';
import { healthRoutes } from './routes/health';
import { requireAuth } from './middleware/auth';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', secureHeaders());
app.use(
  '*',
  cors({
    origin: (origin) => origin, // TODO: Configure allowed origins
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['X-Request-Id'],
    maxAge: 86400,
    credentials: true,
  })
);

// Health check
app.route('/health', healthRoutes);

// Public webhook ingress endpoint
app.route('/v1/webhooks/in', ingressRoutes);

// API routes (authenticated)
app.use('/v1/*', requireAuth);
app.route('/v1/integrations', integrationsRoutes);
app.route('/v1/webhooks', webhooksRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', message: 'The requested resource was not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: c.env.ENVIRONMENT === 'development' ? err.message : 'An unexpected error occurred',
    },
    500
  );
});

export default app;

// Queue consumer handler
export { deliveryConsumer } from './services/delivery-consumer';
