export type AdminReport = {
  id: string;
  reviewId: string;
  reporterId: string;
  reporterName: string | null;
  reason: string;
  details: string | null;
  createdAt: string;
  itemId: string | null;
  reviewBody: string | null;
  reviewAuthorId: string | null;
  reviewAuthorName: string | null;
};

export async function listUnresolvedReports(
  db: D1Database,
): Promise<AdminReport[]> {
  const result = await db
    .prepare(
      `SELECT
         reports.id as id,
         reports.review_id as reviewId,
         reports.reporter_id as reporterId,
         reporters.public_name as reporterName,
         reports.reason as reason,
         reports.details as details,
         reports.created_at as createdAt,
         reviews.item_id as itemId,
         reviews.body as reviewBody,
         reviews.user_id as reviewAuthorId,
         authors.public_name as reviewAuthorName
       FROM reports
       LEFT JOIN users as reporters ON reporters.user_id = reports.reporter_id
       LEFT JOIN reviews ON reviews.id = reports.review_id
       LEFT JOIN users as authors ON authors.user_id = reviews.user_id
       WHERE reports.resolved_at IS NULL
       ORDER BY reports.created_at ASC
       LIMIT 500`,
    )
    .all<AdminReport>();

  return result.results;
}

export async function resolveReport(
  db: D1Database,
  reportId: string,
  moderatorUserId: string,
  resolution: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE reports
       SET resolved_at = CURRENT_TIMESTAMP,
           resolved_by = ?,
           resolution = ?
       WHERE id = ? AND resolved_at IS NULL`,
    )
    .bind(moderatorUserId, resolution, reportId)
    .run();

  return result.meta.changes > 0;
}

export async function moderatorDeleteReview(
  db: D1Database,
  reviewId: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE reviews
       SET status = 'deleted', deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'visible'`,
    )
    .bind(reviewId)
    .run();

  return result.meta.changes > 0;
}

export async function banUser(
  db: D1Database,
  userId: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE users
       SET banned_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND banned_at IS NULL AND deleted_at IS NULL`,
    )
    .bind(userId)
    .run();

  return result.meta.changes > 0;
}

export async function logModerationAction(
  db: D1Database,
  input: {
    action: 'resolve_report' | 'delete_review' | 'ban_user';
    targetType: 'report' | 'review' | 'user';
    targetId: string;
    moderatorUserId: string;
    reason: string;
    reportId?: string;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO moderation_actions (id, action, target_type, target_id, report_id, moderator_user_id, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      input.action,
      input.targetType,
      input.targetId,
      input.reportId ?? null,
      input.moderatorUserId,
      input.reason,
    )
    .run();
}
