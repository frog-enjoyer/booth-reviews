# Booth Reviews

A browser extension that adds community reviews and ratings to [Booth.pm](https://booth.pm) — a popular VRChat asset marketplace.

Booth has no built-in review system. This extension lets users rate and review items inline on listing pages, so the community can share honest feedback before buying.

---

## Features

- **Inline ratings** — 👍/👎 vote buttons injected next to the wishlist button on every listing
- **Written reviews** — leave detailed feedback, visible to anyone with the extension
- **Helpful votes** — upvote reviews you found useful
- **Discord login** — sign in with Discord

## How it works

The extension is built with [WXT](https://wxt.dev) and injects UI directly into Booth pages. Reviews are stored in a [Cloudflare D1](https://developers.cloudflare.com/d1/) database and served by a [Cloudflare Worker](https://workers.cloudflare.com/) built with [Hono](https://hono.dev/). Auth is handled via Discord OAuth with opaque session tokens — only a SHA-256 hash of the token is stored.

---

## Stack

| Layer | Technology |
|---|---|
| Extension | WXT, TypeScript, plain DOM |
| Backend | Cloudflare Workers, Hono, Zod |
| Database | Cloudflare D1 (SQLite) |
| Auth | Discord OAuth2 |
| Monorepo | pnpm workspaces |
| CI/CD | GitHub Actions |

---

## Development

**Prerequisites:** Node.js 22+, pnpm 10+, a Cloudflare account, a Discord developer application.

```bash
# Install dependencies
pnpm install

# Start the Worker locally
pnpm --filter @booth-addon/worker dev

# Start the extension in dev mode (Chrome)
pnpm --filter @booth-addon/extension dev

# Run all tests
pnpm test

# Typecheck everything
pnpm typecheck
```

### Local database setup

```bash
cd apps/worker

# Apply migrations to local D1
pnpm db:migrate:local

# Seed demo data
pnpm db:seed:local
```

### Environment

The Worker reads the following secrets (set via `wrangler secret put`):

| Secret | Description |
|---|---|
| `DISCORD_CLIENT_ID` | Discord OAuth app client ID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth app client secret |

Non-secret config lives in `wrangler.toml`:

| Var | Description |
|---|---|
| `CORS_ALLOWED_BOOTH_ORIGINS` | Booth origins allowed to call the API |
| `CORS_ALLOWED_EXTENSION_ORIGINS` | Extension `chrome-extension://` origin |
| `DISCORD_REDIRECT_URI` | OAuth callback URL |

The extension reads `PUBLIC_API_BASE_URL` from `.env.production` at build time.

---

## Project structure

```
apps/
  extension/      WXT browser extension
  worker/         Cloudflare Worker API
packages/
  shared/         Types, scoring logic, constants
```

---

## Contributing

Issues and PRs are welcome. This is an early-stage project — if you use Booth and want to help shape it, open an issue.

---

## License

MIT
