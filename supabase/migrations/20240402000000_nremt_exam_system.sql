-- NREMT Standardized Exam System
-- Migration: 20240402000000_nremt_exam_system.sql

-- ============================================
-- STANDARDIZED EXAM TYPES
-- ============================================

CREATE TYPE standardized_exam_type AS ENUM (
  'entrance',           -- Pre-admission test
  'unit',              -- Module/unit exam
  'comprehensive',     -- Final readiness exam
  'practice',          -- Self-study practice
  'remediation'        -- Targeted remediation
);

CREATE TYPE exam_delivery_mode AS ENUM (
  'standard',          -- Fixed number of questions
  'adaptive'           -- Computer Adaptive Testing (CAT)
);

CREATE TYPE exam_security_level AS ENUM (
  'low',               -- Self-paced, no proctoring
  'medium',            -- Lockdown browser
  'high'               -- Full proctoring with monitoring
);

-- ============================================
-- STANDARDIZED EXAM TEMPLATES
-- ============================================

-- Exam templates define the structure of standardized exams
CREATE TABLE IF NOT EXISTS standardized_exam_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for system-wide templates
  name TEXT NOT NULL,
  description TEXT,
  exam_type standardized_exam_type NOT NULL,
  certification_level TEXT NOT NULL, -- EMR, EMT, AEMT, Paramedic
  delivery_mode exam_delivery_mode NOT NULL DEFAULT 'standard',
  security_level exam_security_level NOT NULL DEFAULT 'medium',

  -- Question configuration
  total_questions INTEGER NOT NULL DEFAULT 100,
  min_questions INTEGER, -- For CAT: minimum questions
  max_questions INTEGER, -- For CAT: maximum questions
  time_limit_minutes INTEGER,

  -- Category weights (must sum to 100)
  category_weights JSONB NOT NULL DEFAULT '{}', -- {category_code: percentage}

  -- Passing criteria
  passing_score DECIMAL(5,2) NOT NULL DEFAULT 70.00,
  cut_score_method TEXT DEFAULT 'percentage', -- percentage, irt_theta, modified_angoff

  -- CAT-specific settings
  cat_settings JSONB DEFAULT '{}', -- {initial_theta, se_threshold, etc.}

  -- Settings
  shuffle_questions BOOLEAN DEFAULT true,
  shuffle_options BOOLEAN DEFAULT true,
  show_results_immediately BOOLEAN DEFAULT false,
  show_correct_answers BOOLEAN DEFAULT false,
  allow_review BOOLEAN DEFAULT false,

  is_system_template BOOLEAN DEFAULT false, -- System-provided template
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- QUESTION BANK FOR STANDARDIZED EXAMS
-- ============================================

-- Questions calibrated for standardized testing
CREATE TABLE IF NOT EXISTS standardized_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for FISDAP-style shared bank

  -- Question content
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer JSONB NOT NULL,
  rationale TEXT,
  references TEXT[], -- Source materials

  -- Classification
  certification_level TEXT NOT NULL,
  nremt_category_id UUID REFERENCES nremt_categories(id),
  cognitive_level cognitive_level NOT NULL DEFAULT 'apply',
  difficulty question_difficulty NOT NULL DEFAULT 'medium',

  -- IRT Parameters (for CAT)
  irt_a DECIMAL(5,3), -- Discrimination parameter
  irt_b DECIMAL(5,3), -- Difficulty parameter
  irt_c DECIMAL(5,3), -- Guessing parameter

  -- Statistics
  times_used INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  average_time_seconds INTEGER,
  point_biserial DECIMAL(5,3), -- Item discrimination

  -- Metadata
  source TEXT, -- 'internal', 'imported', 'contributed'
  contributor_id UUID REFERENCES auth.users(id),
  review_status TEXT DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags for standardized questions
CREATE TABLE IF NOT EXISTS standardized_question_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES standardized_questions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES question_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id, tag_id)
);

-- ============================================
-- EXAM INSTANCES (Scheduled/Administered Exams)
-- ============================================

CREATE TABLE IF NOT EXISTS standardized_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES standardized_exam_templates(id),
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,

  -- Scheduling
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,

  -- Override template settings
  time_limit_override INTEGER,
  security_level_override exam_security_level,

  -- Generated question set (for non-CAT exams)
  question_ids UUID[] DEFAULT '{}',

  -- Status
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, active, closed
  created_by UUID NOT NULL REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EXAM ATTEMPTS (Student Sessions)
-- ============================================

CREATE TYPE attempt_status AS ENUM (
  'not_started',
  'in_progress',
  'submitted',
  'timed_out',
  'abandoned',
  'graded',
  'invalidated'
);

CREATE TABLE IF NOT EXISTS exam_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES standardized_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Attempt info
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status attempt_status NOT NULL DEFAULT 'not_started',

  -- Timing
  started_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  time_used_seconds INTEGER DEFAULT 0,

  -- CAT-specific tracking
  current_theta DECIMAL(5,3) DEFAULT 0, -- Current ability estimate
  standard_error DECIMAL(5,3),
  questions_administered INTEGER DEFAULT 0,

  -- Question sequence (for CAT, built dynamically)
  question_sequence UUID[] DEFAULT '{}',

  -- Proctoring
  proctoring_session_id TEXT,
  proctoring_violations JSONB DEFAULT '[]',

  -- Browser/device info
  user_agent TEXT,
  ip_address INET,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(exam_id, student_id, attempt_number)
);

-- ============================================
-- EXAM RESPONSES (Individual Answers)
-- ============================================

CREATE TABLE IF NOT EXISTS exam_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES standardized_questions(id),

  -- Response data
  sequence_number INTEGER NOT NULL,
  selected_answer JSONB,
  is_correct BOOLEAN,
  points_earned DECIMAL(5,2),

  -- Timing
  presented_at TIMESTAMPTZ NOT NULL,
  answered_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,

  -- CAT data
  theta_before DECIMAL(5,3),
  theta_after DECIMAL(5,3),
  information_value DECIMAL(5,3), -- Fisher information

  -- Flags
  flagged_for_review BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(attempt_id, question_id)
);

-- ============================================
-- EXAM RESULTS
-- ============================================

CREATE TABLE IF NOT EXISTS exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE UNIQUE,

  -- Scores
  raw_score DECIMAL(5,2),
  scaled_score DECIMAL(5,2), -- 0-100 scale
  theta_score DECIMAL(5,3), -- IRT ability estimate
  percentile INTEGER,

  -- Category breakdown
  category_scores JSONB DEFAULT '{}', -- {category_code: {correct, total, percentage}}

  -- Pass/Fail
  passed BOOLEAN,
  pass_probability DECIMAL(5,4), -- For predictive analytics

  -- Diagnostic info
  strengths TEXT[],
  weaknesses TEXT[],
  recommended_focus_areas TEXT[],

  -- Comparison data
  cohort_rank INTEGER,
  cohort_size INTEGER,
  national_percentile INTEGER, -- If national norms available

  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NREMT PASS PREDICTION
-- ============================================

CREATE TABLE IF NOT EXISTS nremt_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

  -- Prediction data
  prediction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  pass_probability DECIMAL(5,4) NOT NULL,
  confidence_interval_low DECIMAL(5,4),
  confidence_interval_high DECIMAL(5,4),

  -- Input factors
  factors JSONB NOT NULL DEFAULT '{}', -- {exam_scores, completion_rate, attendance, etc.}

  -- Model info
  model_version TEXT,

  -- Recommendations
  risk_level TEXT, -- low, medium, high
  recommended_actions TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(student_id, course_id, prediction_date)
);

-- ============================================
-- CAT ALGORITHM FUNCTIONS
-- ============================================

-- Function to select next CAT question
CREATE OR REPLACE FUNCTION select_next_cat_question(
  p_attempt_id UUID,
  p_current_theta DECIMAL,
  p_administered_questions UUID[]
) RETURNS UUID AS $$
DECLARE
  v_attempt exam_attempts;
  v_exam standardized_exams;
  v_template standardized_exam_templates;
  v_next_question_id UUID;
  v_category_code TEXT;
  v_category_weights JSONB;
  v_current_category_counts JSONB;
BEGIN
  -- Get attempt, exam, and template info
  SELECT * INTO v_attempt FROM exam_attempts WHERE id = p_attempt_id;
  SELECT * INTO v_exam FROM standardized_exams WHERE id = v_attempt.exam_id;
  SELECT * INTO v_template FROM standardized_exam_templates WHERE id = v_exam.template_id;

  v_category_weights := v_template.category_weights;

  -- Calculate current category distribution
  SELECT jsonb_object_agg(nc.code, COALESCE(counts.cnt, 0))
  INTO v_current_category_counts
  FROM nremt_categories nc
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as cnt
    FROM exam_responses er
    JOIN standardized_questions sq ON er.question_id = sq.id
    WHERE er.attempt_id = p_attempt_id
      AND sq.nremt_category_id = nc.id
  ) counts ON true
  WHERE nc.certification_level = v_template.certification_level;

  -- Find under-represented category
  SELECT category INTO v_category_code
  FROM (
    SELECT
      key as category,
      (value::DECIMAL - COALESCE((v_current_category_counts->>key)::DECIMAL /
        NULLIF(v_attempt.questions_administered, 0) * 100, 0)) as deficit
    FROM jsonb_each_text(v_category_weights)
  ) deficits
  ORDER BY deficit DESC
  LIMIT 1;

  -- Select question with maximum information at current theta
  SELECT sq.id INTO v_next_question_id
  FROM standardized_questions sq
  JOIN nremt_categories nc ON sq.nremt_category_id = nc.id
  WHERE sq.certification_level = v_template.certification_level
    AND nc.code = v_category_code
    AND sq.is_active = true
    AND sq.review_status = 'approved'
    AND sq.id != ALL(p_administered_questions)
    AND sq.irt_a IS NOT NULL
    AND sq.irt_b IS NOT NULL
  ORDER BY
    -- Maximum information criterion: I(theta) = a^2 * P * Q
    sq.irt_a * sq.irt_a *
      (1 / (1 + exp(-1.7 * sq.irt_a * (p_current_theta - sq.irt_b)))) *
      (1 - 1 / (1 + exp(-1.7 * sq.irt_a * (p_current_theta - sq.irt_b)))) DESC
  LIMIT 1;

  -- Fallback: if no question found in target category, pick from any category
  IF v_next_question_id IS NULL THEN
    SELECT sq.id INTO v_next_question_id
    FROM standardized_questions sq
    WHERE sq.certification_level = v_template.certification_level
      AND sq.is_active = true
      AND sq.id != ALL(p_administered_questions)
    ORDER BY RANDOM()
    LIMIT 1;
  END IF;

  RETURN v_next_question_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update theta after response (EAP estimation)
CREATE OR REPLACE FUNCTION update_cat_theta(
  p_attempt_id UUID,
  p_question_id UUID,
  p_is_correct BOOLEAN
) RETURNS DECIMAL AS $$
DECLARE
  v_question standardized_questions;
  v_current_theta DECIMAL;
  v_new_theta DECIMAL;
  v_a DECIMAL;
  v_b DECIMAL;
  v_c DECIMAL;
  v_p DECIMAL;
  v_info DECIMAL;
BEGIN
  -- Get question IRT parameters
  SELECT * INTO v_question FROM standardized_questions WHERE id = p_question_id;

  -- Get current theta
  SELECT current_theta INTO v_current_theta FROM exam_attempts WHERE id = p_attempt_id;

  v_a := COALESCE(v_question.irt_a, 1.0);
  v_b := COALESCE(v_question.irt_b, 0.0);
  v_c := COALESCE(v_question.irt_c, 0.25); -- Guessing parameter for MC

  -- Calculate probability of correct response (3PL model)
  v_p := v_c + (1 - v_c) / (1 + exp(-1.7 * v_a * (v_current_theta - v_b)));

  -- Calculate information
  v_info := v_a * v_a * ((v_p - v_c) / (1 - v_c))^2 * (1 - v_p) / v_p;

  -- Update theta using EAP-like step
  IF p_is_correct THEN
    v_new_theta := v_current_theta + (1 - v_p) / (1 + v_info);
  ELSE
    v_new_theta := v_current_theta - v_p / (1 + v_info);
  END IF;

  -- Constrain theta to reasonable bounds (-4 to 4)
  v_new_theta := GREATEST(-4, LEAST(4, v_new_theta));

  -- Update attempt
  UPDATE exam_attempts
  SET
    current_theta = v_new_theta,
    standard_error = 1 / sqrt(1 + v_info), -- Simplified SE estimate
    questions_administered = questions_administered + 1
  WHERE id = p_attempt_id;

  RETURN v_new_theta;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if CAT should terminate
CREATE OR REPLACE FUNCTION should_terminate_cat(
  p_attempt_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_attempt exam_attempts;
  v_template standardized_exam_templates;
  v_exam standardized_exams;
  v_se_threshold DECIMAL;
  v_min_questions INTEGER;
  v_max_questions INTEGER;
BEGIN
  SELECT * INTO v_attempt FROM exam_attempts WHERE id = p_attempt_id;
  SELECT * INTO v_exam FROM standardized_exams WHERE id = v_attempt.exam_id;
  SELECT * INTO v_template FROM standardized_exam_templates WHERE id = v_exam.template_id;

  v_se_threshold := COALESCE((v_template.cat_settings->>'se_threshold')::DECIMAL, 0.30);
  v_min_questions := COALESCE(v_template.min_questions, 75);
  v_max_questions := COALESCE(v_template.max_questions, 150);

  -- Check termination conditions
  -- 1. Maximum questions reached
  IF v_attempt.questions_administered >= v_max_questions THEN
    RETURN true;
  END IF;

  -- 2. Minimum questions met AND standard error below threshold
  IF v_attempt.questions_administered >= v_min_questions
     AND v_attempt.standard_error <= v_se_threshold THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate exam result
CREATE OR REPLACE FUNCTION calculate_exam_result(p_attempt_id UUID)
RETURNS exam_results AS $$
DECLARE
  v_attempt exam_attempts;
  v_exam standardized_exams;
  v_template standardized_exam_templates;
  v_result exam_results;
  v_total_questions INTEGER;
  v_correct_count INTEGER;
  v_raw_score DECIMAL;
  v_category_scores JSONB;
  v_passed BOOLEAN;
BEGIN
  SELECT * INTO v_attempt FROM exam_attempts WHERE id = p_attempt_id;
  SELECT * INTO v_exam FROM standardized_exams WHERE id = v_attempt.exam_id;
  SELECT * INTO v_template FROM standardized_exam_templates WHERE id = v_exam.template_id;

  -- Count correct answers
  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_correct)
  INTO v_total_questions, v_correct_count
  FROM exam_responses
  WHERE attempt_id = p_attempt_id;

  v_raw_score := CASE WHEN v_total_questions > 0
    THEN (v_correct_count::DECIMAL / v_total_questions) * 100
    ELSE 0 END;

  -- Calculate category scores
  SELECT jsonb_object_agg(
    nc.code,
    jsonb_build_object(
      'correct', COALESCE(scores.correct_count, 0),
      'total', COALESCE(scores.total_count, 0),
      'percentage', CASE WHEN COALESCE(scores.total_count, 0) > 0
        THEN round((scores.correct_count::DECIMAL / scores.total_count) * 100, 1)
        ELSE 0 END
    )
  )
  INTO v_category_scores
  FROM nremt_categories nc
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*) as total_count,
      COUNT(*) FILTER (WHERE er.is_correct) as correct_count
    FROM exam_responses er
    JOIN standardized_questions sq ON er.question_id = sq.id
    WHERE er.attempt_id = p_attempt_id
      AND sq.nremt_category_id = nc.id
  ) scores ON true
  WHERE nc.certification_level = v_template.certification_level;

  -- Determine pass/fail
  v_passed := CASE v_template.cut_score_method
    WHEN 'percentage' THEN v_raw_score >= v_template.passing_score
    WHEN 'irt_theta' THEN v_attempt.current_theta >= 0 -- Above average ability
    ELSE v_raw_score >= v_template.passing_score
  END;

  -- Insert or update result
  INSERT INTO exam_results (
    attempt_id,
    raw_score,
    scaled_score,
    theta_score,
    category_scores,
    passed,
    calculated_at
  ) VALUES (
    p_attempt_id,
    v_raw_score,
    v_raw_score, -- For now, scaled = raw
    v_attempt.current_theta,
    v_category_scores,
    v_passed,
    NOW()
  )
  ON CONFLICT (attempt_id) DO UPDATE SET
    raw_score = EXCLUDED.raw_score,
    scaled_score = EXCLUDED.scaled_score,
    theta_score = EXCLUDED.theta_score,
    category_scores = EXCLUDED.category_scores,
    passed = EXCLUDED.passed,
    calculated_at = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_std_exam_templates_tenant ON standardized_exam_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_std_exam_templates_type ON standardized_exam_templates(exam_type);
CREATE INDEX IF NOT EXISTS idx_std_questions_tenant ON standardized_questions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_std_questions_category ON standardized_questions(nremt_category_id);
CREATE INDEX IF NOT EXISTS idx_std_questions_level ON standardized_questions(certification_level);
CREATE INDEX IF NOT EXISTS idx_std_questions_difficulty ON standardized_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_std_exams_tenant ON standardized_exams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_std_exams_course ON standardized_exams(course_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam ON exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_student ON exam_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_responses_attempt ON exam_responses(attempt_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_attempt ON exam_results(attempt_id);
CREATE INDEX IF NOT EXISTS idx_nremt_predictions_student ON nremt_predictions(student_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE standardized_exam_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE standardized_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE standardized_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE nremt_predictions ENABLE ROW LEVEL SECURITY;

-- Templates: System templates visible to all, tenant templates to tenant users
CREATE POLICY "View exam templates"
  ON standardized_exam_templates FOR SELECT
  USING (
    is_system_template = true
    OR tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Manage exam templates"
  ON standardized_exam_templates FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Questions: Shared bank or tenant-specific
CREATE POLICY "View standardized questions"
  ON standardized_questions FOR SELECT
  USING (
    tenant_id IS NULL -- Shared bank
    OR tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Manage standardized questions"
  ON standardized_questions FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Exams
CREATE POLICY "View exams"
  ON standardized_exams FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Manage exams"
  ON standardized_exams FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Attempts
CREATE POLICY "Students view own attempts"
  ON exam_attempts FOR SELECT
  USING (
    student_id = auth.uid()
    OR (
      tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
      AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    )
  );

CREATE POLICY "Students manage own attempts"
  ON exam_attempts FOR ALL
  USING (student_id = auth.uid());

-- Responses
CREATE POLICY "View exam responses"
  ON exam_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM exam_attempts ea
      WHERE ea.id = exam_responses.attempt_id
      AND (
        ea.student_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
      )
    )
  );

CREATE POLICY "Manage exam responses"
  ON exam_responses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM exam_attempts ea
      WHERE ea.id = exam_responses.attempt_id
      AND ea.student_id = auth.uid()
    )
  );

-- Results
CREATE POLICY "View exam results"
  ON exam_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM exam_attempts ea
      WHERE ea.id = exam_results.attempt_id
      AND (
        ea.student_id = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
      )
    )
  );

-- Predictions
CREATE POLICY "View own predictions"
  ON nremt_predictions FOR SELECT
  USING (
    student_id = auth.uid()
    OR (
      tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
      AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    )
  );

-- ============================================
-- SEED SYSTEM TEMPLATES
-- ============================================

INSERT INTO standardized_exam_templates (
  name, description, exam_type, certification_level, delivery_mode, security_level,
  total_questions, min_questions, max_questions, time_limit_minutes,
  category_weights, passing_score, is_system_template
) VALUES
-- EMT Entrance Exam
(
  'EMT Entrance Exam',
  'Pre-admission assessment to evaluate readiness for EMT training',
  'entrance', 'EMT', 'standard', 'medium',
  100, NULL, NULL, 120,
  '{"EMT-AIRWAY": 18, "EMT-CARDIO": 20, "EMT-TRAUMA": 14, "EMT-MEDICAL": 27, "EMT-OB": 7, "EMT-PEDS": 7, "EMT-OPS": 7}',
  70.00, true
),
-- EMT Comprehensive (CAT)
(
  'EMT Comprehensive Exam (CAT)',
  'Computer adaptive final exam simulating NREMT certification exam',
  'comprehensive', 'EMT', 'adaptive', 'high',
  NULL, 70, 120, 120,
  '{"EMT-AIRWAY": 18, "EMT-CARDIO": 20, "EMT-TRAUMA": 14, "EMT-MEDICAL": 27, "EMT-OB": 7, "EMT-PEDS": 7, "EMT-OPS": 7}',
  0, true -- For CAT, passing is theta >= 0
),
-- Paramedic Entrance Exam
(
  'Paramedic Entrance Exam',
  'Pre-admission assessment for paramedic candidates',
  'entrance', 'Paramedic', 'standard', 'medium',
  150, NULL, NULL, 180,
  '{"PM-AIRWAY": 18, "PM-CARDIO": 20, "PM-TRAUMA": 15, "PM-MEDICAL": 27, "PM-OB": 6, "PM-PEDS": 7, "PM-OPS": 7}',
  70.00, true
),
-- Paramedic Comprehensive (CAT)
(
  'Paramedic Comprehensive Exam (CAT)',
  'Computer adaptive final exam simulating NREMT certification exam',
  'comprehensive', 'Paramedic', 'adaptive', 'high',
  NULL, 80, 150, 150,
  '{"PM-AIRWAY": 18, "PM-CARDIO": 20, "PM-TRAUMA": 15, "PM-MEDICAL": 27, "PM-OB": 6, "PM-PEDS": 7, "PM-OPS": 7}',
  0, true
)
ON CONFLICT DO NOTHING;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE standardized_exam_templates IS 'Templates for standardized EMS exams';
COMMENT ON TABLE standardized_questions IS 'Question bank for standardized testing with IRT parameters';
COMMENT ON TABLE standardized_exams IS 'Scheduled instances of standardized exams';
COMMENT ON TABLE exam_attempts IS 'Student exam sessions with CAT tracking';
COMMENT ON TABLE exam_responses IS 'Individual question responses with timing';
COMMENT ON TABLE exam_results IS 'Calculated exam results with category breakdowns';
COMMENT ON TABLE nremt_predictions IS 'NREMT pass rate predictions for students';
COMMENT ON FUNCTION select_next_cat_question IS 'Select optimal next question for CAT using maximum information';
COMMENT ON FUNCTION update_cat_theta IS 'Update ability estimate after CAT response';
COMMENT ON FUNCTION should_terminate_cat IS 'Check if CAT exam should terminate';
COMMENT ON FUNCTION calculate_exam_result IS 'Calculate final exam results with category scores';
