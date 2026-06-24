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

## 3. Supabase & RLS Hardening (IMPORTANT)

Run migrations **in order**, including the hardening migration:

```bash
supabase db push
# or run 010_rls_hardening.sql manually in the SQL editor
```

After applying `010_rls_hardening.sql`:
1. Go to Supabase Dashboard → Settings → API → **Reload schema cache**
2. Test public landing pages (`/l/[id]`)
3. Verify all bee APIs still work (they use service_role)

The new policies:
- `service_role` has full access (explicit)
- `anon` only sees public/live campaigns + assets (for landing pages)
- Internal tables are no longer broadly readable by anon

See `supabase/migrations/010_rls_hardening.sql` for full details.

## 4. Environment variables (Vercel or similar)

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

## Running with Ollama (Recommended for Local / Autonomous Testing)

Ollama lets you run Cyberhound completely locally with no paid LLM keys.

### One-Click Setup (Recommended)

```powershell
.\start-ollama-autonomous.ps1
```

The script automatically:
- Checks that Ollama is running
- Pulls the model if missing
- Configures your `.env` for Ollama + autonomous mode
- Starts the autonomous agent loop

**With options:**
```powershell
# Use a stronger model
.\start-ollama-autonomous.ps1 -Model qwen2.5:14b

# Run the task queue instead of full loop
.\start-ollama-autonomous.ps1 -Mode task-runner
```

### Manual Setup
```bash
# 1. Install Ollama (https://ollama.com)
ollama pull deepseek-r1       # recommended for reasoning agents
```

Add to `.env` (or `.env.local`):
```env
AI_PROVIDER=ollama
OLLAMA_MODEL=deepseek-r1
# OLLAMA_BASE_URL=http://localhost:11434/v1   # optional
```

Run:
```bash
# Python side (the bees)
python cyberhound/run.py autonomous --loop

# Or the task worker
python -m cyberhound.task_runner --loop
```

The web app will also use Ollama if you set the same variables when running `pnpm dev`.

---

## Running Fully Autonomously

The system is designed to run with **minimal intervention** — set it and forget it.

### Docker (recommended for Python worker)
Use the provided files:

```bash
docker build -f Dockerfile.python-autonomous -t cyberhound-autonomous .
docker run -d --env-file .env --name ch-autonomous --restart unless-stopped cyberhound-autonomous
```

Or with compose:

```bash
docker-compose -f docker-compose.autonomous.yml up -d
```

See `docker-compose.autonomous.yml` and `Dockerfile.python-autonomous`.

### systemd (for VPS)
See `cyberhound-autonomous.service` example. Copy to /etc/systemd/system/, then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cyberhound-autonomous
sudo journalctl -u cyberhound-autonomous -f
```

Adjust paths, user, venv in the .service file.

### Option A: Vercel Crons (easiest for web bees - highly recommended)
The **Hunt cron** (`/api/cron/hunt`) is the star of autonomy:
- Every 6 hours it does: Scout niches → score → auto-approve (≥70) → Builder (landing page copy + Stripe product/link) → Closer (outreach sequence).
- Scheduler cron handles drip sequences hourly.

**Setup:**
- Set `CRON_SECRET` (and other keys).
- Configure in Vercel:
  - `/api/cron/hunt` → `0 */6 * * *`
  - `/api/cron/scheduler` → `0 * * * *`
  - Optionally analyst/backlog/vigil.

The hunt cron already does end-to-end autonomous revenue pipeline with Telegram notifications.

### Option B: Python Full Autonomous Worker
For the classic lead pipeline (Scout → Enrich → Strike → Watchdog → Sequence):

```bash
# One cycle
python cyberhound/run.py autonomous

# True hands-off continuous mode (best for VPS / Docker / Render worker)
python cyberhound/run.py autonomous --loop
```

**Task Queue Worker** (for Queen Bee chat dispatches + cron-fed tasks):
```bash
python -m cyberhound.task_runner --loop
```

Both use the unified LLM and log heavily to `hive_log` (visible in dashboard).

**Production tips for autonomy:**
- Run the Python worker in `screen`, `tmux`, Docker, or as a systemd service.
- Set all LLM + Supabase + enrichment keys.
- Use `SCOUT_INTERVAL_HOURS=4` etc. via env.
- Monitor via `/dashboard/hive`, `/api/autonomy/status` (JSON), Telegram.
- Set `AUTONOMOUS_MODE=true` to disable HITL where possible (auto-approve sequences, tasks etc).
- The Queen (`/dashboard` chat) can still inject tasks even in full auto mode.

See `cyberhound/run.py --help` and the crons for details.

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
