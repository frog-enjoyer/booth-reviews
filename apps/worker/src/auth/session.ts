import { SESSION_TOKEN_BYTES, SESSION_TTL_DAYS } from '@booth-addon/shared';

export type SessionUser = {
  userId: string;
  publicName: string;
  bannedAt: string | null;
};

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashSessionToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(digest);
}

export function createSessionToken(): string {
  const bytes = new Uint8Array(SESSION_TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

export function sessionExpiry(): string {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);
  return expiresAt.toISOString();
}

export function getBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

export async function getSessionUser(db: D1Database, token: string): Promise<SessionUser | null> {
  const tokenHash = await hashSessionToken(token);
  const row = await db
    .prepare(
      `SELECT users.user_id as userId, users.public_name as publicName, users.banned_at as bannedAt
       FROM sessions
       JOIN users ON users.user_id = sessions.user_id
       WHERE sessions.token_hash = ?
         AND sessions.revoked_at IS NULL
         AND sessions.expires_at > CURRENT_TIMESTAMP
         AND users.deleted_at IS NULL`,
    )
    .bind(tokenHash)
    .first<SessionUser>();

  return row ?? null;
}

export async function createSession(db: D1Database, userId: string): Promise<string> {
  const token = createSessionToken();
  const tokenHash = await hashSessionToken(token);

  await db
    .prepare(
      `INSERT INTO sessions (token_hash, user_id, expires_at)
       VALUES (?, ?, ?)`,
    )
    .bind(tokenHash, userId, sessionExpiry())
    .run();

  return token;
}

export async function revokeSession(db: D1Database, token: string): Promise<void> {
  const tokenHash = await hashSessionToken(token);
  await db
    .prepare(
      `UPDATE sessions
       SET revoked_at = CURRENT_TIMESTAMP
       WHERE token_hash = ?`,
    )
    .bind(tokenHash)
    .run();
}
