import { REVIEWS_PER_DAY_LIMIT } from '@booth-addon/shared';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { validator } from 'hono/validator';

import { getBearerToken, getSessionUser } from '../auth/session';
import {
  hasUserReviewForItem,
  setReviewVote,
  softDeleteReview,
  updateReview,
  upsertReview,
} from '../db/queries';
import { checkRateLimit } from '../rate-limit';
import { fail, ok } from '../response';
import type { AppBindings } from '../types';
import {
  reviewBodySchema,
  reviewUpdateSchema,
  reviewVoteSchema,
} from '../validation/schemas';

export const reviewsRoutes = new Hono<AppBindings>();

async function requireWritableUser(c: Context<AppBindings>) {
  const token = getBearerToken(c.req.header('Authorization'));
  if (!token) return null;

  const user = await getSessionUser(c.env.DB, token);
  if (!user || user.bannedAt) return null;

  return user;
}

reviewsRoutes.post(
  '/',
  validator('json', (value, c) => {
    const result = reviewBodySchema.safeParse(value);
    if (!result.success)
      return c.json(fail('INVALID_REQUEST', result.error.message), 400);
    return result.data;
  }),
  async (c) => {
    const user = await requireWritableUser(c);
    if (!user) return c.json(fail('UNAUTHORIZED', 'Sign in is required'), 401);

    const body = c.req.valid('json');
    const hasExistingReview = await hasUserReviewForItem(
      c.env.DB,
      user.userId,
      body.itemId,
    );
    if (
      !hasExistingReview &&
      !(await checkRateLimit(
        c.env.DB,
        `review:${user.userId}`,
        REVIEWS_PER_DAY_LIMIT,
      ))
    ) {
      return c.json(
        fail('RATE_LIMITED', 'Too many reviews today. Try again tomorrow.'),
        429,
      );
    }

    await upsertReview(c.env.DB, user.userId, body);

    return c.json(ok({ saved: true }));
  },
);

reviewsRoutes.patch(
  '/:reviewId',
  validator('json', (value, c) => {
    const result = reviewUpdateSchema.safeParse(value);
    if (!result.success)
      return c.json(fail('INVALID_REQUEST', result.error.message), 400);
    return result.data;
  }),
  async (c) => {
    const user = await requireWritableUser(c);
    if (!user) return c.json(fail('UNAUTHORIZED', 'Sign in is required'), 401);

    const updated = await updateReview(
      c.env.DB,
      c.req.param('reviewId'),
      user.userId,
      c.req.valid('json'),
    );
    if (!updated) return c.json(fail('NOT_FOUND', 'Review not found'), 404);

    return c.json(ok({ saved: true }));
  },
);

reviewsRoutes.delete('/:reviewId', async (c) => {
  const user = await requireWritableUser(c);
  if (!user) return c.json(fail('UNAUTHORIZED', 'Sign in is required'), 401);

  const deleted = await softDeleteReview(
    c.env.DB,
    c.req.param('reviewId'),
    user.userId,
  );
  if (!deleted) return c.json(fail('NOT_FOUND', 'Review not found'), 404);

  return c.json(ok({ deleted: true }));
});

reviewsRoutes.post(
  '/:reviewId/votes',
  validator('json', (value, c) => {
    const result = reviewVoteSchema.safeParse(value);
    if (!result.success)
      return c.json(fail('INVALID_REQUEST', result.error.message), 400);
    return result.data;
  }),
  async (c) => {
    const user = await requireWritableUser(c);
    if (!user) return c.json(fail('UNAUTHORIZED', 'Sign in is required'), 401);

    const result = await setReviewVote(
      c.env.DB,
      c.req.param('reviewId'),
      user.userId,
      c.req.valid('json').value,
    );
    if (result === 'own_review')
      return c.json(
        fail('OWN_REVIEW', 'You cannot vote on your own review'),
        400,
      );

    return c.json(ok({ saved: true }));
  },
);
