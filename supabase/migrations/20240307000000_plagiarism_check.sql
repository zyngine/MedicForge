-- Plagiarism Check Schema
-- Tracks plagiarism check results for submissions

-- Plagiarism check status enum
CREATE TYPE plagiarism_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

-- Plagiarism checks table
CREATE TABLE plagiarism_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status plagiarism_status DEFAULT 'pending',
  similarity_score DECIMAL(5, 2), -- 0.00 to 100.00
  matches JSONB, -- Array of {source, similarity, snippet}
  original_content TEXT,
  word_count INTEGER,
  checked_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One check per submission (can re-check by updating)
  UNIQUE(submission_id)
);

-- Plagiarism sources (for comparing against)
CREATE TABLE plagiarism_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- submission, document, external
  source_id UUID, -- Reference to submission or document
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL, -- For quick duplicate detection
  word_count INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique content per tenant
  UNIQUE(tenant_id, content_hash)
);

-- Indexes
CREATE INDEX idx_plagiarism_checks_submission ON plagiarism_checks(submission_id);
CREATE INDEX idx_plagiarism_checks_status ON plagiarism_checks(status);
CREATE INDEX idx_plagiarism_sources_tenant ON plagiarism_sources(tenant_id);
CREATE INDEX idx_plagiarism_sources_hash ON plagiarism_sources(content_hash);

-- Update timestamp trigger
CREATE TRIGGER update_plagiarism_checks_updated_at
  BEFORE UPDATE ON plagiarism_checks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to add submission to plagiarism sources after grading
CREATE OR REPLACE FUNCTION add_submission_to_sources()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add completed/graded submissions
  IF NEW.status IN ('graded', 'returned') AND NEW.content IS NOT NULL THEN
    INSERT INTO plagiarism_sources (
      tenant_id,
      source_type,
      source_id,
      title,
      content,
      content_hash,
      word_count
    ) VALUES (
      NEW.tenant_id,
      'submission',
      NEW.id,
      COALESCE((SELECT title FROM assignments WHERE id = NEW.assignment_id), 'Submission'),
      NEW.content::TEXT,
      md5(NEW.content::TEXT),
      array_length(regexp_split_to_array(NEW.content::TEXT, '\s+'), 1)
    )
    ON CONFLICT (tenant_id, content_hash) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER add_submission_to_sources_trigger
  AFTER UPDATE ON submissions
  FOR EACH ROW
  WHEN (NEW.status IN ('graded', 'returned') AND OLD.status NOT IN ('graded', 'returned'))
  EXECUTE FUNCTION add_submission_to_sources();

-- RLS Policies

-- Plagiarism checks: Instructors can view and create
ALTER TABLE plagiarism_checks ENABLE ROW LEVEL SECURITY;

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

-- Plagiarism sources: Instructors only
ALTER TABLE plagiarism_sources ENABLE ROW LEVEL SECURITY;

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
