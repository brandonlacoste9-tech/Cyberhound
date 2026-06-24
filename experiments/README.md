# Experiments / Legacy

This directory contains:

- Historical and experimental agent implementations
- Duplicate versions of scouts, engines, and workers
- Old K120 and scratch work

**Do not use these in production.**

The canonical implementations are in:
- `cyberhound/swarm/` (HoundManager + specialized hounds)
- `cyberhound/llm.py` (unified LLM client)
- `apps/web/src/app/api/*` (Queen, bees, cron)
- Main autonomy via `agent_tasks` table + cron routes

See root README and cyberhound/ for current architecture.

Moved here during 2026 cleanup to reduce root noise and duplication.
