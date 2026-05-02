export type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
};

type DiscordTokenResponse = {
  access_token: string;
  token_type: string;
};

export async function exchangeDiscordCode(input: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<string> {
  const body = new URLSearchParams();
  body.set('client_id', input.clientId);
  body.set('client_secret', input.clientSecret);
  body.set('grant_type', 'authorization_code');
  body.set('code', input.code);
  body.set('redirect_uri', input.redirectUri);

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) throw new Error('Discord token exchange failed');

  const token = (await response.json()) as DiscordTokenResponse;
  return token.access_token;
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const response = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error('Discord user lookup failed');

  return (await response.json()) as DiscordUser;
}
