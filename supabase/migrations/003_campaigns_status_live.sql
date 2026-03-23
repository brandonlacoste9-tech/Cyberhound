-- Allow campaigns.status = 'live' (Builder Bee Stripe go-live)
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_status_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_status_check
  CHECK (status IN ('idle', 'hunting', 'building', 'closing', 'paused', 'live'));
