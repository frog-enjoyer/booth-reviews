import type { MiddlewareHandler } from 'hono';

import type { AppBindings } from '../types';

const DEFAULT_BOOTH_ORIGINS = ['https://booth.pm'];

function splitOrigins(value: string | undefined): string[] {
  return value
    ? value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];
}

function isAllowedOrigin(origin: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.includes(origin);
}

export const corsMiddleware: MiddlewareHandler<AppBindings> = async (c, next) => {
  const origin = c.req.header('Origin');
  const allowedOrigins = [
    ...DEFAULT_BOOTH_ORIGINS,
    ...splitOrigins(c.env.CORS_ALLOWED_BOOTH_ORIGINS),
    ...splitOrigins(c.env.CORS_ALLOWED_EXTENSION_ORIGINS),
  ];

  if (origin && isAllowedOrigin(origin, allowedOrigins)) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Vary', 'Origin');
    c.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    c.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  }

  if (c.req.method === 'OPTIONS') {
    return origin && isAllowedOrigin(origin, allowedOrigins)
      ? c.body(null, 204)
      : c.json({ ok: false, error: { code: 'CORS_DENIED', message: 'Origin is not allowed' } }, 403);
  }

  await next();
};
