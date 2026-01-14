-- Plagiarism Detection System
-- Migration: 20240320000000_plagiarism_detection.sql

-- Plagiarism check status
CREATE TYPE plagiarism_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'skipped'
);

-- Plagiarism reports table
CREATE TABLE IF NOT EXISTS plagiarism_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  status plagiarism_status NOT NULL DEFAULT 'pending',
  similarity_score DECIMAL(5,2),
  original_content_hash TEXT,
  check_provider TEXT DEFAULT 'internal',
  external_report_id TEXT,
  external_report_url TEXT,
  matches JSONB DEFAULT '[]',
  word_count INTEGER,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content fingerprints for internal comparison
CREATE TABLE IF NOT EXISTS content_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plagiarism settings per tenant
CREATE TABLE IF NOT EXISTS plagiarism_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  is_enabled BOOLEAN DEFAULT true,
  similarity_threshold DECIMAL(5,2) DEFAULT 25.00,
  check_against_web BOOLEAN DEFAULT false,
  check_against_database BOOLEAN DEFAULT true,
  external_provider TEXT,
  external_api_key_encrypted TEXT,
  auto_check_submissions BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plagiarism_reports_submission ON plagiarism_reports(submission_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_reports_tenant ON plagiarism_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_content_fingerprints_fingerprint ON content_fingerprints(fingerprint);
CREATE INDEX IF NOT EXISTS idx_content_fingerprints_submission ON content_fingerprints(submission_id);

-- Enable RLS
ALTER TABLE plagiarism_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE plagiarism_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reports
CREATE POLICY "Instructors can view plagiarism reports"
  ON plagiarism_reports FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

CREATE POLICY "System can manage reports"
  ON plagiarism_reports FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- RLS Policies for fingerprints (internal use only)
CREATE POLICY "Instructors can view fingerprints"
  ON content_fingerprints FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- RLS Policies for settings
CREATE POLICY "Admins can manage plagiarism settings"
  ON plagiarism_settings FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Instructors can view plagiarism settings"
  ON plagiarism_settings FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Function to generate text fingerprint using shingles
CREATE OR REPLACE FUNCTION generate_text_fingerprints(
  p_submission_id UUID,
  p_tenant_id UUID,
  p_text TEXT,
  p_shingle_size INTEGER DEFAULT 5
) RETURNS INTEGER AS $$
DECLARE
  v_words TEXT[];
  v_i INTEGER;
  v_shingle TEXT;
  v_count INTEGER := 0;
BEGIN
  -- Delete existing fingerprints for this submission
  DELETE FROM content_fingerprints WHERE submission_id = p_submission_id;

  -- Split text into words
  v_words := regexp_split_to_array(lower(regexp_replace(p_text, '[^a-zA-Z0-9\s]', '', 'g')), '\s+');

  -- Generate shingles (n-grams of words)
  FOR v_i IN 1..array_length(v_words, 1) - p_shingle_size + 1
  LOOP
    v_shingle := array_to_string(v_words[v_i:v_i + p_shingle_size - 1], ' ');

    INSERT INTO content_fingerprints (tenant_id, submission_id, fingerprint, chunk_index, chunk_text)
    VALUES (p_tenant_id, p_submission_id, md5(v_shingle), v_i, v_shingle);

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for similarity
CREATE OR REPLACE FUNCTION check_plagiarism_internal(
  p_submission_id UUID,
  p_tenant_id UUID
) RETURNS plagiarism_reports AS $$
DECLARE
  v_report plagiarism_reports;
  v_matches JSONB := '[]'::JSONB;
  v_total_chunks INTEGER;
  v_matched_chunks INTEGER := 0;
  v_similarity DECIMAL(5,2);
  v_match RECORD;
BEGIN
  -- Get total chunks for this submission
  SELECT COUNT(*) INTO v_total_chunks
  FROM content_fingerprints
  WHERE submission_id = p_submission_id;

  IF v_total_chunks = 0 THEN
    -- Create report with 0% similarity
    INSERT INTO plagiarism_reports (
      tenant_id, submission_id, status, similarity_score, matches, processed_at
    ) VALUES (
      p_tenant_id, p_submission_id, 'completed', 0, '[]', NOW()
    ) RETURNING * INTO v_report;

    RETURN v_report;
  END IF;

  -- Find matching fingerprints in other submissions
  FOR v_match IN
    SELECT
      other.submission_id as matching_submission_id,
      s.student_id as matching_student_id,
      u.full_name as matching_student_name,
      COUNT(DISTINCT current.fingerprint) as matched_count,
      array_agg(DISTINCT current.chunk_text) as matched_texts
    FROM content_fingerprints current
    JOIN content_fingerprints other ON current.fingerprint = other.fingerprint
    JOIN submissions s ON other.submission_id = s.id
    JOIN users u ON s.student_id = u.id
    WHERE current.submission_id = p_submission_id
      AND other.submission_id != p_submission_id
      AND other.tenant_id = p_tenant_id
    GROUP BY other.submission_id, s.student_id, u.full_name
    HAVING COUNT(DISTINCT current.fingerprint) > 3
    ORDER BY matched_count DESC
    LIMIT 10
  LOOP
    v_matched_chunks := GREATEST(v_matched_chunks, v_match.matched_count);

    v_matches := v_matches || jsonb_build_object(
      'submission_id', v_match.matching_submission_id,
      'student_id', v_match.matching_student_id,
      'student_name', v_match.matching_student_name,
      'matched_count', v_match.matched_count,
      'similarity', round((v_match.matched_count::DECIMAL / v_total_chunks) * 100, 2),
      'matched_texts', v_match.matched_texts[1:5]
    );
  END LOOP;

  -- Calculate overall similarity (highest match percentage)
  v_similarity := round((v_matched_chunks::DECIMAL / v_total_chunks) * 100, 2);

  -- Create or update report
  INSERT INTO plagiarism_reports (
    tenant_id, submission_id, status, similarity_score, matches, processed_at
  ) VALUES (
    p_tenant_id, p_submission_id, 'completed', v_similarity, v_matches, NOW()
  )
  ON CONFLICT (submission_id) WHERE tenant_id = p_tenant_id
  DO UPDATE SET
    status = 'completed',
    similarity_score = v_similarity,
    matches = v_matches,
    processed_at = NOW()
  RETURNING * INTO v_report;

  RETURN v_report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add unique constraint for one report per submission
CREATE UNIQUE INDEX IF NOT EXISTS idx_plagiarism_reports_unique_submission
  ON plagiarism_reports(tenant_id, submission_id);

-- Add comments
COMMENT ON TABLE plagiarism_reports IS 'Plagiarism check results for submissions';
COMMENT ON TABLE content_fingerprints IS 'Text fingerprints for similarity detection';
COMMENT ON TABLE plagiarism_settings IS 'Tenant-level plagiarism detection settings';
COMMENT ON FUNCTION generate_text_fingerprints IS 'Generates shingle-based fingerprints for text';
COMMENT ON FUNCTION check_plagiarism_internal IS 'Performs internal plagiarism check against database';
