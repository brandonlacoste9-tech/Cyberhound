-- Migration 004: Upgrade outreach_log for Closer Bee v2
-- Adds columns needed for signal-aware outreach sequences

-- Drop old constraints that block v2 inserts
ALTER TABLE outreach_log DROP CONSTRAINT IF EXISTS outreach_log_channel_check;

-- Add missing columns for Closer v2
ALTER TABLE outreach_log ADD COLUMN IF NOT EXISTS recipient_email TEXT;
ALTER TABLE outreach_log ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE outreach_log ADD COLUMN IF NOT EXISTS sequence_number INTEGER DEFAULT 1;
ALTER TABLE outreach_log ADD COLUMN IF NOT EXISTS resend_id TEXT;
ALTER TABLE outreach_log ADD COLUMN IF NOT EXISTS approval_id TEXT;
ALTER TABLE outreach_log ADD COLUMN IF NOT EXISTS recipient_count INTEGER DEFAULT 0;
ALTER TABLE outreach_log ADD COLUMN IF NOT EXISTS recipients JSONB DEFAULT '[]';
ALTER TABLE outreach_log ADD COLUMN IF NOT EXISTS sequence JSONB DEFAULT '[]';

-- Make old required columns optional for v2 compatibility
ALTER TABLE outreach_log ALTER COLUMN channel DROP NOT NULL;
ALTER TABLE outreach_log ALTER COLUMN channel SET DEFAULT 'email';
ALTER TABLE outreach_log ALTER COLUMN recipient DROP NOT NULL;
ALTER TABLE outreach_log ALTER COLUMN recipient SET DEFAULT '';
ALTER TABLE outreach_log ALTER COLUMN body DROP NOT NULL;
ALTER TABLE outreach_log ALTER COLUMN body SET DEFAULT '';

-- Add new status values
ALTER TABLE outreach_log DROP CONSTRAINT IF EXISTS outreach_log_status_check;
ALTER TABLE outreach_log ADD CONSTRAINT outreach_log_status_check
  CHECK (status IN ('queued', 'sent', 'opened', 'replied', 'converted', 'bounced', 'pending_approval', 'failed'));

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_outreach_log_approval_id ON outreach_log(approval_id);
CREATE INDEX IF NOT EXISTS idx_outreach_log_recipient_email ON outreach_log(recipient_email);
CREATE INDEX IF NOT EXISTS idx_outreach_log_resend_id ON outreach_log(resend_id);

-- Also extend hive_log bee constraint to include closer_v2
ALTER TABLE hive_log DROP CONSTRAINT IF EXISTS hive_log_bee_check;
ALTER TABLE hive_log ADD CONSTRAINT hive_log_bee_check
  CHECK (bee IN ('queen', 'scout', 'builder', 'closer', 'closer_v2', 'treasurer', 'analyst', 'enrich', 'scheduler', 'wasp'));
