import { createRemoteJWKSet, jwtVerify } from 'jose';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '@webhook-relay/db';
import type { AppContext } from '../types';
import type { MiddlewareHandler } from 'hono';

const buildDb = (db: D1Database) => drizzle(db, { schema });

const requiredEnv = ['CLERK_JWKS_URL', 'CLERK_AUDIENCE', 'CLERK_ISSUER'] as const;

type RequiredEnv = (typeof requiredEnv)[number];

const getEnv = (bindings: AppContext['Bindings'], key: RequiredEnv): string => {
  const value = bindings[key as keyof AppContext['Bindings']];
  if (typeof value !== 'string' || !value) {
    throw new Error(`Missing required env: ${key}`);
  }
  return value;
};

export const requireAuth: MiddlewareHandler<AppContext> = async (c, next) => {
  try {
    const token = c.req.header('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return c.json({ error: 'unauthorized', message: 'Missing authorization token' }, 401);
    }

    const jwksUrl = getEnv(c.env, 'CLERK_JWKS_URL');
    const issuer = getEnv(c.env, 'CLERK_ISSUER');
    const audience = getEnv(c.env, 'CLERK_AUDIENCE');

    const JWKS = createRemoteJWKSet(new URL(jwksUrl));

    const verified = await jwtVerify(token, JWKS, {
      issuer,
      audience,
    });

    const userId = verified.payload.sub;
    if (!userId || typeof userId !== 'string') {
      return c.json({ error: 'unauthorized', message: 'Invalid token payload' }, 401);
    }

    c.set('userId', userId);

    // Ensure organization exists for this user (first sign-in provision)
    const db = buildDb(c.env.DB);
    const existingOrg = await db.query.organizations.findFirst({
      where: ({ id }, { eq: equals }) => equals(id, userId),
    });

    if (!existingOrg) {
      await db.insert(schema.organizations).values({
        id: userId,
        name: 'Default Organization',
        plan: 'free',
        settings: null,
      });
    }

    await next();
  } catch (error) {
    console.error('Auth error', error);
    return c.json({ error: 'unauthorized', message: 'Invalid or expired token' }, 401);
  }
};
