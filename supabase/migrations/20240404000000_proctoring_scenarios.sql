-- Secure Proctoring & Clinical Judgment Scenarios
-- Migration: 20240404000000_proctoring_scenarios.sql

-- ============================================
-- SECURE PROCTORING SYSTEM
-- ============================================

CREATE TYPE proctoring_type AS ENUM (
  'none',           -- No proctoring
  'lockdown',       -- Browser lockdown only
  'record',         -- Record webcam/screen
  'live',           -- Live proctor monitoring
  'ai_monitor'      -- AI-based monitoring
);

CREATE TYPE violation_type AS ENUM (
  'tab_switch',         -- Switched browser tabs
  'window_focus',       -- Lost window focus
  'copy_paste',         -- Copy/paste attempted
  'right_click',        -- Right-click attempted
  'keyboard_shortcut',  -- Suspicious keyboard shortcut
  'face_not_visible',   -- Face not detected
  'multiple_faces',     -- Multiple faces detected
  'audio_detected',     -- Suspicious audio
  'phone_detected',     -- Phone/device detected
  'screen_share',       -- Attempted screen share
  'browser_dev_tools',  -- Dev tools opened
  'vm_detected',        -- Virtual machine detected
  'other'
);

CREATE TYPE violation_severity AS ENUM (
  'warning',        -- Minor, may be accidental
  'moderate',       -- Concerning, noted
  'severe',         -- Serious, may invalidate
  'critical'        -- Exam should be invalidated
);

-- Proctoring sessions
CREATE TABLE IF NOT EXISTS proctoring_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  proctoring_type proctoring_type NOT NULL,

  -- Session info
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Environment checks
  environment_check JSONB DEFAULT '{}', -- {webcam, microphone, screen_share, browser}
  environment_approved BOOLEAN DEFAULT false,
  environment_issues TEXT[],

  -- Identity verification
  id_verified BOOLEAN DEFAULT false,
  id_verification_method TEXT, -- photo_match, live_check, document
  id_verification_data JSONB,

  -- Recording
  webcam_recording_url TEXT,
  screen_recording_url TEXT,
  audio_recording_url TEXT,
  recording_size_bytes BIGINT,

  -- Live proctor (if applicable)
  proctor_id UUID REFERENCES auth.users(id),
  proctor_notes TEXT,
  proctor_rating INTEGER, -- 1-5 rating of session integrity

  -- Final status
  status TEXT DEFAULT 'active', -- active, completed, terminated, invalidated
  integrity_score INTEGER, -- 0-100 score
  flags_count INTEGER DEFAULT 0,
  auto_invalidated BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proctoring violations/flags
CREATE TABLE IF NOT EXISTS proctoring_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES proctoring_sessions(id) ON DELETE CASCADE,
  violation_type violation_type NOT NULL,
  severity violation_severity NOT NULL,

  -- Details
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  screenshot_url TEXT,
  video_clip_url TEXT,

  -- AI detection data (if applicable)
  ai_confidence DECIMAL(5,4),
  ai_model_version TEXT,

  -- Review
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  false_positive BOOLEAN,
  reviewer_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proctoring settings per exam/tenant
CREATE TABLE IF NOT EXISTS proctoring_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES standardized_exams(id) ON DELETE CASCADE, -- NULL for tenant defaults

  -- Proctoring configuration
  proctoring_type proctoring_type NOT NULL DEFAULT 'lockdown',
  require_webcam BOOLEAN DEFAULT true,
  require_id_verification BOOLEAN DEFAULT false,
  record_screen BOOLEAN DEFAULT false,
  record_webcam BOOLEAN DEFAULT false,
  record_audio BOOLEAN DEFAULT false,

  -- Lockdown settings
  block_copy_paste BOOLEAN DEFAULT true,
  block_right_click BOOLEAN DEFAULT true,
  block_keyboard_shortcuts BOOLEAN DEFAULT true,
  block_new_tabs BOOLEAN DEFAULT true,
  detect_vm BOOLEAN DEFAULT true,
  fullscreen_required BOOLEAN DEFAULT true,

  -- AI monitoring settings
  face_detection BOOLEAN DEFAULT false,
  multiple_face_detection BOOLEAN DEFAULT false,
  phone_detection BOOLEAN DEFAULT false,
  audio_monitoring BOOLEAN DEFAULT false,

  -- Violation thresholds
  warning_threshold INTEGER DEFAULT 3,  -- Warnings before action
  auto_submit_on_violations INTEGER,    -- Auto-submit after N violations
  auto_invalidate_threshold INTEGER,    -- Violations to auto-invalidate

  -- Allowed resources
  allowed_urls TEXT[],
  allow_calculator BOOLEAN DEFAULT false,
  allow_notes BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, exam_id)
);

-- ============================================
-- CLINICAL JUDGMENT SCENARIOS
-- ============================================

-- Scenario templates
CREATE TABLE IF NOT EXISTS scenario_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for system templates

  -- Basic info
  title TEXT NOT NULL,
  description TEXT,
  certification_level TEXT NOT NULL,
  scenario_type TEXT NOT NULL, -- medical, trauma, cardiac, respiratory, etc.

  -- Patient info
  patient_demographics JSONB DEFAULT '{}', -- {age, gender, chief_complaint}
  scene_info JSONB DEFAULT '{}', -- {location, time_of_day, hazards}
  history JSONB DEFAULT '{}', -- SAMPLE history, medications, allergies

  -- Initial presentation
  initial_presentation TEXT NOT NULL, -- What the student sees/hears on arrival
  initial_vitals JSONB, -- Starting vital signs

  -- Multimedia
  patient_image_url TEXT,
  scene_image_url TEXT,
  audio_url TEXT, -- Patient sounds, lung sounds, etc.

  -- Expected flow
  expected_duration_minutes INTEGER DEFAULT 15,
  ideal_path JSONB DEFAULT '[]', -- Optimal decision sequence

  -- Scoring
  max_score INTEGER DEFAULT 100,
  passing_score INTEGER DEFAULT 70,

  -- Metadata
  difficulty question_difficulty DEFAULT 'medium',
  nremt_category_id UUID REFERENCES nremt_categories(id),
  is_system_template BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scenario decision points (branching logic)
CREATE TABLE IF NOT EXISTS scenario_decision_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenario_templates(id) ON DELETE CASCADE,
  parent_point_id UUID REFERENCES scenario_decision_points(id), -- NULL for root

  -- Point info
  sequence_order INTEGER NOT NULL,
  point_type TEXT NOT NULL, -- assessment, intervention, communication, disposition
  prompt TEXT NOT NULL, -- What to present to student
  context_update TEXT, -- New information revealed at this point

  -- Vital signs update (if applicable)
  vitals_update JSONB,

  -- Time simulation
  time_elapsed_minutes INTEGER DEFAULT 0, -- Time that passes reaching this point

  -- Media
  image_url TEXT,
  audio_url TEXT,
  video_url TEXT,

  -- Scoring
  points_possible INTEGER DEFAULT 10,
  is_critical BOOLEAN DEFAULT false, -- Must get this right

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decision options at each point
CREATE TABLE IF NOT EXISTS scenario_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_point_id UUID NOT NULL REFERENCES scenario_decision_points(id) ON DELETE CASCADE,

  -- Option details
  option_text TEXT NOT NULL,
  option_type TEXT NOT NULL, -- correct, acceptable, suboptimal, incorrect, harmful

  -- Scoring
  points_awarded INTEGER DEFAULT 0,
  is_best_choice BOOLEAN DEFAULT false,

  -- Consequences
  feedback TEXT, -- Immediate feedback
  consequence_text TEXT, -- What happens as a result
  next_point_id UUID REFERENCES scenario_decision_points(id), -- Where this leads

  -- Patient state changes
  patient_response JSONB, -- How patient responds
  vitals_change JSONB, -- Vital sign changes

  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SCENARIO ATTEMPTS
-- ============================================

CREATE TABLE IF NOT EXISTS scenario_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES scenario_templates(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_attempt_id UUID REFERENCES exam_attempts(id), -- If part of standardized exam

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_used_seconds INTEGER DEFAULT 0,
  simulated_time_elapsed INTEGER DEFAULT 0, -- In-scenario time

  -- Current state
  current_point_id UUID REFERENCES scenario_decision_points(id),
  patient_status TEXT DEFAULT 'stable', -- stable, deteriorating, improving, deceased

  -- Results
  score INTEGER,
  passed BOOLEAN,
  critical_failures TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decisions made during scenario
CREATE TABLE IF NOT EXISTS scenario_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES scenario_attempts(id) ON DELETE CASCADE,
  decision_point_id UUID NOT NULL REFERENCES scenario_decision_points(id),
  selected_option_id UUID NOT NULL REFERENCES scenario_options(id),

  -- Timing
  decision_time TIMESTAMPTZ DEFAULT NOW(),
  time_spent_seconds INTEGER,

  -- Scoring
  points_earned INTEGER,
  was_correct BOOLEAN,
  was_critical_point BOOLEAN,

  -- State at decision
  patient_vitals_at_decision JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SCENARIO RESULTS
-- ============================================

CREATE TABLE IF NOT EXISTS scenario_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES scenario_attempts(id) ON DELETE CASCADE UNIQUE,

  -- Scoring
  total_score INTEGER NOT NULL,
  max_possible_score INTEGER NOT NULL,
  percentage_score DECIMAL(5,2),
  passed BOOLEAN NOT NULL,

  -- Breakdown
  assessment_score INTEGER,
  intervention_score INTEGER,
  communication_score INTEGER,
  time_management_score INTEGER,

  -- Critical analysis
  critical_points_passed INTEGER DEFAULT 0,
  critical_points_failed INTEGER DEFAULT 0,
  critical_failures TEXT[],

  -- Patient outcome
  patient_outcome TEXT, -- survived, survived_complications, died
  optimal_path_followed BOOLEAN,

  -- Detailed feedback
  strengths TEXT[],
  areas_for_improvement TEXT[],
  recommended_review_topics TEXT[],

  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Calculate proctoring integrity score
CREATE OR REPLACE FUNCTION calculate_integrity_score(p_session_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 100;
  v_violation RECORD;
BEGIN
  FOR v_violation IN
    SELECT severity, COUNT(*) as cnt
    FROM proctoring_violations
    WHERE session_id = p_session_id
      AND (false_positive IS NULL OR false_positive = false)
    GROUP BY severity
  LOOP
    CASE v_violation.severity
      WHEN 'warning' THEN v_score := v_score - (v_violation.cnt * 2);
      WHEN 'moderate' THEN v_score := v_score - (v_violation.cnt * 5);
      WHEN 'severe' THEN v_score := v_score - (v_violation.cnt * 15);
      WHEN 'critical' THEN v_score := v_score - (v_violation.cnt * 30);
    END CASE;
  END LOOP;

  -- Update session
  UPDATE proctoring_sessions
  SET integrity_score = GREATEST(0, v_score)
  WHERE id = p_session_id;

  RETURN GREATEST(0, v_score);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate scenario result
CREATE OR REPLACE FUNCTION calculate_scenario_result(p_attempt_id UUID)
RETURNS scenario_results AS $$
DECLARE
  v_attempt scenario_attempts;
  v_scenario scenario_templates;
  v_result scenario_results;
  v_total_score INTEGER := 0;
  v_max_score INTEGER := 0;
  v_critical_passed INTEGER := 0;
  v_critical_failed INTEGER := 0;
  v_critical_failures TEXT[] := '{}';
BEGIN
  SELECT * INTO v_attempt FROM scenario_attempts WHERE id = p_attempt_id;
  SELECT * INTO v_scenario FROM scenario_templates WHERE id = v_attempt.scenario_id;

  -- Calculate scores from decisions
  SELECT
    SUM(sd.points_earned),
    SUM(sdp.points_possible),
    COUNT(*) FILTER (WHERE sdp.is_critical AND sd.was_correct),
    COUNT(*) FILTER (WHERE sdp.is_critical AND NOT sd.was_correct),
    array_agg(sdp.prompt) FILTER (WHERE sdp.is_critical AND NOT sd.was_correct)
  INTO v_total_score, v_max_score, v_critical_passed, v_critical_failed, v_critical_failures
  FROM scenario_decisions sd
  JOIN scenario_decision_points sdp ON sd.decision_point_id = sdp.id
  WHERE sd.attempt_id = p_attempt_id;

  -- Insert result
  INSERT INTO scenario_results (
    attempt_id,
    total_score,
    max_possible_score,
    percentage_score,
    passed,
    critical_points_passed,
    critical_points_failed,
    critical_failures,
    patient_outcome,
    calculated_at
  ) VALUES (
    p_attempt_id,
    COALESCE(v_total_score, 0),
    COALESCE(v_max_score, v_scenario.max_score),
    CASE WHEN COALESCE(v_max_score, 1) > 0
      THEN round((COALESCE(v_total_score, 0)::DECIMAL / v_max_score) * 100, 2)
      ELSE 0 END,
    v_critical_failed = 0 AND
      (COALESCE(v_total_score, 0)::DECIMAL / NULLIF(v_max_score, 0) * 100) >= v_scenario.passing_score,
    COALESCE(v_critical_passed, 0),
    COALESCE(v_critical_failed, 0),
    COALESCE(v_critical_failures, '{}'),
    v_attempt.patient_status,
    NOW()
  )
  ON CONFLICT (attempt_id) DO UPDATE SET
    total_score = EXCLUDED.total_score,
    max_possible_score = EXCLUDED.max_possible_score,
    percentage_score = EXCLUDED.percentage_score,
    passed = EXCLUDED.passed,
    critical_points_passed = EXCLUDED.critical_points_passed,
    critical_points_failed = EXCLUDED.critical_points_failed,
    critical_failures = EXCLUDED.critical_failures,
    calculated_at = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_proctoring_sessions_attempt ON proctoring_sessions(attempt_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_violations_session ON proctoring_violations(session_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_settings_tenant ON proctoring_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scenario_templates_tenant ON scenario_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scenario_decision_points_scenario ON scenario_decision_points(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_options_point ON scenario_options(decision_point_id);
CREATE INDEX IF NOT EXISTS idx_scenario_attempts_scenario ON scenario_attempts(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_attempts_student ON scenario_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_scenario_decisions_attempt ON scenario_decisions(attempt_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE proctoring_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proctoring_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE proctoring_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_decision_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_results ENABLE ROW LEVEL SECURITY;

-- Proctoring sessions
CREATE POLICY "View proctoring sessions"
  ON proctoring_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM exam_attempts ea
      WHERE ea.id = proctoring_sessions.attempt_id
      AND (
        ea.student_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
      )
    )
  );

CREATE POLICY "Manage proctoring sessions"
  ON proctoring_sessions FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Proctoring violations
CREATE POLICY "View proctoring violations"
  ON proctoring_violations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proctoring_sessions ps
      JOIN exam_attempts ea ON ps.attempt_id = ea.id
      WHERE ps.id = proctoring_violations.session_id
      AND (
        ea.student_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
      )
    )
  );

-- Proctoring settings
CREATE POLICY "View proctoring settings"
  ON proctoring_settings FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Manage proctoring settings"
  ON proctoring_settings FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Scenario templates
CREATE POLICY "View scenario templates"
  ON scenario_templates FOR SELECT
  USING (
    is_system_template = true
    OR tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Manage scenario templates"
  ON scenario_templates FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Scenario decision points
CREATE POLICY "View decision points"
  ON scenario_decision_points FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scenario_templates st
      WHERE st.id = scenario_decision_points.scenario_id
      AND (st.is_system_template = true OR st.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
    )
  );

-- Scenario options
CREATE POLICY "View scenario options"
  ON scenario_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scenario_decision_points sdp
      JOIN scenario_templates st ON sdp.scenario_id = st.id
      WHERE sdp.id = scenario_options.decision_point_id
      AND (st.is_system_template = true OR st.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
    )
  );

-- Scenario attempts
CREATE POLICY "Students manage own attempts"
  ON scenario_attempts FOR ALL
  USING (student_id = auth.uid());

CREATE POLICY "Instructors view all attempts"
  ON scenario_attempts FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Scenario decisions
CREATE POLICY "View scenario decisions"
  ON scenario_decisions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scenario_attempts sa
      WHERE sa.id = scenario_decisions.attempt_id
      AND (
        sa.student_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
      )
    )
  );

-- Scenario results
CREATE POLICY "View scenario results"
  ON scenario_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scenario_attempts sa
      WHERE sa.id = scenario_results.attempt_id
      AND (
        sa.student_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
      )
    )
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE proctoring_sessions IS 'Exam proctoring session tracking';
COMMENT ON TABLE proctoring_violations IS 'Detected proctoring violations';
COMMENT ON TABLE proctoring_settings IS 'Proctoring configuration per exam/tenant';
COMMENT ON TABLE scenario_templates IS 'Clinical judgment scenario definitions';
COMMENT ON TABLE scenario_decision_points IS 'Branching decision points in scenarios';
COMMENT ON TABLE scenario_options IS 'Available options at each decision point';
COMMENT ON TABLE scenario_attempts IS 'Student scenario attempt sessions';
COMMENT ON TABLE scenario_decisions IS 'Decisions made during scenario';
COMMENT ON TABLE scenario_results IS 'Calculated scenario results';
COMMENT ON FUNCTION calculate_integrity_score IS 'Calculate proctoring integrity score';
COMMENT ON FUNCTION calculate_scenario_result IS 'Calculate scenario attempt results';
