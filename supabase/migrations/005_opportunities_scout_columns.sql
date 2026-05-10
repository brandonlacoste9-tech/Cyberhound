-- Migration 005: Add Scout Bee columns to opportunities table
-- Scout v2 inserts structured intelligence fields

ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS demand_signals TEXT[] DEFAULT '{}';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS competition_level TEXT DEFAULT 'medium'
  CHECK (competition_level IN ('low', 'medium', 'high'));
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS estimated_mrr_potential TEXT DEFAULT '$0';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS recommended_price_point TEXT DEFAULT '$0';

-- Index for quick filtering by competition + score (used in auto-approve logic)
CREATE INDEX IF NOT EXISTS idx_opportunities_score_competition 
  ON opportunities(score DESC, competition_level);
