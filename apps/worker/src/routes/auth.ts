import type { AuthStartResponse } from '@booth-addon/shared';
import { Hono } from 'hono';
import { validator } from 'hono/validator';

import {
  discordAuthorizeUrl,
  exchangeDiscordCode,
  fetchDiscordUser,
} from '../auth/discord';
import {
  adminSessionCookie,
  createSession,
  getBearerToken,
  getSessionUser,
  revokeSession,
} from '../auth/session';
import { getMe, updatePublicName, upsertDiscordUser } from '../db/users';
import { fail, ok } from '../response';
import type { AppBindings } from '../types';
import { meUpdateSchema } from '../validation/schemas';

export const authRoutes = new Hono<AppBindings>();

authRoutes.post('/discord/start', (c) => {
  if (!c.env.DISCORD_CLIENT_ID || !c.env.DISCORD_REDIRECT_URI) {
    return c.json(
      fail('AUTH_NOT_CONFIGURED', 'Discord OAuth is not configured'),
      501,
    );
  }

  return c.json(
    ok<AuthStartResponse>({
      url: discordAuthorizeUrl({
        clientId: c.env.DISCORD_CLIENT_ID,
        redirectUri: c.env.DISCORD_REDIRECT_URI,
      }),
    }),
  );
});

authRoutes.get('/discord/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) {
    return c.html(errorPage('MISSING_CODE', 'Discord did not return a code'));
  }

  if (
    !c.env.DISCORD_CLIENT_ID ||
    !c.env.DISCORD_CLIENT_SECRET ||
    !c.env.DISCORD_REDIRECT_URI
  ) {
    return c.html(
      errorPage('AUTH_NOT_CONFIGURED', 'Discord OAuth is not configured'),
    );
  }

  try {
    const accessToken = await exchangeDiscordCode({
      clientId: c.env.DISCORD_CLIENT_ID,
      clientSecret: c.env.DISCORD_CLIENT_SECRET,
      code,
      redirectUri: c.env.DISCORD_REDIRECT_URI,
    });
    const discordUser = await fetchDiscordUser(accessToken);
    const me = await upsertDiscordUser(c.env.DB, discordUser);
    const token = await createSession(c.env.DB, me.userId);

    if (c.req.query('state') === 'admin') {
      if (
        me.banned ||
        !adminDiscordIds(c.env.ADMIN_DISCORD_IDS).has(discordUser.id)
      ) {
        return c.html(errorPage('FORBIDDEN', 'Admin access is required'));
      }

      return new Response(null, {
        status: 302,
        headers: {
          Location: '/admin',
          'Set-Cookie': adminSessionCookie(token),
        },
      });
    }

    return c.html(successPage(token, me.publicName));
  } catch {
    return c.html(
      errorPage('AUTH_FAILED', 'Discord login failed. Please try again.'),
    );
  }
});

function adminDiscordIds(value: string | undefined): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

function successPage(token: string, publicName: string): string {
  const payload = JSON.stringify({ type: 'AUTH_SUCCESS', token, publicName });
  // postMessage target is '*' because the opener is a chrome-extension:// page and
  // extensions cannot be spoofed as window.opener — this is an accepted risk.
  return `<!doctype html><html><head><meta charset="utf-8"><title>Booth Trust Layer</title></head><body>
<script>
(function(){
  var msg = ${payload};
  if (window.opener && !window.opener.closed) { window.opener.postMessage(msg, '*'); }
  window.close();
})();
</script>
<p>Login successful. You may close this window.</p>
</body></html>`;
}

function errorPage(code: string, message: string): string {
  const payload = JSON.stringify({ type: 'AUTH_ERROR', code, message });
  return `<!doctype html><html><head><meta charset="utf-8"><title>Booth Trust Layer</title></head><body>
<script>
(function(){
  var msg = ${payload};
  if (window.opener && !window.opener.closed) { window.opener.postMessage(msg, '*'); }
})();
</script>
<p>Login failed: ${JSON.stringify(message)}</p>
</body></html>`;
}

authRoutes.get('/me', async (c) => {
  const token = getBearerToken(c.req.header('Authorization'));
  const sessionUser = token ? await getSessionUser(c.env.DB, token) : null;
  if (!sessionUser)
    return c.json(fail('SESSION_EXPIRED', 'Sign in again'), 401);

  const me = await getMe(c.env.DB, sessionUser.userId);
  if (!me) return c.json(fail('SESSION_EXPIRED', 'Sign in again'), 401);

  return c.json(ok(me));
});

authRoutes.patch(
  '/me',
  validator('json', (value, c) => {
    const result = meUpdateSchema.safeParse(value);
    if (!result.success)
      return c.json(fail('INVALID_REQUEST', result.error.message), 400);
    return result.data;
  }),
  async (c) => {
    const token = getBearerToken(c.req.header('Authorization'));
    const sessionUser = token ? await getSessionUser(c.env.DB, token) : null;
    if (!sessionUser)
      return c.json(fail('SESSION_EXPIRED', 'Sign in again'), 401);

    const me = await updatePublicName(
      c.env.DB,
      sessionUser.userId,
      c.req.valid('json').publicName,
    );
    if (!me) return c.json(fail('SESSION_EXPIRED', 'Sign in again'), 401);

    return c.json(ok(me));
  },
);

authRoutes.post('/logout', async (c) => {
  const token = getBearerToken(c.req.header('Authorization'));
  if (token) await revokeSession(c.env.DB, token);
  return c.json(ok({ loggedOut: true }));
});
