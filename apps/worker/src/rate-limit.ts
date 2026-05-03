export async function checkRateLimit(
  db: D1Database,
  key: string,
  limit: number,
): Promise<boolean> {
  const bucket = new Date().toISOString().slice(0, 10);
  const result = await db
    .prepare(
      `INSERT INTO rate_limits (key, bucket, count, updated_at)
       VALUES (?, ?, 1, CURRENT_TIMESTAMP)
       ON CONFLICT(key, bucket) DO UPDATE SET
         count = count + 1,
         updated_at = CURRENT_TIMESTAMP
       WHERE count < ?`,
    )
    .bind(key, bucket, limit)
    .run();

  return result.meta.changes > 0;
}
