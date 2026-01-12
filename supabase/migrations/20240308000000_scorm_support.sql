-- SCORM Support Schema
-- Enables importing and tracking SCORM packages (1.2 and 2004)

-- SCORM version enum
CREATE TYPE scorm_version AS ENUM (
  'scorm_1.2',
  'scorm_2004'
);

-- SCORM package status
CREATE TYPE scorm_package_status AS ENUM (
  'uploading',
  'processing',
  'ready',
  'error'
);

-- SCORM packages table
CREATE TABLE scorm_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  module_id UUID REFERENCES modules(id) ON DELETE SET NULL,

  -- Package info
  title TEXT NOT NULL,
  description TEXT,
  version scorm_version NOT NULL DEFAULT 'scorm_1.2',
  status scorm_package_status DEFAULT 'uploading',

  -- Manifest data from imsmanifest.xml
  manifest JSONB, -- Parsed manifest structure
  entry_point TEXT, -- Main HTML file to launch

  -- Storage
  storage_path TEXT NOT NULL, -- Path in Supabase Storage
  file_size BIGINT,

  -- Settings
  launch_mode TEXT DEFAULT 'normal', -- normal, browse, review
  max_attempts INTEGER, -- null = unlimited
  mastery_score DECIMAL(5, 2), -- Minimum score to pass
  time_limit INTEGER, -- In minutes

  -- Metadata
  uploaded_by UUID REFERENCES auth.users(id),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SCORM attempts (student interactions)
CREATE TABLE scorm_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES scorm_packages(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  attempt_number INTEGER NOT NULL DEFAULT 1,

  -- SCORM CMI data
  lesson_status TEXT, -- not attempted, incomplete, completed, passed, failed
  lesson_location TEXT, -- Bookmark location
  score_raw DECIMAL(10, 2),
  score_min DECIMAL(10, 2),
  score_max DECIMAL(10, 2),
  score_scaled DECIMAL(5, 4), -- SCORM 2004: -1 to 1

  -- Time tracking
  session_time INTEGER, -- In seconds
  total_time INTEGER, -- Cumulative time in seconds
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Full CMI data storage
  cmi_data JSONB, -- All CMI data for suspend/resume

  -- Interactions (for detailed tracking)
  interactions JSONB, -- Array of interaction records
  objectives JSONB, -- Array of objective records

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One attempt per package/student/attempt_number
  UNIQUE(package_id, student_id, attempt_number)
);

-- Indexes
CREATE INDEX idx_scorm_packages_tenant ON scorm_packages(tenant_id);
CREATE INDEX idx_scorm_packages_course ON scorm_packages(course_id);
CREATE INDEX idx_scorm_packages_status ON scorm_packages(status);
CREATE INDEX idx_scorm_attempts_package ON scorm_attempts(package_id);
CREATE INDEX idx_scorm_attempts_student ON scorm_attempts(student_id);
CREATE INDEX idx_scorm_attempts_status ON scorm_attempts(lesson_status);

-- Update timestamp trigger
CREATE TRIGGER update_scorm_packages_updated_at
  BEFORE UPDATE ON scorm_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scorm_attempts_updated_at
  BEFORE UPDATE ON scorm_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get or create a SCORM attempt
CREATE OR REPLACE FUNCTION get_or_create_scorm_attempt(
  p_package_id UUID,
  p_student_id UUID,
  p_tenant_id UUID
) RETURNS scorm_attempts AS $$
DECLARE
  v_attempt scorm_attempts;
  v_package scorm_packages;
  v_attempt_count INTEGER;
BEGIN
  -- Get package info
  SELECT * INTO v_package
  FROM scorm_packages
  WHERE id = p_package_id AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Package not found';
  END IF;

  -- Look for an incomplete attempt
  SELECT * INTO v_attempt
  FROM scorm_attempts
  WHERE package_id = p_package_id
    AND student_id = p_student_id
    AND (lesson_status IS NULL OR lesson_status IN ('not attempted', 'incomplete'))
  ORDER BY attempt_number DESC
  LIMIT 1;

  IF FOUND THEN
    -- Update last accessed
    UPDATE scorm_attempts
    SET last_accessed_at = NOW()
    WHERE id = v_attempt.id
    RETURNING * INTO v_attempt;

    RETURN v_attempt;
  END IF;

  -- Check if we can create a new attempt
  SELECT COUNT(*) INTO v_attempt_count
  FROM scorm_attempts
  WHERE package_id = p_package_id AND student_id = p_student_id;

  IF v_package.max_attempts IS NOT NULL AND v_attempt_count >= v_package.max_attempts THEN
    -- Return the last attempt if max reached
    SELECT * INTO v_attempt
    FROM scorm_attempts
    WHERE package_id = p_package_id AND student_id = p_student_id
    ORDER BY attempt_number DESC
    LIMIT 1;

    RETURN v_attempt;
  END IF;

  -- Create new attempt
  INSERT INTO scorm_attempts (
    tenant_id, package_id, student_id, attempt_number, lesson_status
  ) VALUES (
    p_tenant_id, p_package_id, p_student_id, v_attempt_count + 1, 'not attempted'
  ) RETURNING * INTO v_attempt;

  RETURN v_attempt;
END;
$$ LANGUAGE plpgsql;

-- Function to save SCORM data
CREATE OR REPLACE FUNCTION save_scorm_data(
  p_attempt_id UUID,
  p_cmi_data JSONB
) RETURNS scorm_attempts AS $$
DECLARE
  v_attempt scorm_attempts;
BEGIN
  UPDATE scorm_attempts
  SET
    cmi_data = p_cmi_data,
    lesson_status = COALESCE(p_cmi_data->>'cmi.core.lesson_status', p_cmi_data->>'cmi.completion_status', lesson_status),
    lesson_location = COALESCE(p_cmi_data->>'cmi.core.lesson_location', p_cmi_data->>'cmi.location', lesson_location),
    score_raw = COALESCE((p_cmi_data->>'cmi.core.score.raw')::DECIMAL, (p_cmi_data->>'cmi.score.raw')::DECIMAL, score_raw),
    score_min = COALESCE((p_cmi_data->>'cmi.core.score.min')::DECIMAL, (p_cmi_data->>'cmi.score.min')::DECIMAL, score_min),
    score_max = COALESCE((p_cmi_data->>'cmi.core.score.max')::DECIMAL, (p_cmi_data->>'cmi.score.max')::DECIMAL, score_max),
    score_scaled = COALESCE((p_cmi_data->>'cmi.score.scaled')::DECIMAL, score_scaled),
    last_accessed_at = NOW(),
    completed_at = CASE
      WHEN COALESCE(p_cmi_data->>'cmi.core.lesson_status', p_cmi_data->>'cmi.completion_status') IN ('completed', 'passed', 'failed')
      THEN COALESCE(completed_at, NOW())
      ELSE completed_at
    END,
    updated_at = NOW()
  WHERE id = p_attempt_id
  RETURNING * INTO v_attempt;

  RETURN v_attempt;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies

-- SCORM packages: Instructors manage, students view for their courses
ALTER TABLE scorm_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View SCORM packages in tenant"
  ON scorm_packages FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Instructors manage SCORM packages"
  ON scorm_packages FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- SCORM attempts: Students manage own, instructors view all
ALTER TABLE scorm_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own attempts"
  ON scorm_attempts FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (
      student_id = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    )
  );

CREATE POLICY "Students create own attempts"
  ON scorm_attempts FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND student_id = auth.uid()
  );

CREATE POLICY "Students update own attempts"
  ON scorm_attempts FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND student_id = auth.uid()
  );
