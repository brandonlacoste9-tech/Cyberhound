-- Migration 007: Fix schema cache drift + missing columns
-- Fixes PGRST204: 'approved_at', 'queen_reasoning', 'recommended_price_point' not found
-- Root cause: PostgREST schema cache out of sync with actual table state
-- Run this in Supabase SQL editor, then reload schema cache

-- opportunities — add any columns the hunt cron inserts that may be missing
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS approved_at        TIMESTAMPTZ;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS rejected_at        TIMESTAMPTZ;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS rejection_reason   TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS queen_reasoning    TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS demand_signals     TEXT[]  DEFAULT '{}';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS competition_level  TEXT    DEFAULT 'medium'
  CHECK (competition_level IN ('low', 'medium', 'high'));
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS estimated_mrr_potential  TEXT DEFAULT '$0';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS recommended_price_point  TEXT DEFAULT '$0';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS campaign_id        UUID;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS description        TEXT    NOT NULL DEFAULT '';

-- analyst_leads — ensure all columns the analyst cron writes exist
ALTER TABLE analyst_leads ADD COLUMN IF NOT EXISTS source             TEXT;
ALTER TABLE analyst_leads ADD COLUMN IF NOT EXISTS signal_type        TEXT;
ALTER TABLE analyst_leads ADD COLUMN IF NOT EXISTS title              TEXT;
ALTER TABLE analyst_leads ADD COLUMN IF NOT EXISTS url                TEXT;
ALTER TABLE analyst_leads ADD COLUMN IF NOT EXISTS raw_text           TEXT;
ALTER TABLE analyst_leads ADD COLUMN IF NOT EXISTS company            TEXT;
ALTER TABLE analyst_leads ADD COLUMN IF NOT EXISTS contact_name       TEXT;
ALTER TABLE analyst_leads ADD COLUMN IF NOT EXISTS contact_email      TEXT;
ALTER TABLE analyst_leads ADD COLUMN IF NOT EXISTS contact_linkedin   TEXT;
ALTER TABLE analyst_leads ADD COLUMN IF NOT EXISTS budget             TEXT;
ALTER TABLE analyst_leads ADD COLUMN IF NOT EXISTS pain_point         TEXT;
ALTER TABLE analyst_leads ADD COLUMN IF NOT EXISTS urgency            TEXT    DEFAULT 'medium';
ALTER TABLE analyst_leads ADD COLUMN IF NOT EXISTS recommended_service TEXT;
ALTER TABLE analyst_leads ADD COLUMN IF NOT EXISTS personalization_hook TEXT;
ALTER TABLE analyst_leads ADD COLUMN IF NOT EXISTS status             TEXT    DEFAULT 'new';

-- follow_up_sequences — ensure scheduler cron columns exist
ALTER TABLE follow_up_sequences ADD COLUMN IF NOT EXISTS lead_id          UUID;
ALTER TABLE follow_up_sequences ADD COLUMN IF NOT EXISTS campaign_id      UUID;
ALTER TABLE follow_up_sequences ADD COLUMN IF NOT EXISTS recipient_email  TEXT NOT NULL DEFAULT '';
ALTER TABLE follow_up_sequences ADD COLUMN IF NOT EXISTS recipient_name   TEXT NOT NULL DEFAULT '';
ALTER TABLE follow_up_sequences ADD COLUMN IF NOT EXISTS company          TEXT;
ALTER TABLE follow_up_sequences ADD COLUMN IF NOT EXISTS total_emails     INTEGER DEFAULT 3;
ALTER TABLE follow_up_sequences ADD COLUMN IF NOT EXISTS sent_count       INTEGER DEFAULT 0;
ALTER TABLE follow_up_sequences ADD COLUMN IF NOT EXISTS current_step     INTEGER DEFAULT 1;
ALTER TABLE follow_up_sequences ADD COLUMN IF NOT EXISTS next_send_at     TIMESTAMPTZ;
ALTER TABLE follow_up_sequences ADD COLUMN IF NOT EXISTS last_sent_at     TIMESTAMPTZ;
ALTER TABLE follow_up_sequences ADD COLUMN IF NOT EXISTS status           TEXT DEFAULT 'active'
  CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'failed'));
ALTER TABLE follow_up_sequences ADD COLUMN IF NOT EXISTS sequence         JSONB DEFAULT '[]';

-- outreach_log — columns used by closer v2 and analyst cron
ALTER TABLE outreach_log ADD COLUMN IF NOT EXISTS recipient_email   TEXT;
ALTER TABLE outreach_log ADD COLUMN IF NOT EXISTS recipient_name    TEXT;
ALTER TABLE outreach_log ADD COLUMN IF NOT EXISTS sequence_number   INTEGER;
ALTER TABLE outreach_log ADD COLUMN IF NOT EXISTS resend_id         TEXT;
ALTER TABLE outreach_log ADD COLUMN IF NOT EXISTS sequence          JSONB;
ALTER TABLE outreach_log ADD COLUMN IF NOT EXISTS recipient_count   INTEGER DEFAULT 0;
ALTER TABLE outreach_log ADD COLUMN IF NOT EXISTS recipients        JSONB   DEFAULT '[]';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analyst_leads_status    ON analyst_leads(status);
CREATE INDEX IF NOT EXISTS idx_analyst_leads_urgency   ON analyst_leads(urgency);
CREATE INDEX IF NOT EXISTS idx_analyst_leads_source    ON analyst_leads(source);
CREATE INDEX IF NOT EXISTS idx_follow_up_next_send     ON follow_up_sequences(next_send_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_opportunities_niche     ON opportunities(niche);

-- !! AFTER RUNNING THIS: go to Supabase Dashboard → Settings → API → Reload schema cache
-- This forces PostgREST to pick up all the new columns immediately
-- Without this step the PGRST204 errors will persist even after the migration runs
