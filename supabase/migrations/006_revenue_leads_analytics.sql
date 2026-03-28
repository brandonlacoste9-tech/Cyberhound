-- ============================================================
-- Migration 006: Revenue, Leads, Analytics, Referrals, Feedback
-- CyberHound v2.0 - Full Revenue Engine
-- ============================================================

-- ============================================================
-- 1. LEADS TABLE (inbound captures from landing pages)
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  phone TEXT,
  website TEXT,
  linkedin_url TEXT,
  source TEXT DEFAULT 'landing_page', -- landing_page | referral | cold_outreach
  status TEXT DEFAULT 'new',          -- new | contacted | qualified | closed_won | closed_lost
  score INTEGER DEFAULT 0,
  notes TEXT,
  meeting_booked_at TIMESTAMPTZ,
  meeting_url TEXT,
  enriched_data JSONB DEFAULT '{}',
  referral_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. REVENUE / PAYMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'usd',
  type TEXT DEFAULT 'one_time',       -- one_time | subscription
  status TEXT DEFAULT 'pending',      -- pending | paid | refunded | failed
  mrr_cents INTEGER DEFAULT 0,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. FUNNEL ANALYTICS (page views, clicks, conversions)
-- ============================================================
CREATE TABLE IF NOT EXISTS funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  event TEXT NOT NULL,                -- page_view | cta_click | form_submit | meeting_booked | payment
  properties JSONB DEFAULT '{}',
  ip TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. REFERRALS & AFFILIATES
-- ============================================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,   -- the referrer
  referral_code TEXT UNIQUE NOT NULL,
  commission_pct NUMERIC DEFAULT 20,
  total_referred INTEGER DEFAULT 0,
  total_earned_cents INTEGER DEFAULT 0,
  total_paid_cents INTEGER DEFAULT 0,
  stripe_connect_id TEXT,
  status TEXT DEFAULT 'active',       -- active | paused | paid_out
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. CUSTOMER ONBOARDING CHECKLIST
-- ============================================================
CREATE TABLE IF NOT EXISTS onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  step TEXT NOT NULL,                 -- welcome_email | setup_call | first_value | 30d_check
  status TEXT DEFAULT 'pending',      -- pending | sent | completed
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. FEEDBACK / SURVEYS
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  type TEXT DEFAULT 'post_purchase',  -- post_purchase | churn_exit | nps | feature_request
  rating INTEGER,                     -- 1-10
  why_bought TEXT,
  pain_points TEXT,
  feature_requests TEXT,
  nps_score INTEGER,
  raw JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. COMPETITOR INTEL
-- ============================================================
CREATE TABLE IF NOT EXISTS competitor_intel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  niche TEXT NOT NULL,
  competitor_name TEXT NOT NULL,
  competitor_url TEXT,
  pricing JSONB DEFAULT '{}',
  features JSONB DEFAULT '[]',
  weaknesses TEXT,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. EMAIL REPLY CLASSIFICATION
-- ============================================================
CREATE TABLE IF NOT EXISTS email_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  raw_body TEXT,
  from_email TEXT,
  classification TEXT,               -- interested | objection | not_interested | out_of_office | question
  sentiment TEXT,                    -- positive | neutral | negative
  suggested_reply TEXT,
  approved BOOLEAN DEFAULT FALSE,
  sent BOOLEAN DEFAULT FALSE,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. SLACK NOTIFICATIONS LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT DEFAULT 'slack',       -- slack | email | sms
  event_type TEXT NOT NULL,           -- high_score_opp | deal_closed | lead_captured | churn_risk
  payload JSONB DEFAULT '{}',
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. ADD COLUMNS TO CAMPAIGNS FOR PAYMENT LINKS
-- ============================================================
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS stripe_payment_link_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_link_url TEXT,
  ADD COLUMN IF NOT EXISTS calendly_url TEXT,
  ADD COLUMN IF NOT EXISTS lead_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_revenue_cents INTEGER DEFAULT 0;

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_revenue_campaign_id ON revenue(campaign_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_campaign_id ON funnel_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_event ON funnel_events(event);
CREATE INDEX IF NOT EXISTS idx_email_replies_lead_id ON email_replies(lead_id);
CREATE INDEX IF NOT EXISTS idx_competitor_intel_niche ON competitor_intel(niche);

-- ============================================================
-- UPDATED_AT trigger for leads
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
