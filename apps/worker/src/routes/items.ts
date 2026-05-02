import { Hono } from 'hono';
import { validator } from 'hono/validator';

import { getBatchSummaries, getItemReviews, getItemSummary, upsertSeenItem } from '../db/queries';
import { getBearerToken, getSessionUser } from '../auth/session';
import { ok } from '../response';
import type { AppBindings } from '../types';
import { batchSummarySchema, itemSeenSchema } from '../validation/schemas';

export const itemsRoutes = new Hono<AppBindings>();

itemsRoutes.get('/:itemId/summary', async (c) => {
  const itemId = c.req.param('itemId');
  const summary = await getItemSummary(c.env.DB, itemId);
  return c.json(ok(summary));
});

itemsRoutes.get('/:itemId/reviews', async (c) => {
  const itemId = c.req.param('itemId');
  const token = getBearerToken(c.req.header('Authorization'));
  const user = token ? await getSessionUser(c.env.DB, token) : null;
  const reviews = await getItemReviews(c.env.DB, itemId, user?.userId);
  return c.json(ok({ reviews }));
});

itemsRoutes.post(
  '/summaries',
  validator('json', (value, c) => {
    const result = batchSummarySchema.safeParse(value);
    if (!result.success) return c.json({ ok: false, error: { code: 'INVALID_REQUEST', message: result.error.message } }, 400);
    return result.data;
  }),
  async (c) => {
    const body = c.req.valid('json');
    const summaries = await getBatchSummaries(c.env.DB, body.itemIds);
    return c.json(ok({ summaries }));
  },
);

itemsRoutes.post(
  '/seen',
  validator('json', (value, c) => {
    const result = itemSeenSchema.safeParse(value);
    if (!result.success) return c.json({ ok: false, error: { code: 'INVALID_REQUEST', message: result.error.message } }, 400);
    return result.data;
  }),
  async (c) => {
    await upsertSeenItem(c.env.DB, c.req.valid('json'));
    return c.json(ok({ saved: true }));
  },
);
