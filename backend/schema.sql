-- ============================================================
--  TalentAI — PostgreSQL Schema
--  Run once: psql -U talentai_user -d talentai -f schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  role          VARCHAR(50)  DEFAULT 'admin' CHECK (role IN ('admin','recruiter','viewer')),
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        VARCHAR(255) NOT NULL,
  department   VARCHAR(100) NOT NULL,
  location     VARCHAR(255),
  type         VARCHAR(50)  DEFAULT 'Full-time',
  salary_min   INTEGER,
  salary_max   INTEGER,
  description  TEXT         NOT NULL,
  skills       JSONB        DEFAULT '[]',
  requirements JSONB        DEFAULT '[]',
  is_active    BOOLEAN      DEFAULT true,
  created_by   UUID         REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_department ON jobs(department);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active   ON jobs(is_active);

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id       UUID         NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Candidate info
  name         VARCHAR(255) NOT NULL,
  email        VARCHAR(255) NOT NULL,
  phone        VARCHAR(50),
  cover_letter TEXT,
  resume_text  TEXT         NOT NULL,

  -- AI screening results
  ai_score              INTEGER     CHECK (ai_score BETWEEN 0 AND 100),
  ai_verdict            VARCHAR(50),
  ai_summary            TEXT,
  ai_matched_skills     JSONB       DEFAULT '[]',
  ai_missing_skills     JSONB       DEFAULT '[]',
  ai_experience_years   NUMERIC(4,1),
  ai_strengths          JSONB       DEFAULT '[]',
  ai_concerns           JSONB       DEFAULT '[]',
  ai_recommendation     VARCHAR(50),
  ai_interview_questions JSONB      DEFAULT '[]',

  -- Recruiter workflow
  status           VARCHAR(50)  DEFAULT 'New',
  recruiter_notes  TEXT,

  UNIQUE (job_id, email),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apps_job_id  ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_apps_score   ON applications(ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_apps_rec     ON applications(ai_recommendation);
CREATE INDEX IF NOT EXISTS idx_apps_status  ON applications(status);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_jobs_updated_at ON jobs;
CREATE TRIGGER trg_jobs_updated_at  BEFORE UPDATE ON jobs  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_apps_updated_at ON applications;
CREATE TRIGGER trg_apps_updated_at  BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed sample jobs
INSERT INTO jobs (title,department,location,type,salary_min,salary_max,description,skills,requirements)
VALUES
(
  'Senior Frontend Engineer','Engineering','Remote · US','Full-time',140000,180000,
  'Lead development of our core product UI. Architect scalable component systems and mentor junior engineers.',
  '["React","TypeScript","GraphQL","CSS","Node.js"]',
  '["5+ years React","Strong TypeScript","GraphQL or REST","Testing frameworks","Design system experience"]'
),
(
  'ML Engineer — NLP','AI Research','San Francisco, CA','Full-time',160000,220000,
  'Build and deploy large language model pipelines. Take models from prototype to production.',
  '["Python","PyTorch","Transformers","LLMs","MLOps"]',
  '["3+ years ML engineering","Expertise in transformers","MLOps & model serving","PyTorch or JAX"]'
),
(
  'Product Manager — Platform','Product','New York, NY','Full-time',130000,165000,
  'Own the roadmap for our developer platform. Ship features that power thousands of integrations.',
  '["Product Strategy","Agile","SQL","User Research","Roadmapping"]',
  '["4+ years PM experience","Technical background","Data-driven decisions","B2B SaaS experience"]'
),
(
  'DevOps / Cloud Engineer','Infrastructure','Remote · Global','Full-time',120000,155000,
  'Design and maintain our cloud infrastructure on AWS. Drive reliability and cost optimization.',
  '["AWS","Kubernetes","Terraform","CI/CD","Python"]',
  '["AWS Solutions Architect","Kubernetes at scale","Terraform / Pulumi","Observability & incident response"]'
)
ON CONFLICT DO NOTHING;

SELECT 'Schema created and seed data inserted!' AS result;
