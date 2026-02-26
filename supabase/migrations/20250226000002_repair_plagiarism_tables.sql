-- Repair: Create plagiarism tables if they don't exist
-- This fixes migrations that were marked as applied but failed

-- Create enum if not exists
DO $$ BEGIN
  CREATE TYPE plagiarism_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Plagiarism checks table
CREATE TABLE IF NOT EXISTS plagiarism_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  similarity_score DECIMAL(5, 2),
  matches JSONB,
  original_content TEXT,
  word_count INTEGER,
  checked_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint if not exists
DO $$ BEGIN
  ALTER TABLE plagiarism_checks ADD CONSTRAINT plagiarism_checks_submission_id_key UNIQUE(submission_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Plagiarism sources table
CREATE TABLE IF NOT EXISTS plagiarism_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id UUID,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  word_count INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint if not exists
DO $$ BEGIN
  ALTER TABLE plagiarism_sources ADD CONSTRAINT plagiarism_sources_tenant_hash_key UNIQUE(tenant_id, content_hash);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_plagiarism_checks_submission ON plagiarism_checks(submission_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_checks_status ON plagiarism_checks(status);
CREATE INDEX IF NOT EXISTS idx_plagiarism_checks_tenant ON plagiarism_checks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_sources_tenant ON plagiarism_sources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_sources_hash ON plagiarism_sources(content_hash);
CREATE INDEX IF NOT EXISTS idx_plagiarism_sources_active ON plagiarism_sources(tenant_id, is_active);

-- RLS
ALTER TABLE plagiarism_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE plagiarism_sources ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Instructors can view plagiarism checks" ON plagiarism_checks;
DROP POLICY IF EXISTS "Instructors can create plagiarism checks" ON plagiarism_checks;
DROP POLICY IF EXISTS "Instructors can update plagiarism checks" ON plagiarism_checks;
DROP POLICY IF EXISTS "Instructors can view plagiarism sources" ON plagiarism_sources;
DROP POLICY IF EXISTS "Instructors can manage plagiarism sources" ON plagiarism_sources;

-- Plagiarism checks policies
CREATE POLICY "Instructors can view plagiarism checks"
  ON plagiarism_checks FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

CREATE POLICY "Instructors can create plagiarism checks"
  ON plagiarism_checks FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

CREATE POLICY "Instructors can update plagiarism checks"
  ON plagiarism_checks FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Plagiarism sources policies
CREATE POLICY "Instructors can view plagiarism sources"
  ON plagiarism_sources FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

CREATE POLICY "Instructors can manage plagiarism sources"
  ON plagiarism_sources FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );
