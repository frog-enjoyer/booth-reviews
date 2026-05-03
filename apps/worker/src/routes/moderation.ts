import { Hono } from 'hono';
import type { Context } from 'hono';
import { validator } from 'hono/validator';

import { discordAuthorizeUrl } from '../auth/discord';
import {
  ADMIN_SESSION_COOKIE,
  clearAdminSessionCookie,
  getBearerToken,
  getCookieValue,
  getSessionUser,
  type SessionUser,
} from '../auth/session';
import {
  banUser,
  listUnresolvedReports,
  logModerationAction,
  moderatorDeleteReview,
  resolveReport,
  type AdminReport,
} from '../db/moderation';
import { fail, ok } from '../response';
import type { AppBindings } from '../types';
import {
  moderationReasonSchema,
  reportResolutionSchema,
} from '../validation/schemas';

export const moderationRoutes = new Hono<AppBindings>();

type AdminAuthResult = SessionUser | 'unauthenticated' | 'banned' | 'forbidden';

function adminLoginUrl(c: Context<AppBindings>): string | null {
  if (!c.env.DISCORD_CLIENT_ID || !c.env.DISCORD_REDIRECT_URI) return null;
  return discordAuthorizeUrl({
    clientId: c.env.DISCORD_CLIENT_ID,
    redirectUri: c.env.DISCORD_REDIRECT_URI,
    state: 'admin',
  });
}

function adminDiscordIds(c: Context<AppBindings>): Set<string> {
  return new Set(
    (c.env.ADMIN_DISCORD_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

async function getAdminAuth(c: Context<AppBindings>): Promise<AdminAuthResult> {
  const token =
    getBearerToken(c.req.header('Authorization')) ??
    getCookieValue(c.req.header('Cookie'), ADMIN_SESSION_COOKIE);
  const user = token ? await getSessionUser(c.env.DB, token) : null;
  if (!user) return 'unauthenticated';
  if (user.bannedAt) return 'banned';
  if (!adminDiscordIds(c).has(user.discordId)) return 'forbidden';

  return user;
}

async function requireAdmin(
  c: Context<AppBindings>,
): Promise<SessionUser | Response> {
  const admin = await getAdminAuth(c);
  if (admin === 'unauthenticated')
    return c.json(fail('UNAUTHORIZED', 'Sign in is required'), 401);
  if (admin === 'banned')
    return c.json(fail('UNAUTHORIZED', 'Admin account is banned'), 401);
  if (admin === 'forbidden')
    return c.json(fail('FORBIDDEN', 'Admin access is required'), 403);

  return admin;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderAdminPage(reports: AdminReport[]): string {
  const rows = reports
    .map(
      (report) => `
        <tr>
          <td>${escapeHtml(report.createdAt)}</td>
          <td>${escapeHtml(report.reason)}</td>
          <td>${escapeHtml(report.details)}</td>
          <td>${escapeHtml(report.reviewId)}</td>
          <td>${escapeHtml(report.reviewAuthorName ?? report.reviewAuthorId)}</td>
          <td><pre>${escapeHtml(report.reviewBody)}</pre></td>
          <td>${escapeHtml(report.reporterName ?? report.reporterId)}</td>
        </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Booth Reviews Moderation</title>
    <style>
      body { font: 14px/1.4 system-ui, sans-serif; margin: 24px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #d0d7de; padding: 8px; text-align: left; vertical-align: top; }
      pre { margin: 0; white-space: pre-wrap; }
      code { background: #f6f8fa; padding: 2px 4px; }
    </style>
  </head>
  <body>
    <h1>Unresolved Reports</h1>
    <p><a href="/admin/logout">Sign out</a></p>
    <p>Use the JSON admin endpoints to resolve reports, delete reviews, or ban users. Every action requires a reason and writes an audit log.</p>
    <p>Endpoints: <code>POST /admin/reports/:id/resolve</code>, <code>POST /admin/reviews/:id/delete</code>, <code>POST /admin/users/:id/ban</code>.</p>
    <table>
      <thead><tr><th>Created</th><th>Reason</th><th>Details</th><th>Review</th><th>Author</th><th>Body</th><th>Reporter</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="7">No unresolved reports.</td></tr>'}</tbody>
    </table>
  </body>
</html>`;
}

function renderLoginPage(
  loginUrl: string | null,
  message = 'Sign in with Discord to moderate reports.',
): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Booth Reviews Admin Login</title>
    <style>body { font: 14px/1.4 system-ui, sans-serif; margin: 24px; } a { display: inline-block; margin-top: 12px; }</style>
  </head>
  <body>
    <h1>Booth Reviews Admin</h1>
    <p>${escapeHtml(message)}</p>
    ${loginUrl ? `<a href="${escapeHtml(loginUrl)}">Sign in with Discord</a>` : '<p>Discord OAuth is not configured.</p>'}
  </body>
</html>`;
}

moderationRoutes.get('/', async (c) => {
  const admin = await getAdminAuth(c);
  if (admin === 'unauthenticated')
    return c.html(renderLoginPage(adminLoginUrl(c)));
  if (admin === 'banned')
    return c.html(
      renderLoginPage(adminLoginUrl(c), 'Your admin account is banned.'),
      401,
    );
  if (admin === 'forbidden')
    return c.html(
      renderLoginPage(
        adminLoginUrl(c),
        'This Discord account is not in the admin allowlist.',
      ),
      403,
    );

  const reports = await listUnresolvedReports(c.env.DB);
  return c.html(renderAdminPage(reports));
});

moderationRoutes.get('/login', (c) => {
  const loginUrl = adminLoginUrl(c);
  if (!loginUrl) return c.html(renderLoginPage(null), 501);
  return c.redirect(loginUrl);
});

moderationRoutes.get('/logout', () => {
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/admin',
      'Set-Cookie': clearAdminSessionCookie(),
    },
  });
});

moderationRoutes.get('/reports', async (c) => {
  const admin = await requireAdmin(c);
  if (admin instanceof Response) return admin;

  const reports = await listUnresolvedReports(c.env.DB);
  if (c.req.header('Accept')?.includes('text/html'))
    return c.html(renderAdminPage(reports));
  return c.json(ok({ reports }));
});

moderationRoutes.post(
  '/reports/:reportId/resolve',
  validator('json', (value, c) => {
    const result = reportResolutionSchema.safeParse(value);
    if (!result.success)
      return c.json(fail('INVALID_REQUEST', result.error.message), 400);
    return result.data;
  }),
  async (c) => {
    const admin = await requireAdmin(c);
    if (admin instanceof Response) return admin;

    const reportId = c.req.param('reportId');
    const { resolution } = c.req.valid('json');
    const resolved = await resolveReport(
      c.env.DB,
      reportId,
      admin.userId,
      resolution,
    );
    if (!resolved) return c.json(fail('NOT_FOUND', 'Report not found'), 404);

    await logModerationAction(c.env.DB, {
      action: 'resolve_report',
      targetType: 'report',
      targetId: reportId,
      moderatorUserId: admin.userId,
      reason: resolution,
      reportId,
    });

    return c.json(ok({ resolved: true }));
  },
);

moderationRoutes.post(
  '/reviews/:reviewId/delete',
  validator('json', (value, c) => {
    const result = moderationReasonSchema.safeParse(value);
    if (!result.success)
      return c.json(fail('INVALID_REQUEST', result.error.message), 400);
    return result.data;
  }),
  async (c) => {
    const admin = await requireAdmin(c);
    if (admin instanceof Response) return admin;

    const reviewId = c.req.param('reviewId');
    const { reason, reportId } = c.req.valid('json');
    const deleted = await moderatorDeleteReview(c.env.DB, reviewId);
    if (!deleted) return c.json(fail('NOT_FOUND', 'Review not found'), 404);

    await logModerationAction(c.env.DB, {
      action: 'delete_review',
      targetType: 'review',
      targetId: reviewId,
      moderatorUserId: admin.userId,
      reason,
      reportId,
    });

    return c.json(ok({ deleted: true }));
  },
);

moderationRoutes.post(
  '/users/:userId/ban',
  validator('json', (value, c) => {
    const result = moderationReasonSchema.safeParse(value);
    if (!result.success)
      return c.json(fail('INVALID_REQUEST', result.error.message), 400);
    return result.data;
  }),
  async (c) => {
    const admin = await requireAdmin(c);
    if (admin instanceof Response) return admin;

    const userId = c.req.param('userId');
    if (userId === admin.userId)
      return c.json(
        fail('INVALID_REQUEST', 'Cannot ban your own account'),
        400,
      );
    const { reason, reportId } = c.req.valid('json');
    const banned = await banUser(c.env.DB, userId);
    if (!banned) return c.json(fail('NOT_FOUND', 'User not found'), 404);

    await logModerationAction(c.env.DB, {
      action: 'ban_user',
      targetType: 'user',
      targetId: userId,
      moderatorUserId: admin.userId,
      reason,
      reportId,
    });

    return c.json(ok({ banned: true }));
  },
);
