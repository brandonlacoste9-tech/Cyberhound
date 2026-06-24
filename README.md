# CyberHound — Colony OS

Autonomous revenue agent monorepo: **Next.js 15** (`apps/web`), **Supabase**, bees (Queen, Scout, Builder, Closer, Treasurer), **Telegram HITL**, public landing pages at `/l/[campaignId]`.

> **Production:** see [DEPLOY.md](./DEPLOY.md) for migrations, env vars, and smoke tests.

## Requirements

- Node 20+
- [pnpm](https://pnpm.io) 9+

## Quick start (Web)

```bash
pnpm install
cp apps/web/.env.local.example apps/web/.env.local
# Edit apps/web/.env.local — Supabase + at least one LLM path (e.g. DEEPSEEK_API_KEY)
pnpm dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

### Running with Ollama (local & free) - One Click

The easiest way:

```powershell
.\start-ollama-autonomous.ps1
```

**Advanced options:**
```powershell
# Use a stronger model
.\start-ollama-autonomous.ps1 -Model qwen2.5:14b

# Use the task queue worker instead of full loop
.\start-ollama-autonomous.ps1 -Mode task-runner
```

The script will:
- Check that Ollama is running
- Pull the model if missing
- Configure `.env` for local Ollama + autonomous mode
- Start the autonomous agent loop

**Manual alternative** (if you prefer):
1. `ollama pull llama3.2`
2. Set in `.env`:
   ```env
   AI_PROVIDER=ollama
   OLLAMA_MODEL=llama3.2
   AUTONOMOUS_MODE=true
   ```
3. `python cyberhound/run.py autonomous --loop`

## Run Fully Autonomously (the bees)

### Easiest (One-click with Ollama)

```powershell
.\start-ollama-autonomous.ps1
```

**Web side (Vercel Cron recommended):**
- Deploy to Vercel.
- Set `CRON_SECRET` and configure Vercel Cron for `/api/cron/hunt` (every 6h) and `/api/cron/scheduler` (hourly).
- The Hunt cron already runs full autonomous pipeline: Scout → auto-approve → Builder (landing + Stripe) → Closer sequences.

**Python side (long-running worker):**
```bash
# One cycle
python cyberhound/run.py autonomous

# Continuous autonomous loop (recommended)
python cyberhound/run.py autonomous --loop
```

Or use the task queue worker (for Queen chat dispatches):
```bash
python -m cyberhound.task_runner --loop
```

See `DEPLOY.md` for production autonomous setup (VPS, Docker, systemd).

Autonomy monitoring:
- /dashboard/hive
- GET /api/autonomy/status
- Set AUTONOMOUS_MODE=true to reduce HITL.

## Scripts (repo root)

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Turbopack dev server |
| `pnpm verify` | Typecheck + lint + production build |
| `pnpm smoke` | HTTP smoke tests (needs running server + `SMOKE_BASE_URL`) |
| `pnpm preflight` | `verify` + `check:env` (validates `.env.local`) |

## Structure (Current - Post Cleanup)

- `apps/web` — Main Next.js 15 dashboard + bee APIs (Queen, Scout, Builder, Closer, Treasurer, Analyst, etc.)
- `cyberhound/` — Python swarm core
  - `swarm/` — Modern HoundManager + specialized hounds (SaaS, Upwork, etc.)
  - `llm.py` — Unified LLM client (OpenClaw → DeepSeek priority, matches web)
  - `autonomy_engine.py` — Full revenue loop (Scout → Enrich → Outreach → Watchdog)
- `supabase/migrations` — Database schema (run in order, including 010_rls_hardening)
- `experiments/legacy/` — Old/duplicate code (k_120, scratch, old scouts, v2 files). DO NOT USE for new work.

See `DEPLOY.md` for setup and `cyberhound/` for agent details.

## License

See repository license file if present; otherwise treat as private project.
