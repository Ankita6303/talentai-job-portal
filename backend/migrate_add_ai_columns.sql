-- ============================================================
--  TalentAI — Migration: Add AI screening columns
--  Run once against your existing database:
--    psql -U talentai_user -d talentai -f migrate_add_ai_columns.sql
-- ============================================================

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS ai_score              INTEGER      CHECK (ai_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS ai_verdict            VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ai_summary            TEXT,
  ADD COLUMN IF NOT EXISTS ai_matched_skills     JSONB        DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS ai_missing_skills     JSONB        DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS ai_experience_years   NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS ai_strengths          JSONB        DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS ai_concerns           JSONB        DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS ai_recommendation     VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ai_interview_questions JSONB       DEFAULT '[]';

-- Recreate indexes that depend on the new columns (safe to run if they already exist)
CREATE INDEX IF NOT EXISTS idx_apps_score ON applications(ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_apps_rec   ON applications(ai_recommendation);

SELECT 'Migration complete — AI columns added to applications.' AS result;