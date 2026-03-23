# CyberHound — Colony OS

Autonomous revenue agent monorepo: **Next.js 15** (`apps/web`), **Supabase**, bees (Queen, Scout, Builder, Closer, Treasurer), **Telegram HITL**, public landing pages at `/l/[campaignId]`.

> **Production:** see [DEPLOY.md](./DEPLOY.md) for migrations, env vars, and smoke tests.

## Requirements

- Node 20+
- [pnpm](https://pnpm.io) 9+

## Quick start

```bash
pnpm install
cp apps/web/.env.local.example apps/web/.env.local
# Edit apps/web/.env.local — Supabase + at least one LLM path (e.g. DEEPSEEK_API_KEY)
pnpm dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard) (or the port Next prints).

## Scripts (repo root)

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Turbopack dev server |
| `pnpm verify` | Typecheck + lint + production build |
| `pnpm smoke` | HTTP smoke tests (needs running server + `SMOKE_BASE_URL`) |
| `pnpm preflight` | `verify` + `check:env` (validates `.env.local`) |

## Structure

- `apps/web` — CyberHound web app and API routes
- `supabase/migrations` — SQL to run on your Supabase project

## License

See repository license file if present; otherwise treat as private project.
