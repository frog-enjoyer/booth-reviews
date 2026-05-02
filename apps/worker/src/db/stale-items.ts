export async function listStaleItemIds(db: D1Database, staleAfterDays = 90): Promise<string[]> {
  const result = await db
    .prepare(
      `SELECT item_id
       FROM items
       WHERE last_indexed_at < datetime('now', ?)
       ORDER BY last_indexed_at ASC`,
    )
    .bind(`-${staleAfterDays} days`)
    .all<{ item_id: string }>();

  return result.results.map((row) => row.item_id);
}
