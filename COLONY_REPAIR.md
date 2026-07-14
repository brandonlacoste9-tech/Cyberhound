# CyberHound Colony Repair

## Root causes (verified 2026-07-14)

| Issue | Evidence | Impact |
|-------|----------|--------|
| **Dead Supabase project** | `ENOTFOUND avimvvlwrekhblubcutg.supabase.co` on `/api/campaigns` | No opportunities, campaigns, hive logs, or leads persist |
| **DeepSeek out of credit** | Vercel runtime: **212×** `402 Insufficient Balance` on `/api/cron/hunt` | Scout/Builder/Closer LLM steps fail every cron |
| **Fake dashboard metrics** | Hardcoded hound bounties + `total_leads \|\| 20` fallback | UI looked healthy while colony was empty |
| **Schema gaps** | `campaigns.niche`, hive_log status `idle`, `leads` table optional | Inserts fail after DB is restored |
| **Free Supabase limit** | Cannot create `cyberhound` project (2 free projects max) | Need pause/delete unused project or upgrade |

## What this patch fixes in code

1. **Multi-LLM fallthrough** — Ollama → OpenClaw → OpenAI → **Gemini** → DeepSeek (skips 402/429)
2. **Heuristic scout** — if LLM dies after live search, still scores niches from web hits
3. **Template Builder copy** — landing pages can still be created without LLM
4. **Honest `/api/health`** — blockers, counts, provider list
5. **Honest dashboard / autonomy status** — no fake “20 opportunities”
6. **Migration `011_colony_repair.sql`** — niche column, hive constraints, leads, agent_tasks
7. **Leads API** — falls back to `analyst_leads`, clear DNS errors

## What you must do on infrastructure (required)

### 1. Free or create a Supabase project

```bash
# Option A: pause/delete an unused free project in dashboard, then:
npx supabase projects create cyberhound --org-id <ORG> --db-password <PASS> --region ca-central-1

# Option B: upgrade Supabase plan and create cyberhound
```

### 2. Apply migrations (all, in order, or push)

```bash
cd Cyberhound
npx supabase link --project-ref <NEW_REF>
npx supabase db push
# includes 011_colony_repair.sql
```

Or paste SQL files in Supabase SQL editor: `001` … `011`.

### 3. Set Vercel env on project `cyberhound`

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | New project URL (not `avimvvlwrekhblubcutg`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
| `DEEPSEEK_API_KEY` | **or** top-up balance |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | **Recommended** so 402 DeepSeek doesn’t kill the colony |
| `FIRECRAWL_API_KEY` or `APIFY_API_TOKEN` | Required for hunt cron search |
| `CRON_SECRET` | Must match Vercel Cron Authorization |
| `AUTONOMOUS_MODE` | `true` when ready |
| `NEXT_PUBLIC_SITE_URL` | `https://cyberhound.vercel.app` |
| `RESEND_API_KEY` | For real email send |
| `STRIPE_SECRET_KEY` | For payment links |

Redeploy after env change.

### 4. Verify

```text
GET https://cyberhound.vercel.app/api/health
→ ok: true, ready_for_autonomous_hunt: true

GET https://cyberhound.vercel.app/api/autonomy/status
→ ok: true, db_error: null
```

Trigger hunt (with secret):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://cyberhound.vercel.app/api/cron/hunt
```

## Local (Ollama) path

You already have `deepseek-r1` and `gemma4` via Ollama.

```powershell
# After Supabase is linked + migrations applied:
copy apps\web\.env.local.example apps\web\.env.local
# fill Supabase + set:
# AI_PROVIDER=ollama
# OLLAMA_MODEL=deepseek-r1
# AUTONOMOUS_MODE=true

pnpm install
pnpm dev
# open http://localhost:3000/dashboard
# check http://localhost:3000/api/health
```

Or: `.\start-ollama-autonomous.ps1`

## Success criteria

- [ ] `/api/health` → `ok: true`
- [ ] Opportunities count increases after hunt
- [ ] Hive log shows scout/builder entries
- [ ] Dashboard does **not** invent “20 opportunities”
- [ ] DeepSeek 402 no longer the only LLM path (Gemini/OpenAI/Ollama configured)
