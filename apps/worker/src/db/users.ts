import type { Me } from '@booth-addon/shared';

import type { DiscordUser } from '../auth/discord';

type UserRow = {
  userId: string;
  publicName: string;
  bannedAt: string | null;
};

function defaultPublicName(discordId: string): string {
  return `Reviewer ${discordId.slice(-4).padStart(4, '0')}`;
}

export async function upsertDiscordUser(db: D1Database, discordUser: DiscordUser): Promise<Me> {
  const userId = crypto.randomUUID();
  const publicName = defaultPublicName(discordUser.id);

  await db
    .prepare(
      `INSERT INTO users (user_id, discord_id, public_name)
       VALUES (?, ?, ?)
       ON CONFLICT(discord_id) DO NOTHING`,
    )
    .bind(userId, discordUser.id, publicName)
    .run();

  const row = await db
    .prepare(
      `SELECT user_id as userId, public_name as publicName, banned_at as bannedAt
       FROM users
       WHERE discord_id = ? AND deleted_at IS NULL`,
    )
    .bind(discordUser.id)
    .first<UserRow>();

  if (!row) throw new Error('User upsert failed');

  return { userId: row.userId, publicName: row.publicName, banned: Boolean(row.bannedAt) };
}

export async function getMe(db: D1Database, userId: string): Promise<Me | null> {
  const row = await db
    .prepare(
      `SELECT user_id as userId, public_name as publicName, banned_at as bannedAt
       FROM users
       WHERE user_id = ? AND deleted_at IS NULL`,
    )
    .bind(userId)
    .first<UserRow>();

  return row ? { userId: row.userId, publicName: row.publicName, banned: Boolean(row.bannedAt) } : null;
}

export async function updatePublicName(db: D1Database, userId: string, publicName: string): Promise<Me | null> {
  await db
    .prepare(
      `UPDATE users
       SET public_name = ?
       WHERE user_id = ? AND deleted_at IS NULL`,
    )
    .bind(publicName, userId)
    .run();

  return getMe(db, userId);
}
