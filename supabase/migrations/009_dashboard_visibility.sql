-- Migration: 009_dashboard_visibility.sql
-- Fixes RLS policies to allow the Overlord Dashboard to read system logs and leads.

-- Enable RLS on all tables (idempotent)
ALTER TABLE analyst_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE hive_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_events ENABLE ROW LEVEL SECURITY;

-- Allow 'anon' to read data for the dashboard
-- (We use simple 'true' policies for this sovereign environment)

DROP POLICY IF EXISTS "Allow anon read hive_log" ON hive_log;
CREATE POLICY "Allow anon read hive_log" ON hive_log FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon read analyst_leads" ON analyst_leads;
CREATE POLICY "Allow anon read analyst_leads" ON analyst_leads FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon read campaigns" ON campaigns;
CREATE POLICY "Allow anon read campaigns" ON campaigns FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon read opportunities" ON opportunities;
CREATE POLICY "Allow anon read opportunities" ON opportunities FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon read outreach_log" ON outreach_log;
CREATE POLICY "Allow anon read outreach_log" ON outreach_log FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon read follow_up_sequences" ON follow_up_sequences;
CREATE POLICY "Allow anon read follow_up_sequences" ON follow_up_sequences FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon read revenue_events" ON revenue_events;
CREATE POLICY "Allow anon read revenue_events" ON revenue_events FOR SELECT USING (true);

-- Ensure service_role still has full access
-- (Existing policies might already cover this, but we'll be explicit)
DROP POLICY IF EXISTS "Allow service_role all analyst_leads" ON analyst_leads;
CREATE POLICY "Allow service_role all analyst_leads" ON analyst_leads FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow service_role all follow_up_sequences" ON follow_up_sequences;
CREATE POLICY "Allow service_role all follow_up_sequences" ON follow_up_sequences FOR ALL USING (true);
