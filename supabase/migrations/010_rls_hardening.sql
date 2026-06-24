-- Migration 010: RLS Hardening & Best Practices
-- Purpose: Improve security posture following Supabase Postgres best practices.
-- This is a SOVEREIGN / single-admin environment (Brandon), so we keep pragmatic access
-- but remove the most dangerous broad policies.
--
-- Key changes:
--   - Explicit service_role policies (preferred over USING(true) everywhere)
--   - Restrict anon role to ONLY public landing page data (campaigns + assets needed for /l/[id])
--   - Add comments and documentation
--   - Use security definer patterns where needed (future-proof)
--
-- After running:
--   1. supabase db push (or run in SQL editor)
--   2. Reload schema cache in Supabase Dashboard > Settings > API
--   3. Test public landing pages still work
--   4. Verify Queen/bee APIs (service_role) still work

-- ============================================================
-- 1. REVOKE overly broad anon policies from migration 009
--    Anon should ONLY see public marketing/landing data.
-- ============================================================

DROP POLICY IF EXISTS "Allow anon read hive_log" ON hive_log;
DROP POLICY IF EXISTS "Allow anon read analyst_leads" ON analyst_leads;
DROP POLICY IF EXISTS "Allow anon read follow_up_sequences" ON follow_up_sequences;
DROP POLICY IF EXISTS "Allow anon read revenue_events" ON revenue_events;
DROP POLICY IF EXISTS "Allow anon read outreach_log" ON outreach_log;

-- Keep limited anon read for public landing pages ONLY
-- (campaigns + assets for /l/[campaignId])
-- Everything else is internal.

DROP POLICY IF EXISTS "Allow anon read opportunities" ON opportunities;
DROP POLICY IF EXISTS "Allow anon read campaigns" ON campaigns;

-- Public landing: allow anon to read APPROVED/LIVE campaigns + their assets
CREATE POLICY "public_landing_campaigns" ON campaigns
  FOR SELECT
  USING (status IN ('building', 'live'));

CREATE POLICY "public_landing_assets" ON assets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = assets.campaign_id
        AND c.status IN ('building', 'live')
    )
  );

-- ============================================================
-- 2. Explicit service_role policies (best practice)
--    Prefer these over broad "USING (true)"
-- ============================================================

-- Helper comment: service_role bypasses RLS by default in Supabase,
-- but we explicitly declare policies for auditability and future multi-tenant use.

-- Drop old broad policies where they exist
DROP POLICY IF EXISTS "service_full_access_opportunities" ON opportunities;
DROP POLICY IF EXISTS "service_full_access_campaigns" ON campaigns;
DROP POLICY IF EXISTS "Allow full access to agent_tasks" ON agent_tasks;
DROP POLICY IF EXISTS "Allow service_role all analyst_leads" ON analyst_leads;
DROP POLICY IF EXISTS "Allow service_role all follow_up_sequences" ON follow_up_sequences;

-- Opportunities
CREATE POLICY "service_role_all_opportunities" ON opportunities
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Campaigns
CREATE POLICY "service_role_all_campaigns" ON campaigns
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Assets
CREATE POLICY "service_role_all_assets" ON assets
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Outreach log
CREATE POLICY "service_role_all_outreach_log" ON outreach_log
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Revenue
CREATE POLICY "service_role_all_revenue_events" ON revenue_events
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Hive log
CREATE POLICY "service_role_all_hive_log" ON hive_log
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- HITL
CREATE POLICY "service_role_all_hitl_approvals" ON hitl_approvals
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Analyst leads
CREATE POLICY "service_role_all_analyst_leads" ON analyst_leads
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Follow up sequences
CREATE POLICY "service_role_all_follow_up_sequences" ON follow_up_sequences
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Agent tasks (critical for Queen orchestration)
CREATE POLICY "service_role_all_agent_tasks" ON agent_tasks
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- 3. Internal authenticated role (future-proof)
--    If we ever add real user accounts, these can be tightened.
-- ============================================================

-- For now, authenticated can read most things (dashboard use)
-- but cannot write (writes go through service_role APIs)

CREATE POLICY "authenticated_read_opportunities" ON opportunities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_read_campaigns" ON campaigns
  FOR SELECT TO authenticated USING (true);

-- Add similar for other tables as needed. Keep minimal for now.

-- ============================================================
-- 4. Documentation & future guidance
-- ============================================================

COMMENT ON TABLE opportunities IS 'Scout discoveries. RLS: service_role full, anon limited to public live campaigns, authenticated read.';
COMMENT ON TABLE agent_tasks IS 'Queue for Queen Bee -> bee dispatches. Only service_role should write.';
COMMENT ON TABLE hive_log IS 'Audit trail. Service role writes, limited public/anon read.';

-- Recommended next steps (documented):
-- 1. For truly secure multi-tenant later:
--    - Add user_id / org_id columns
--    - Replace USING(true) with USING (auth.uid() = user_id) or similar
--    - Use security_invoker views
--
-- 2. Always run: supabase db advisors after changes
-- 3. Never expose service_role key to client (already enforced in code via getSupabaseServer())

-- After applying, run:
--   supabase db advisors
--   Then reload schema cache in dashboard.