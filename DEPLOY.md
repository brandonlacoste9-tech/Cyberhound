# CyberHound — production checklist

Boring but necessary steps before you rely on the hive in production.

## 1. Supabase

1. Create a project (or use an existing one).
2. Run SQL migrations **in order** in the SQL Editor:

   - `supabase/migrations/001_cyberhound_schema.sql`
   - `supabase/migrations/002_analyst_scheduler.sql`
   - `supabase/migrations/003_campaigns_status_live.sql`

3. Copy **Project URL** and **anon** + **service_role** keys into your host’s environment (see below).

## 2. Turborepo + Vercel env

Vercel sets variables on the host, but **Turbo** only forwards into `turbo run build` the names listed in **`turbo.json` → `globalPassThroughEnv`**. If you add a new secret, add its name there too or the build log will warn and `next build` may not see it.

## 3. Environment variables (Vercel or similar)

Set these on the **web** app (`apps/web` / Next.js root):

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only; never expose to client |
| `DEEPSEEK_API_KEY` | Yes* | *Or use `OPENAI_API_KEY` and/or hosted OpenClaw via `OPENCLAW_BASE_URL` + `OPENCLAW_GATEWAY_TOKEN` |
| `NEXT_PUBLIC_SITE_URL` | Strongly recommended | `https://your-domain.com` — correct `landing_page_url` from Builder |
| `FIRECRAWL_API_KEY` | No | Scout/Analyst enrichment |
| `STRIPE_SECRET_KEY` | No | Live campaigns / payment links |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhooks |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | Client if you add Stripe.js |
| `TELEGRAM_BOT_TOKEN` | No | HITL + alerts |
| `TELEGRAM_CHAT_ID` | No | Must match the chat your bot uses (same idea as webhook admin) |
| `RESEND_API_KEY` | No | Closer / scheduler email |
| `APOLLO_API_KEY` | No | Enrich bee |
| `SCOUT_AUTO_APPROVE_MIN_SCORE` | No | Default `78` |
| `SCHEDULER_SECRET` | No | Cron/auth for scheduler route |

Local template: `apps/web/.env.local.example` → copy to `apps/web/.env.local`.

Validate locally (from repo root; requires `apps/web/.env.local`):

```bash
pnpm run check:env
pnpm run check:env -- --strict
```

## 4. Build and smoke test

```bash
pnpm verify
```

With the production build running (e.g. `pnpm --filter @cyberhound/web start` after `pnpm build`):

```bash
set SMOKE_BASE_URL=http://127.0.0.1:3000
pnpm smoke
```

(On Windows PowerShell: `$env:SMOKE_BASE_URL="http://127.0.0.1:3000"; pnpm smoke`.)

## 5. Telegram webhook (optional)

Point Telegram to:

`https://<your-domain>/api/telegram-webhook`

Use the same bot token and admin chat ID you put in env.

## 6. After deploy

- Open `/dashboard`, run **Build demo campaign** on `/campaigns`, confirm a **public landing** URL opens.
- Hit `/api/treasurer` and confirm JSON (Stripe optional).

---

**Preflight (local):** `pnpm preflight` runs `verify` + `check:env` (requires `.env.local`).

## 7. New Migrations (April 2026)

Run in order after existing migrations:

- `supabase/migrations/004_outreach_log_closer_v2.sql` — Adds Closer v2 columns to outreach_log
- `supabase/migrations/005_opportunities_scout_columns.sql` — Adds Scout intelligence columns

## 8. Vercel Cron Setup

The Scheduler Bee runs hourly via Vercel Cron (`apps/web/vercel.json`).

Set this env var in Vercel:
```
CRON_SECRET=your-secret-here
```

The cron endpoint is `GET /api/cron/scheduler` and requires `Authorization: Bearer <CRON_SECRET>`.
Vercel automatically injects this header for cron invocations.

## 9. Python Scripts: API Key Setup

Scripts in the repo root require these env vars (add to `.env`):

```
VERTEX_API_KEY=your_vertex_express_key
VERTEX_PROJECT_ID=your_gcp_project_id
GEMINI_API_KEY=your_gemini_api_key
```

All hardcoded keys have been removed as of April 2026.
