export type Env = {
  DB: D1Database;
  ADMIN_DISCORD_IDS?: string;
  CORS_ALLOWED_BOOTH_ORIGINS?: string;
  CORS_ALLOWED_EXTENSION_ORIGINS?: string;
  DISCORD_CLIENT_ID?: string;
  DISCORD_CLIENT_SECRET?: string;
  DISCORD_REDIRECT_URI?: string;
  OAUTH_STATE_SECRET?: string;
};

export type AppBindings = {
  Bindings: Env;
};
