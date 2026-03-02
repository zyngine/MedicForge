-- Academic Integrity Monitoring Feature
-- Tracks suspicious behavior during exams and provides review interface

-- Integrity event types
CREATE TYPE integrity_event_type AS ENUM (
  'blur',           -- Window lost focus
  'focus',          -- Window regained focus (tracked for context)
  'copy',           -- Copy attempt
  'paste',          -- Paste attempt
  'cut',            -- Cut attempt
  'right_click',    -- Context menu opened
  'print',          -- Print attempt
  'screenshot',     -- Screenshot attempt (limited detection)
  'shortcut',       -- Suspicious keyboard shortcut
  'selection',      -- Text selection
  'resize',         -- Window resize (potential screen recording indicator)
  'devtools',       -- Developer tools opened
  'tab_hidden',     -- Tab became hidden
  'tab_visible'     -- Tab became visible
);

-- Suspicion level
CREATE TYPE suspicion_level AS ENUM ('low', 'medium', 'high');

-- Review decision
CREATE TYPE integrity_review_decision AS ENUM ('cleared', 'warning', 'violation');

-- Quiz integrity events table (individual events)
CREATE TABLE IF NOT EXISTS quiz_integrity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type integrity_event_type NOT NULL,
  event_data JSONB DEFAULT '{}', -- Additional event context (key pressed, etc.)
  question_id UUID REFERENCES quiz_questions(id) ON DELETE SET NULL, -- Question being viewed
  question_number INT, -- Question number at time of event
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  suspicion_level suspicion_level DEFAULT 'low',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quiz integrity summary table (per-attempt summary)
CREATE TABLE IF NOT EXISTS quiz_integrity_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID UNIQUE NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Event counts
  total_events INT DEFAULT 0,
  high_suspicion_events INT DEFAULT 0,
  medium_suspicion_events INT DEFAULT 0,
  low_suspicion_events INT DEFAULT 0,

  -- Specific event counts
  blur_count INT DEFAULT 0,
  copy_count INT DEFAULT 0,
  paste_count INT DEFAULT 0,
  right_click_count INT DEFAULT 0,
  shortcut_count INT DEFAULT 0,
  devtools_count INT DEFAULT 0,

  -- Flagging
  flagged BOOLEAN DEFAULT false,
  flagged_reason TEXT,
  flagged_at TIMESTAMPTZ,
  auto_flagged BOOLEAN DEFAULT false, -- Was flagged automatically by threshold

  -- Review
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  review_decision integrity_review_decision,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add integrity settings to exam templates
ALTER TABLE standardized_exam_templates
  ADD COLUMN IF NOT EXISTS integrity_monitoring_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_flag_threshold INT DEFAULT 5,
  ADD COLUMN IF NOT EXISTS prevent_copy_paste BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS block_right_click BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS warn_on_blur BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS lockdown_mode BOOLEAN DEFAULT false; -- Full lockdown browser-like mode

-- Add integrity settings to individual exams (can override template)
ALTER TABLE standardized_exams
  ADD COLUMN IF NOT EXISTS integrity_monitoring_enabled BOOLEAN,
  ADD COLUMN IF NOT EXISTS auto_flag_threshold INT,
  ADD COLUMN IF NOT EXISTS prevent_copy_paste BOOLEAN,
  ADD COLUMN IF NOT EXISTS block_right_click BOOLEAN,
  ADD COLUMN IF NOT EXISTS warn_on_blur BOOLEAN;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_integrity_events_attempt ON quiz_integrity_events(attempt_id);
CREATE INDEX IF NOT EXISTS idx_integrity_events_tenant ON quiz_integrity_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrity_events_user ON quiz_integrity_events(user_id);
CREATE INDEX IF NOT EXISTS idx_integrity_events_type ON quiz_integrity_events(event_type);
CREATE INDEX IF NOT EXISTS idx_integrity_events_timestamp ON quiz_integrity_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_integrity_events_suspicion ON quiz_integrity_events(suspicion_level) WHERE suspicion_level IN ('medium', 'high');

CREATE INDEX IF NOT EXISTS idx_integrity_summary_attempt ON quiz_integrity_summary(attempt_id);
CREATE INDEX IF NOT EXISTS idx_integrity_summary_tenant ON quiz_integrity_summary(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrity_summary_flagged ON quiz_integrity_summary(flagged) WHERE flagged = true;
CREATE INDEX IF NOT EXISTS idx_integrity_summary_reviewed ON quiz_integrity_summary(reviewed) WHERE reviewed = false;

-- RLS Policies for quiz_integrity_events
ALTER TABLE quiz_integrity_events ENABLE ROW LEVEL SECURITY;

-- Students can insert their own events (tracking)
CREATE POLICY "Students can insert own integrity events" ON quiz_integrity_events
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins and instructors can view events in their tenant
CREATE POLICY "Admins can view integrity events" ON quiz_integrity_events
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'instructor')
    )
  );

-- RLS Policies for quiz_integrity_summary
ALTER TABLE quiz_integrity_summary ENABLE ROW LEVEL SECURITY;

-- Students can view their own summary (limited)
CREATE POLICY "Students can view own integrity summary" ON quiz_integrity_summary
  FOR SELECT
  USING (user_id = auth.uid());

-- Admins and instructors can manage summaries
CREATE POLICY "Admins can manage integrity summaries" ON quiz_integrity_summary
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'instructor')
    )
  );

-- Grant access
GRANT SELECT, INSERT ON quiz_integrity_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON quiz_integrity_summary TO authenticated;

-- Function to record integrity event and update summary
CREATE OR REPLACE FUNCTION record_integrity_event(
  p_attempt_id UUID,
  p_tenant_id UUID,
  p_user_id UUID,
  p_event_type TEXT,
  p_event_data JSONB DEFAULT '{}',
  p_question_id UUID DEFAULT NULL,
  p_question_number INT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_suspicion suspicion_level;
  v_summary_id UUID;
  v_threshold INT;
  v_should_flag BOOLEAN := false;
  v_total_events INT;
BEGIN
  -- Determine suspicion level based on event type
  CASE p_event_type
    WHEN 'devtools' THEN v_suspicion := 'high';
    WHEN 'paste' THEN v_suspicion := 'high';
    WHEN 'copy' THEN v_suspicion := 'medium';
    WHEN 'cut' THEN v_suspicion := 'medium';
    WHEN 'shortcut' THEN v_suspicion := 'medium';
    WHEN 'blur' THEN v_suspicion := 'low';
    WHEN 'right_click' THEN v_suspicion := 'low';
    WHEN 'selection' THEN v_suspicion := 'low';
    ELSE v_suspicion := 'low';
  END CASE;

  -- Insert the event
  INSERT INTO quiz_integrity_events (
    attempt_id, tenant_id, user_id, event_type, event_data,
    question_id, question_number, suspicion_level
  ) VALUES (
    p_attempt_id, p_tenant_id, p_user_id, p_event_type::integrity_event_type,
    p_event_data, p_question_id, p_question_number, v_suspicion
  );

  -- Upsert summary record
  INSERT INTO quiz_integrity_summary (
    attempt_id, tenant_id, user_id, total_events,
    high_suspicion_events, medium_suspicion_events, low_suspicion_events,
    blur_count, copy_count, paste_count, right_click_count, shortcut_count, devtools_count
  ) VALUES (
    p_attempt_id, p_tenant_id, p_user_id, 1,
    CASE WHEN v_suspicion = 'high' THEN 1 ELSE 0 END,
    CASE WHEN v_suspicion = 'medium' THEN 1 ELSE 0 END,
    CASE WHEN v_suspicion = 'low' THEN 1 ELSE 0 END,
    CASE WHEN p_event_type = 'blur' THEN 1 ELSE 0 END,
    CASE WHEN p_event_type = 'copy' THEN 1 ELSE 0 END,
    CASE WHEN p_event_type = 'paste' THEN 1 ELSE 0 END,
    CASE WHEN p_event_type = 'right_click' THEN 1 ELSE 0 END,
    CASE WHEN p_event_type = 'shortcut' THEN 1 ELSE 0 END,
    CASE WHEN p_event_type = 'devtools' THEN 1 ELSE 0 END
  )
  ON CONFLICT (attempt_id) DO UPDATE SET
    total_events = quiz_integrity_summary.total_events + 1,
    high_suspicion_events = quiz_integrity_summary.high_suspicion_events +
      CASE WHEN v_suspicion = 'high' THEN 1 ELSE 0 END,
    medium_suspicion_events = quiz_integrity_summary.medium_suspicion_events +
      CASE WHEN v_suspicion = 'medium' THEN 1 ELSE 0 END,
    low_suspicion_events = quiz_integrity_summary.low_suspicion_events +
      CASE WHEN v_suspicion = 'low' THEN 1 ELSE 0 END,
    blur_count = quiz_integrity_summary.blur_count +
      CASE WHEN p_event_type = 'blur' THEN 1 ELSE 0 END,
    copy_count = quiz_integrity_summary.copy_count +
      CASE WHEN p_event_type = 'copy' THEN 1 ELSE 0 END,
    paste_count = quiz_integrity_summary.paste_count +
      CASE WHEN p_event_type = 'paste' THEN 1 ELSE 0 END,
    right_click_count = quiz_integrity_summary.right_click_count +
      CASE WHEN p_event_type = 'right_click' THEN 1 ELSE 0 END,
    shortcut_count = quiz_integrity_summary.shortcut_count +
      CASE WHEN p_event_type = 'shortcut' THEN 1 ELSE 0 END,
    devtools_count = quiz_integrity_summary.devtools_count +
      CASE WHEN p_event_type = 'devtools' THEN 1 ELSE 0 END,
    updated_at = NOW()
  RETURNING id, total_events INTO v_summary_id, v_total_events;

  -- Check if we should auto-flag based on threshold
  SELECT COALESCE(e.auto_flag_threshold, t.auto_flag_threshold, 5)
  INTO v_threshold
  FROM exam_attempts a
  JOIN standardized_exams e ON e.id = a.exam_id
  JOIN standardized_exam_templates t ON t.id = e.template_id
  WHERE a.id = p_attempt_id;

  -- Auto-flag if high suspicion events exceed threshold
  SELECT high_suspicion_events + medium_suspicion_events >= v_threshold
  INTO v_should_flag
  FROM quiz_integrity_summary
  WHERE id = v_summary_id;

  IF v_should_flag THEN
    UPDATE quiz_integrity_summary
    SET flagged = true,
        flagged_reason = 'Auto-flagged: exceeded event threshold (' || v_threshold || ')',
        flagged_at = NOW(),
        auto_flagged = true
    WHERE id = v_summary_id
    AND flagged = false;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'suspicion_level', v_suspicion::text,
    'total_events', v_total_events,
    'flagged', v_should_flag
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION record_integrity_event(UUID, UUID, UUID, TEXT, JSONB, UUID, INT) TO authenticated;

-- Function to get flagged attempts for review
CREATE OR REPLACE FUNCTION get_flagged_attempts(
  p_tenant_id UUID,
  p_reviewed BOOLEAN DEFAULT NULL, -- NULL = all, true = reviewed only, false = pending only
  p_exam_id UUID DEFAULT NULL
) RETURNS TABLE (
  attempt_id UUID,
  student_id UUID,
  student_name TEXT,
  student_email TEXT,
  exam_id UUID,
  exam_name TEXT,
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  total_events INT,
  high_suspicion_events INT,
  medium_suspicion_events INT,
  flagged_reason TEXT,
  flagged_at TIMESTAMPTZ,
  auto_flagged BOOLEAN,
  reviewed BOOLEAN,
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMPTZ,
  review_decision TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.attempt_id,
    s.user_id as student_id,
    u.full_name as student_name,
    u.email as student_email,
    a.exam_id,
    e.name as exam_name,
    a.started_at,
    a.submitted_at,
    s.total_events,
    s.high_suspicion_events,
    s.medium_suspicion_events,
    s.flagged_reason,
    s.flagged_at,
    s.auto_flagged,
    s.reviewed,
    r.full_name as reviewed_by_name,
    s.reviewed_at,
    s.review_decision::TEXT
  FROM quiz_integrity_summary s
  JOIN exam_attempts a ON a.id = s.attempt_id
  JOIN standardized_exams e ON e.id = a.exam_id
  JOIN users u ON u.id = s.user_id
  LEFT JOIN users r ON r.id = s.reviewed_by
  WHERE s.tenant_id = p_tenant_id
    AND s.flagged = true
    AND (p_reviewed IS NULL OR s.reviewed = p_reviewed)
    AND (p_exam_id IS NULL OR a.exam_id = p_exam_id)
  ORDER BY s.flagged_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION get_flagged_attempts(UUID, BOOLEAN, UUID) TO authenticated;

-- Function to review an attempt
CREATE OR REPLACE FUNCTION review_integrity_attempt(
  p_attempt_id UUID,
  p_reviewer_id UUID,
  p_decision TEXT,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
BEGIN
  UPDATE quiz_integrity_summary
  SET reviewed = true,
      reviewed_by = p_reviewer_id,
      reviewed_at = NOW(),
      review_decision = p_decision::integrity_review_decision,
      review_notes = p_notes,
      updated_at = NOW()
  WHERE attempt_id = p_attempt_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Attempt not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION review_integrity_attempt(UUID, UUID, TEXT, TEXT) TO authenticated;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_integrity_summary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS quiz_integrity_summary_updated_at ON quiz_integrity_summary;
CREATE TRIGGER quiz_integrity_summary_updated_at
  BEFORE UPDATE ON quiz_integrity_summary
  FOR EACH ROW
  EXECUTE FUNCTION update_integrity_summary_updated_at();
