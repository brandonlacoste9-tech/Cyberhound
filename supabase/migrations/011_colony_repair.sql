-- Migration 011: Colony repair — schema gaps that break autonomous hunt/build
-- Root causes: missing campaigns.niche, hive_log status/bee constraints too tight

-- Campaigns used by hunt cron + Builder (insert includes niche)
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS niche TEXT;

-- Ensure landing/payment columns exist (some DBs only had partial 006)
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS landing_page_url TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_link TEXT,
  ADD COLUMN IF NOT EXISTS customer_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mrr INTEGER NOT NULL DEFAULT 0;

-- Hive log: allow all bees + idle/busy statuses used by dashboard + crons
ALTER TABLE public.hive_log DROP CONSTRAINT IF EXISTS hive_log_bee_check;
ALTER TABLE public.hive_log ADD CONSTRAINT hive_log_bee_check
  CHECK (bee IN (
    'queen', 'scout', 'builder', 'closer', 'closer_v2', 'treasurer',
    'analyst', 'enrich', 'scheduler', 'wasp', 'vigil', 'system', 'hermes'
  ));

ALTER TABLE public.hive_log DROP CONSTRAINT IF EXISTS hive_log_status_check;
ALTER TABLE public.hive_log ADD CONSTRAINT hive_log_status_check
  CHECK (status IN (
    'success', 'error', 'pending_approval', 'vetoed', 'idle', 'busy', 'skipped'
  ));

-- Opportunities status used by autonomy helpers
ALTER TABLE public.opportunities DROP CONSTRAINT IF EXISTS opportunities_status_check;
ALTER TABLE public.opportunities ADD CONSTRAINT opportunities_status_check
  CHECK (status IN (
    'discovered', 'pending_approval', 'approved', 'rejected',
    'building', 'live', 'archived'
  ));

-- Ensure leads table exists (landing captures) even if 006 never ran
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  phone TEXT,
  website TEXT,
  linkedin_url TEXT,
  source TEXT DEFAULT 'landing_page',
  status TEXT DEFAULT 'new',
  score INTEGER DEFAULT 0,
  notes TEXT,
  meeting_booked_at TIMESTAMPTZ,
  meeting_url TEXT,
  enriched_data JSONB DEFAULT '{}',
  referral_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_leads" ON public.leads;
CREATE POLICY "service_role_all_leads" ON public.leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- agent_tasks for Hermes queue
CREATE TABLE IF NOT EXISTS public.agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  task_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  result JSONB,
  error TEXT
);

ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_agent_tasks" ON public.agent_tasks;
CREATE POLICY "service_role_all_agent_tasks" ON public.agent_tasks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
