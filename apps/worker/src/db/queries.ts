import { createItemSummary, type ItemSummary, type Review, type ReviewInput, type ReviewUpdateInput } from '@booth-addon/shared';

type ReviewRow = {
  id: string;
  itemId: string;
  rating: 'up' | 'down';
  body: string;
  lang: 'en' | 'ja' | 'other';
  purchaseState: 'unknown' | 'not_detected' | 'appears_purchased';
  authorName: string;
  helpfulUp: number;
  helpfulDown: number;
  viewerVote: 1 | -1 | null;
  createdAt: string;
  updatedAt: string;
};

export async function upsertSeenItem(db: D1Database, input: {
  itemId: string;
  boothUrl: string;
  canonicalUrl: string;
  creator?: {
    creatorId: string;
    boothShopUrl: string;
    displayName?: string;
  };
  unavailable?: boolean;
}): Promise<void> {
  if (input.creator) {
    await db
      .prepare(
        `INSERT INTO creators (creator_id, booth_shop_url, display_name, last_seen_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(creator_id) DO UPDATE SET
           booth_shop_url = excluded.booth_shop_url,
           display_name = excluded.display_name,
           last_seen_at = CURRENT_TIMESTAMP`,
      )
      .bind(input.creator.creatorId, input.creator.boothShopUrl, input.creator.displayName ?? null)
      .run();
  }

  await db
    .prepare(
      `INSERT INTO items (item_id, booth_url, canonical_url, creator_id, unavailable_at, last_indexed_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(item_id) DO UPDATE SET
         booth_url = excluded.booth_url,
         canonical_url = excluded.canonical_url,
         creator_id = excluded.creator_id,
         unavailable_at = COALESCE(excluded.unavailable_at, items.unavailable_at),
         last_indexed_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      input.itemId,
      input.boothUrl,
      input.canonicalUrl,
      input.creator?.creatorId ?? null,
      input.unavailable ? new Date().toISOString() : null,
    )
    .run();
}

export async function getItemSummary(db: D1Database, itemId: string, viewerUserId?: string): Promise<ItemSummary> {
  const row = await db
    .prepare(
      `SELECT
         SUM(CASE WHEN rating = 'up' THEN 1 ELSE 0 END) as upCount,
         SUM(CASE WHEN rating = 'down' THEN 1 ELSE 0 END) as downCount,
         MAX(CASE WHEN user_id = ? THEN id ELSE NULL END) as viewerReviewId,
         MAX(CASE WHEN user_id = ? THEN rating ELSE NULL END) as viewerRating
       FROM reviews
       WHERE item_id = ? AND status = 'visible'`,
    )
    .bind(viewerUserId ?? '', viewerUserId ?? '', itemId)
    .first<{ upCount: number; downCount: number; viewerReviewId: string | null; viewerRating: 'up' | 'down' | null }>();

  return createItemSummary({
    itemId,
    upCount: row?.upCount ?? 0,
    downCount: row?.downCount ?? 0,
    viewerReviewId: row?.viewerReviewId ?? undefined,
    viewerRating: row?.viewerRating ?? undefined,
  });
}

export async function getBatchSummaries(db: D1Database, itemIds: string[]): Promise<ItemSummary[]> {
  if (itemIds.length === 0) return [];

  const placeholders = itemIds.map(() => '?').join(', ');
  const result = await db
    .prepare(
      `SELECT item_id, rating, COUNT(*) as count
       FROM reviews
       WHERE item_id IN (${placeholders}) AND status = 'visible'
       GROUP BY item_id, rating`,
    )
    .bind(...itemIds)
    .all<{ item_id: string; rating: 'up' | 'down'; count: number }>();

  const countMap = new Map<string, { up: number; down: number }>();
  for (const row of result.results) {
    const entry = countMap.get(row.item_id) ?? { up: 0, down: 0 };
    if (row.rating === 'up') entry.up = row.count;
    else entry.down = row.count;
    countMap.set(row.item_id, entry);
  }

  return itemIds.map((itemId) => {
    const counts = countMap.get(itemId) ?? { up: 0, down: 0 };
    return createItemSummary({ itemId, upCount: counts.up, downCount: counts.down });
  });
}

export async function getItemReviews(db: D1Database, itemId: string, viewerUserId?: string): Promise<Review[]> {
  const result = await db
    .prepare(
      `SELECT
         reviews.id as id,
         reviews.item_id as itemId,
         reviews.rating as rating,
         reviews.body as body,
         reviews.lang as lang,
         reviews.purchase_state as purchaseState,
         users.public_name as authorName,
         COALESCE(SUM(CASE WHEN review_votes.value = 1 THEN 1 ELSE 0 END), 0) as helpfulUp,
         COALESCE(SUM(CASE WHEN review_votes.value = -1 THEN 1 ELSE 0 END), 0) as helpfulDown,
         viewer_votes.value as viewerVote,
         reviews.created_at as createdAt,
         reviews.updated_at as updatedAt
       FROM reviews
       JOIN users ON users.user_id = reviews.user_id
       LEFT JOIN review_votes ON review_votes.review_id = reviews.id
       LEFT JOIN review_votes as viewer_votes
         ON viewer_votes.review_id = reviews.id AND viewer_votes.user_id = ?
       WHERE reviews.item_id = ? AND reviews.status = 'visible'
       GROUP BY reviews.id
       ORDER BY reviews.updated_at DESC`,
    )
    .bind(viewerUserId ?? '', itemId)
    .all<ReviewRow>();

  return result.results.map((row) => ({
    id: row.id,
    itemId: row.itemId,
    rating: row.rating,
    body: row.body,
    lang: row.lang,
    purchaseState: row.purchaseState,
    authorName: row.authorName,
    helpfulUp: row.helpfulUp,
    helpfulDown: row.helpfulDown,
    viewerVote: row.viewerVote ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function upsertReview(db: D1Database, userId: string, input: ReviewInput): Promise<void> {
  await db
    .prepare(
      `INSERT INTO reviews (id, item_id, user_id, rating, body, lang, purchase_state, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'visible', CURRENT_TIMESTAMP)
       ON CONFLICT(item_id, user_id) DO UPDATE SET
         rating = excluded.rating,
         body = excluded.body,
         lang = excluded.lang,
         purchase_state = excluded.purchase_state,
         status = 'visible',
         updated_at = CURRENT_TIMESTAMP,
         deleted_at = NULL`,
    )
    .bind(crypto.randomUUID(), input.itemId, userId, input.rating, input.body, input.lang, input.purchaseState ?? 'unknown')
    .run();
}

export async function updateReview(db: D1Database, reviewId: string, userId: string, input: ReviewUpdateInput): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE reviews
       SET rating = ?, body = ?, lang = ?, purchase_state = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ? AND status = 'visible'`,
    )
    .bind(input.rating, input.body, input.lang, input.purchaseState ?? 'unknown', reviewId, userId)
    .run();

  return result.meta.changes > 0;
}

export async function softDeleteReview(db: D1Database, reviewId: string, userId: string): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE reviews
       SET status = 'deleted', deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ? AND status = 'visible'`,
    )
    .bind(reviewId, userId)
    .run();

  return result.meta.changes > 0;
}

export async function setReviewVote(db: D1Database, reviewId: string, userId: string, value: 1 | -1): Promise<'saved' | 'own_review'> {
  const ownReview = await db
    .prepare('SELECT id FROM reviews WHERE id = ? AND user_id = ?')
    .bind(reviewId, userId)
    .first<{ id: string }>();

  if (ownReview) return 'own_review';

  await db
    .prepare(
      `INSERT INTO review_votes (review_id, user_id, value, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(review_id, user_id) DO UPDATE SET
         value = excluded.value,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(reviewId, userId, value)
    .run();

  return 'saved';
}
