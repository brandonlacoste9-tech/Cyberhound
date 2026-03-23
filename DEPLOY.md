# CyberHound — production checklist

Boring but necessary steps before you rely on the hive in production.

## 1. Supabase

1. Create a project (or use an existing one).
2. Run SQL migrations **in order** in the SQL Editor:

   - `supabase/migrations/001_cyberhound_schema.sql`
   - `supabase/migrations/002_analyst_scheduler.sql`
   - `supabase/migrations/003_campaigns_status_live.sql`

3. Copy **Project URL** and **anon** + **service_role** keys into your host’s environment (see below).

## 2. Environment variables (Vercel or similar)

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

## 3. Build and smoke test

```bash
pnpm verify
```

With the production build running (e.g. `pnpm --filter @cyberhound/web start` after `pnpm build`):

```bash
set SMOKE_BASE_URL=http://127.0.0.1:3000
pnpm smoke
```

(On Windows PowerShell: `$env:SMOKE_BASE_URL="http://127.0.0.1:3000"; pnpm smoke`.)

## 4. Telegram webhook (optional)

Point Telegram to:

`https://<your-domain>/api/telegram-webhook`

Use the same bot token and admin chat ID you put in env.

## 5. After deploy

- Open `/dashboard`, run **Build demo campaign** on `/campaigns`, confirm a **public landing** URL opens.
- Hit `/api/treasurer` and confirm JSON (Stripe optional).

---

**Preflight (local):** `pnpm preflight` runs `verify` + `check:env` (requires `.env.local`).
