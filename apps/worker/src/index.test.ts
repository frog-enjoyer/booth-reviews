import {
  REPORTS_PER_DAY_LIMIT,
  REVIEWS_PER_DAY_LIMIT,
} from '@booth-addon/shared';
import { describe, expect, it } from 'vitest';

import { createApp } from './index';
import { hashSessionToken } from './auth/session';
import type { Env } from './types';

type TestUser = {
  userId: string;
  publicName: string;
  bannedAt: string | null;
  deletedAt: string | null;
};

type TestSession = {
  tokenHash: string;
  userId: string;
  expiresAt: string;
  revokedAt: string | null;
};

type TestReview = {
  id: string;
  itemId: string;
  userId: string;
  rating: 'up' | 'down';
  body: string;
  lang: 'en' | 'ja' | 'other';
  purchaseState: 'unknown' | 'not_detected' | 'appears_purchased';
  status: 'visible' | 'pending' | 'deleted';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

type TestVote = {
  reviewId: string;
  userId: string;
  value: 1 | -1;
};

class FakeStatement {
  constructor(
    private readonly db: FakeD1Database,
    private readonly sql: string,
    private readonly values: unknown[] = [],
  ) {}

  bind(...values: unknown[]) {
    return new FakeStatement(this.db, this.sql, values);
  }

  async first<T = unknown>(): Promise<T | null> {
    return this.db.first<T>(this.sql, this.values);
  }

  async all<T = unknown>(): Promise<D1Result<T>> {
    return {
      results: this.db.all<T>(this.sql, this.values),
      success: true,
      meta: {},
    } as D1Result<T>;
  }

  async run(): Promise<D1Result> {
    return {
      results: [],
      success: true,
      meta: { changes: this.db.run(this.sql, this.values) },
    } as unknown as D1Result;
  }
}

class FakeD1Database {
  private readonly users = new Map<string, TestUser>();
  private readonly sessions = new Map<string, TestSession>();
  private readonly reviews = new Map<string, TestReview>();
  private readonly rateLimits = new Map<string, number>();
  private readonly votes: TestVote[] = [];

  prepare(sql: string): D1PreparedStatement {
    return new FakeStatement(this, sql) as unknown as D1PreparedStatement;
  }

  addUser(user: TestUser) {
    this.users.set(user.userId, user);
  }

  addSession(session: TestSession) {
    this.sessions.set(session.tokenHash, session);
  }

  first<T>(sql: string, values: unknown[]): T | null {
    if (sql.includes('FROM sessions')) {
      const tokenHash = String(values[0]);
      const session = this.sessions.get(tokenHash);
      const user = session ? this.users.get(session.userId) : undefined;
      if (
        !session ||
        !user ||
        session.revokedAt ||
        user.deletedAt ||
        session.expiresAt <= new Date().toISOString()
      )
        return null;

      return {
        userId: user.userId,
        publicName: user.publicName,
        bannedAt: user.bannedAt,
      } as T;
    }

    if (sql.includes('FROM reviews') && sql.includes('SUM(CASE WHEN rating')) {
      const viewerUserId = String(values[0]);
      const itemId = String(values[2]);
      const reviews = this.visibleReviewsForItem(itemId);
      const viewerReview = reviews.find(
        (review) => review.userId === viewerUserId,
      );

      return {
        upCount: reviews.filter((review) => review.rating === 'up').length,
        downCount: reviews.filter((review) => review.rating === 'down').length,
        viewerReviewId: viewerReview?.id ?? null,
        viewerRating: viewerReview?.rating ?? null,
      } as T;
    }

    if (
      sql.includes('SELECT id FROM reviews') &&
      sql.includes('user_id = ?') &&
      sql.includes('item_id = ?')
    ) {
      const userId = String(values[0]);
      const itemId = String(values[1]);
      const review = [...this.reviews.values()].find(
        (entry) => entry.userId === userId && entry.itemId === itemId,
      );
      return review ? ({ id: review.id } as T) : null;
    }

    return null;
  }

  all<T>(sql: string, values: unknown[]): T[] {
    if (sql.includes('GROUP BY item_id, rating')) {
      const itemIds = values.map(String);
      const rows: { item_id: string; rating: 'up' | 'down'; count: number }[] =
        [];

      for (const itemId of itemIds) {
        const reviews = this.visibleReviewsForItem(itemId);
        const upCount = reviews.filter(
          (review) => review.rating === 'up',
        ).length;
        const downCount = reviews.filter(
          (review) => review.rating === 'down',
        ).length;
        if (upCount > 0)
          rows.push({ item_id: itemId, rating: 'up', count: upCount });
        if (downCount > 0)
          rows.push({ item_id: itemId, rating: 'down', count: downCount });
      }

      return rows as T[];
    }

    if (sql.includes('JOIN users ON users.user_id = reviews.user_id')) {
      const viewerUserId = String(values[0]);
      const itemId = String(values[1]);

      return this.visibleReviewsForItem(itemId)
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .map((review) => {
          const user = this.users.get(review.userId);
          return {
            id: review.id,
            itemId: review.itemId,
            rating: review.rating,
            body: review.body,
            lang: review.lang,
            purchaseState: review.purchaseState,
            authorName: user?.publicName ?? 'Unknown reviewer',
            helpfulUp: this.votes.filter(
              (vote) => vote.reviewId === review.id && vote.value === 1,
            ).length,
            helpfulDown: this.votes.filter(
              (vote) => vote.reviewId === review.id && vote.value === -1,
            ).length,
            viewerVote:
              this.votes.find(
                (vote) =>
                  vote.reviewId === review.id && vote.userId === viewerUserId,
              )?.value ?? null,
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
          };
        }) as T[];
    }

    return [];
  }

  run(sql: string, values: unknown[]): number {
    if (sql.includes('INSERT INTO reviews')) {
      const [id, itemId, userId, rating, body, lang, purchaseState] =
        values as [
          string,
          string,
          string,
          'up' | 'down',
          string,
          'en' | 'ja' | 'other',
          'unknown' | 'not_detected' | 'appears_purchased',
        ];
      const existing = [...this.reviews.values()].find(
        (review) => review.itemId === itemId && review.userId === userId,
      );
      const now = new Date().toISOString();

      if (existing) {
        existing.rating = rating;
        existing.body = body;
        existing.lang = lang;
        existing.purchaseState = purchaseState;
        existing.status = 'visible';
        existing.updatedAt = now;
        existing.deletedAt = null;
      } else {
        this.reviews.set(id, {
          id,
          itemId,
          userId,
          rating,
          body,
          lang,
          purchaseState,
          status: 'visible',
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        });
      }

      return 1;
    }

    if (sql.includes('INSERT INTO reports')) {
      return 1;
    }

    if (sql.includes('INSERT INTO rate_limits')) {
      const [key, bucket, limit] = values as [string, string, number];
      const counterKey = `${key}:${bucket}`;
      const count = this.rateLimits.get(counterKey) ?? 0;
      if (count >= limit) return 0;

      this.rateLimits.set(counterKey, count + 1);
      return 1;
    }

    return 0;
  }

  private visibleReviewsForItem(itemId: string) {
    return [...this.reviews.values()].filter(
      (review) => review.itemId === itemId && review.status === 'visible',
    );
  }
}

const corsEnv = {
  CORS_ALLOWED_BOOTH_ORIGINS: 'https://booth.pm',
  CORS_ALLOWED_EXTENSION_ORIGINS: 'chrome-extension://abc',
} as Env;

async function createTestEnv(tokens: Record<string, TestUser>): Promise<Env> {
  const db = new FakeD1Database();
  const expiresAt = new Date(Date.now() + 60_000).toISOString();

  for (const [token, user] of Object.entries(tokens)) {
    db.addUser(user);
    db.addSession({
      tokenHash: await hashSessionToken(token),
      userId: user.userId,
      expiresAt,
      revokedAt: null,
    });
  }

  return { ...corsEnv, DB: db as unknown as D1Database };
}

function reviewer(userId: string, publicName: string): TestUser {
  return { userId, publicName, bannedAt: null, deletedAt: null };
}

function bannedUser(userId: string, publicName: string): TestUser {
  return {
    userId,
    publicName,
    bannedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
  };
}

async function postReport(
  env: Env,
  token: string,
  body: { reviewId: string; reason: string },
) {
  return createApp().request(
    '/reports',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    env,
  );
}

async function postReview(
  env: Env,
  token: string,
  body: {
    itemId: string;
    rating: 'up' | 'down';
    body: string;
    lang: 'en' | 'ja' | 'other';
  },
) {
  return createApp().request(
    '/reviews',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    env,
  );
}

describe('worker app', () => {
  it('serves health', async () => {
    const response = await createApp().request('/health', {}, corsEnv);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: { status: 'ok' },
    });
  });

  it('allows configured CORS preflight origins', async () => {
    const response = await createApp().request(
      '/health',
      { method: 'OPTIONS', headers: { Origin: 'https://booth.pm' } },
      corsEnv,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://booth.pm',
    );
  });

  it('rejects unknown CORS preflight origins', async () => {
    const response = await createApp().request(
      '/health',
      { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } },
      corsEnv,
    );

    expect(response.status).toBe(403);
  });

  it('creates reviews and returns item summary and review details', async () => {
    const env = await createTestEnv({
      token: reviewer('user-1', 'Reviewer One'),
    });

    const reviewResponse = await postReview(env, 'token', {
      itemId: 'item-1',
      rating: 'up',
      body: 'Works well with my avatar setup.',
      lang: 'en',
    });
    expect(reviewResponse.status).toBe(200);

    const summaryResponse = await createApp().request(
      '/items/item-1/summary',
      { headers: { Authorization: 'Bearer token' } },
      env,
    );
    await expect(summaryResponse.json()).resolves.toMatchObject({
      ok: true,
      data: {
        itemId: 'item-1',
        label: 'early',
        upCount: 1,
        downCount: 0,
        reviewCount: 1,
        viewerReviewId: expect.any(String),
        viewerRating: 'up',
      },
    });

    const reviewsResponse = await createApp().request(
      '/items/item-1/reviews',
      { headers: { Authorization: 'Bearer token' } },
      env,
    );
    await expect(reviewsResponse.json()).resolves.toMatchObject({
      ok: true,
      data: {
        reviews: [
          {
            itemId: 'item-1',
            rating: 'up',
            body: 'Works well with my avatar setup.',
            lang: 'en',
            purchaseState: 'unknown',
            authorName: 'Reviewer One',
            helpfulUp: 0,
            helpfulDown: 0,
          },
        ],
      },
    });
  });

  it('returns batch summaries in requested item order', async () => {
    const env = await createTestEnv({
      upToken: reviewer('user-1', 'Positive Reviewer'),
      downToken: reviewer('user-2', 'Critical Reviewer'),
    });

    await postReview(env, 'upToken', {
      itemId: 'item-a',
      rating: 'up',
      body: '',
      lang: 'en',
    });
    await postReview(env, 'downToken', {
      itemId: 'item-b',
      rating: 'down',
      body: 'The files were incomplete for my intended setup.',
      lang: 'en',
    });

    const response = await createApp().request(
      '/items/summaries',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: ['item-b', 'missing-item', 'item-a'] }),
      },
      env,
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
      data: {
        summaries: [
          {
            itemId: 'item-b',
            label: 'early',
            upCount: 0,
            downCount: 1,
            reviewCount: 1,
          },
          {
            itemId: 'missing-item',
            label: 'none',
            upCount: 0,
            downCount: 0,
            reviewCount: 0,
          },
          {
            itemId: 'item-a',
            label: 'early',
            upCount: 1,
            downCount: 0,
            reviewCount: 1,
          },
        ],
      },
    });
  });

  describe('security and abuse hardening', () => {
    it('rejects logged-out review creation', async () => {
      const env = await createTestEnv({});
      const response = await createApp().request(
        '/reviews',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: 'item-1',
            rating: 'up',
            body: '',
            lang: 'en',
          }),
        },
        env,
      );
      expect(response.status).toBe(401);
    });

    it('rejects banned user review creation', async () => {
      const env = await createTestEnv({
        token: bannedUser('banned-rv', 'Banned'),
      });
      const response = await postReview(env, 'token', {
        itemId: 'item-1',
        rating: 'up',
        body: '',
        lang: 'en',
      });
      expect(response.status).toBe(401);
    });

    it('rejects review body exceeding 2000 characters', async () => {
      const env = await createTestEnv({
        token: reviewer('user-body', 'Reviewer'),
      });
      const response = await postReview(env, 'token', {
        itemId: 'item-1',
        rating: 'up',
        body: 'a'.repeat(2001),
        lang: 'en',
      });
      expect(response.status).toBe(400);
    });

    it('rejects public name update exceeding 40 characters', async () => {
      const env = await createTestEnv({
        token: reviewer('user-name', 'Reviewer'),
      });
      const response = await createApp().request(
        '/me',
        {
          method: 'PATCH',
          headers: {
            Authorization: 'Bearer token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ publicName: 'a'.repeat(41) }),
        },
        env,
      );
      expect(response.status).toBe(400);
    });

    it('handles duplicate review submission without creating duplicates', async () => {
      const env = await createTestEnv({
        token: reviewer('user-dup', 'Reviewer'),
      });
      const review = {
        itemId: 'item-dup',
        rating: 'up' as const,
        body: '',
        lang: 'en' as const,
      };

      const first = await postReview(env, 'token', review);
      const second = await postReview(env, 'token', review);
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);

      const reviewsResponse = await createApp().request(
        '/items/item-dup/reviews',
        {},
        env,
      );
      const data = (await reviewsResponse.json()) as {
        data: { reviews: unknown[] };
      };
      expect(data.data.reviews).toHaveLength(1);
    });

    it('rejects logged-out report creation', async () => {
      const env = await createTestEnv({});
      const response = await createApp().request(
        '/reports',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewId: 'r-1', reason: 'spam' }),
        },
        env,
      );
      expect(response.status).toBe(401);
    });

    it('rejects banned user report creation', async () => {
      const env = await createTestEnv({
        token: bannedUser('banned-rp', 'Banned'),
      });
      const response = await postReport(env, 'token', {
        reviewId: 'r-1',
        reason: 'spam',
      });
      expect(response.status).toBe(401);
    });

    it('rate limits review creation per user per day', async () => {
      const env = await createTestEnv({
        token: reviewer('user-rl-rv', 'Rate Tester'),
      });
      const review = {
        itemId: 'item-rl',
        rating: 'up' as const,
        body: '',
        lang: 'en' as const,
      };

      for (let i = 0; i < REVIEWS_PER_DAY_LIMIT; i++) {
        const res = await postReview(env, 'token', {
          ...review,
          itemId: `item-rl-${i}`,
        });
        expect(res.status).toBe(200);
      }

      const updateExisting = await postReview(env, 'token', {
        ...review,
        itemId: 'item-rl-0',
        body: 'Adding text later.',
      });
      expect(updateExisting.status).toBe(200);

      const blocked = await postReview(env, 'token', {
        ...review,
        itemId: 'item-rl-over',
      });
      expect(blocked.status).toBe(429);
    });

    it('rate limits report creation per user per day', async () => {
      const env = await createTestEnv({
        token: reviewer('user-rl-rp', 'Rate Tester'),
      });

      for (let i = 0; i < REPORTS_PER_DAY_LIMIT; i++) {
        const res = await postReport(env, 'token', {
          reviewId: `r-${i}`,
          reason: 'spam',
        });
        expect(res.status).toBe(200);
      }

      const blocked = await postReport(env, 'token', {
        reviewId: 'r-over',
        reason: 'spam',
      });
      expect(blocked.status).toBe(429);
    });
  });
});
