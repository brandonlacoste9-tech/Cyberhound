-- 1. INFRASTRUCTURE
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

-- 2. TABLES
CREATE TABLE IF NOT EXISTS opportunities (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), niche TEXT NOT NULL, market TEXT NOT NULL DEFAULT 'North America', description TEXT NOT NULL DEFAULT '', score INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'discovered', scout_data JSONB NOT NULL DEFAULT '{}', queen_reasoning TEXT, approved_at TIMESTAMPTZ, rejected_at TIMESTAMPTZ, rejection_reason TEXT, campaign_id UUID);
CREATE TABLE IF NOT EXISTS campaigns (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), name TEXT NOT NULL, opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL, status TEXT NOT NULL DEFAULT 'idle', landing_page_url TEXT, stripe_product_id TEXT, stripe_price_id TEXT, stripe_payment_link TEXT, mrr INTEGER NOT NULL DEFAULT 0, customer_count INTEGER NOT NULL DEFAULT 0, target_mrr INTEGER NOT NULL DEFAULT 0, niche TEXT);
CREATE TABLE IF NOT EXISTS agent_tasks (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), task_type TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'pending', result JSONB, error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS hive_log (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), bee TEXT NOT NULL, action TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'success', telegram_message_id TEXT);

-- 3. TRIGGERS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'opportunities_updated_at') THEN CREATE TRIGGER opportunities_updated_at BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at(); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'campaigns_updated_at') THEN CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at(); END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'agent_tasks_updated_at') THEN CREATE TRIGGER agent_tasks_updated_at BEFORE UPDATE ON agent_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at(); END IF;
END $$;

-- 4. SECURITY (RLS & AUTHORITY)
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY; ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY; ALTER TABLE hive_log ENABLE ROW LEVEL SECURITY; ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;
GRANT ALL ON opportunities TO service_role; GRANT ALL ON campaigns TO service_role; GRANT ALL ON hive_log TO service_role; GRANT ALL ON agent_tasks TO service_role;
REVOKE ALL ON opportunities FROM PUBLIC, anon, authenticated; REVOKE ALL ON campaigns FROM PUBLIC, anon, authenticated; REVOKE ALL ON hive_log FROM PUBLIC, anon, authenticated; REVOKE ALL ON agent_tasks FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "service_full_access" ON opportunities; CREATE POLICY "service_full_access" ON opportunities FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_full_access" ON campaigns; CREATE POLICY "service_full_access" ON campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_full_access" ON hive_log; CREATE POLICY "service_full_access" ON hive_log FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_full_access" ON agent_tasks; CREATE POLICY "service_full_access" ON agent_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);
