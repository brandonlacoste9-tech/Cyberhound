-- ============================================================
-- CyberHound — Migration 002: Analyst Bee + Scheduler Bee
-- ============================================================

-- ── analyst_leads: warm interception signals ──────────────────
CREATE TABLE IF NOT EXISTS analyst_leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Signal metadata
  source          TEXT NOT NULL CHECK (source IN ('upwork', 'churn', 'reddit')),
  signal_type     TEXT NOT NULL,  -- 'upwork_job', 'bad_review', 'reddit_ask'
  title           TEXT NOT NULL,
  url             TEXT UNIQUE,    -- deduplicate by URL
  raw_text        TEXT,

  -- Contact info (pre-enrichment)
  company         TEXT,
  contact_name    TEXT,
  contact_email   TEXT,
  contact_linkedin TEXT,

  -- Signal intelligence
  budget          TEXT,
  pain_point      TEXT NOT NULL,
  urgency         TEXT NOT NULL DEFAULT 'medium' CHECK (urgency IN ('high', 'medium', 'low')),
  recommended_service TEXT NOT NULL,
  personalization_hook TEXT NOT NULL,

  -- Enrichment metadata
  enrichment_source TEXT CHECK (enrichment_source IN ('apollo', 'pattern', 'manual')),
  enrichment_confidence TEXT CHECK (enrichment_confidence IN ('high', 'medium', 'low')),

  -- Pipeline status
  status          TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new', 'enriched', 'queued', 'sent', 'replied', 'converted', 'skipped')),

  -- Linked campaign (if outreach was sent)
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE SET NULL
);

-- ── follow_up_sequences: Scheduler Bee ───────────────────────
CREATE TABLE IF NOT EXISTS follow_up_sequences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  lead_id         UUID REFERENCES analyst_leads(id) ON DELETE CASCADE,
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  recipient_email TEXT NOT NULL,
  recipient_name  TEXT,
  company         TEXT,

  -- Sequence tracking
  total_emails    INT NOT NULL DEFAULT 3,
  sent_count      INT NOT NULL DEFAULT 0,
  current_step    INT NOT NULL DEFAULT 1,

  -- Timing
  next_send_at    TIMESTAMPTZ,
  last_sent_at    TIMESTAMPTZ,

  -- Status
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'replied', 'unsubscribed', 'completed', 'paused')),

  -- Email sequence payload (JSON array of {subject, body, send_delay_days})
  sequence        JSONB NOT NULL DEFAULT '[]',

  -- Reply tracking
  replied_at      TIMESTAMPTZ,
  reply_content   TEXT
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_analyst_leads_status ON analyst_leads(status);
CREATE INDEX IF NOT EXISTS idx_analyst_leads_source ON analyst_leads(source);
CREATE INDEX IF NOT EXISTS idx_analyst_leads_urgency ON analyst_leads(urgency);
CREATE INDEX IF NOT EXISTS idx_analyst_leads_created ON analyst_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follow_up_next_send ON follow_up_sequences(next_send_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_follow_up_status ON follow_up_sequences(status);

-- ── Updated_at trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_analyst_leads_updated_at ON analyst_leads;
CREATE TRIGGER update_analyst_leads_updated_at
  BEFORE UPDATE ON analyst_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Extend hive_log bee type to include new bees ──────────────
-- (Safe: only adds new values, existing data unaffected)
ALTER TABLE hive_log DROP CONSTRAINT IF EXISTS hive_log_bee_check;
ALTER TABLE hive_log ADD CONSTRAINT hive_log_bee_check
  CHECK (bee IN ('queen', 'scout', 'builder', 'closer', 'treasurer', 'analyst', 'enrich', 'scheduler'));
