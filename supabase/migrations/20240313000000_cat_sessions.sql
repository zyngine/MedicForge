-- Computer Adaptive Testing (CAT) Sessions
-- Migration: 20240313000000_cat_sessions.sql

-- Create CAT sessions table
CREATE TABLE IF NOT EXISTS cat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,

  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),

  -- IRT-based ability estimation
  final_ability DECIMAL(5,3), -- Range: -4 to +4
  ability_se DECIMAL(5,3), -- Standard error

  -- Statistics
  questions_answered INTEGER NOT NULL DEFAULT 0,
  questions_correct INTEGER NOT NULL DEFAULT 0,
  final_score INTEGER, -- Scaled score 0-100
  pass_fail TEXT CHECK (pass_fail IN ('pass', 'fail')),

  -- Full response history as JSONB
  response_history JSONB DEFAULT '[]',

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add IRT parameters to question_bank if not exists
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS discrimination_index DECIMAL(5,3);
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS irt_difficulty DECIMAL(5,3);
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS irt_discrimination DECIMAL(5,3);
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS irt_guessing DECIMAL(5,3);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cat_sessions_student ON cat_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_cat_sessions_tenant ON cat_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cat_sessions_status ON cat_sessions(status);

-- Enable RLS
ALTER TABLE cat_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Students can view own CAT sessions"
  ON cat_sessions FOR SELECT
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND tenant_id = cat_sessions.tenant_id
      AND role IN ('admin', 'instructor')
    )
  );

CREATE POLICY "Students can create own CAT sessions"
  ON cat_sessions FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Students can update own in-progress CAT sessions"
  ON cat_sessions FOR UPDATE
  USING (
    student_id = auth.uid()
    AND status = 'in_progress'
  );

-- Function to calculate item information value
CREATE OR REPLACE FUNCTION calculate_item_information(
  ability DECIMAL,
  difficulty DECIMAL,
  discrimination DECIMAL,
  guessing DECIMAL DEFAULT 0.25
) RETURNS DECIMAL AS $$
DECLARE
  p DECIMAL;
  q DECIMAL;
  p_star DECIMAL;
BEGIN
  -- 3PL probability
  p := guessing + (1 - guessing) / (1 + EXP(-discrimination * (ability - difficulty)));
  q := 1 - p;
  p_star := (p - guessing) / (1 - guessing);

  -- Fisher information
  RETURN (discrimination * discrimination * q * p_star * p_star) / (p * (1 - guessing) * (1 - guessing));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get next best question for CAT
CREATE OR REPLACE FUNCTION get_next_cat_question(
  p_student_id UUID,
  p_current_ability DECIMAL,
  p_answered_ids UUID[],
  p_category_id UUID DEFAULT NULL,
  p_certification_level TEXT DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  question_text TEXT,
  question_type TEXT,
  options JSONB,
  correct_answer JSONB,
  explanation TEXT,
  information_value DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.question_text,
    q.question_type,
    q.options,
    q.correct_answer,
    q.explanation,
    calculate_item_information(
      p_current_ability,
      COALESCE(q.irt_difficulty,
        CASE q.difficulty
          WHEN 'easy' THEN -1.0
          WHEN 'medium' THEN 0.0
          WHEN 'hard' THEN 1.0
          WHEN 'expert' THEN 2.0
          ELSE 0.0
        END),
      COALESCE(q.irt_discrimination, 1.0),
      COALESCE(q.irt_guessing, 0.25)
    ) as information_value
  FROM question_bank q
  WHERE q.is_active = true
    AND q.is_validated = true
    AND q.id != ALL(COALESCE(p_answered_ids, ARRAY[]::UUID[]))
    AND (p_category_id IS NULL OR q.category_id = p_category_id)
    AND (p_certification_level IS NULL OR q.certification_level = p_certification_level)
  ORDER BY information_value DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for CAT session analytics
CREATE OR REPLACE VIEW cat_session_analytics AS
SELECT
  tenant_id,
  DATE_TRUNC('month', completed_at) as month,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE pass_fail = 'pass') as passed,
  COUNT(*) FILTER (WHERE pass_fail = 'fail') as failed,
  ROUND(AVG(questions_answered), 1) as avg_questions,
  ROUND(AVG(final_score), 1) as avg_score,
  ROUND(AVG(final_ability)::numeric, 2) as avg_ability
FROM cat_sessions
WHERE status = 'completed'
GROUP BY tenant_id, DATE_TRUNC('month', completed_at);

-- Add comments
COMMENT ON TABLE cat_sessions IS 'Stores Computer Adaptive Testing session data with IRT-based ability estimation';
COMMENT ON FUNCTION calculate_item_information IS 'Calculates Fisher information for item selection in CAT';
COMMENT ON FUNCTION get_next_cat_question IS 'Selects optimal next question based on current ability estimate';
