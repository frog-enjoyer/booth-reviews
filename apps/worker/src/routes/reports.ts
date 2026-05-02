import { Hono } from 'hono';
import { validator } from 'hono/validator';

import { getBearerToken, getSessionUser } from '../auth/session';
import { fail, ok } from '../response';
import type { AppBindings } from '../types';
import { reportSchema } from '../validation/schemas';

export const reportsRoutes = new Hono<AppBindings>();

reportsRoutes.post(
  '/',
  validator('json', (value, c) => {
    const result = reportSchema.safeParse(value);
    if (!result.success) return c.json(fail('INVALID_REQUEST', result.error.message), 400);
    return result.data;
  }),
  async (c) => {
    const token = getBearerToken(c.req.header('Authorization'));
    const user = token ? await getSessionUser(c.env.DB, token) : null;
    if (!user || user.bannedAt) return c.json(fail('UNAUTHORIZED', 'Sign in is required'), 401);

    const body = c.req.valid('json');
    await c.env.DB.prepare(
      `INSERT INTO reports (id, review_id, reporter_id, reason, details)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(crypto.randomUUID(), body.reviewId, user.userId, body.reason, body.details ?? null)
      .run();

    return c.json(ok({ saved: true }));
  },
);
