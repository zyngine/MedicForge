-- Peer Evaluation System
-- Migration: 20240316000000_peer_evaluations.sql

-- Evaluation types
CREATE TYPE peer_eval_type AS ENUM (
  'team_exercise',
  'clinical_rotation',
  'simulation',
  'lab_partner',
  'general'
);

-- Evaluation status
CREATE TYPE peer_eval_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'expired'
);

-- Peer evaluation templates (criteria to evaluate)
CREATE TABLE IF NOT EXISTS peer_eval_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  eval_type peer_eval_type NOT NULL DEFAULT 'general',
  criteria JSONB NOT NULL DEFAULT '[]',
  -- criteria format: [{ id, name, description, max_score, weight }]
  is_anonymous BOOLEAN NOT NULL DEFAULT true,
  include_self_evaluation BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Peer evaluation assignments (who evaluates whom)
CREATE TABLE IF NOT EXISTS peer_eval_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES peer_eval_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  context_type TEXT, -- 'shift', 'simulation', 'lab', etc.
  context_id UUID, -- reference to related entity
  due_date TIMESTAMPTZ NOT NULL,
  allow_late BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual evaluation assignments (pairs of evaluator -> evaluatee)
CREATE TABLE IF NOT EXISTS peer_eval_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES peer_eval_assignments(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES auth.users(id),
  evaluatee_id UUID NOT NULL REFERENCES auth.users(id),
  status peer_eval_status NOT NULL DEFAULT 'pending',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(assignment_id, evaluator_id, evaluatee_id)
);

-- Peer evaluation responses
CREATE TABLE IF NOT EXISTS peer_eval_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pair_id UUID NOT NULL REFERENCES peer_eval_pairs(id) ON DELETE CASCADE,
  criteria_scores JSONB NOT NULL DEFAULT '{}',
  -- format: { criteria_id: { score: number, comment: string } }
  overall_score DECIMAL(5,2),
  strengths TEXT,
  areas_for_improvement TEXT,
  additional_comments TEXT,
  is_self_evaluation BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pair_id)
);

-- Aggregated results view for instructors
CREATE TABLE IF NOT EXISTS peer_eval_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES peer_eval_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id),
  evaluations_received INTEGER NOT NULL DEFAULT 0,
  average_score DECIMAL(5,2),
  criteria_averages JSONB DEFAULT '{}',
  strengths_summary TEXT,
  improvements_summary TEXT,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_peer_eval_templates_tenant ON peer_eval_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_peer_eval_assignments_course ON peer_eval_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_peer_eval_pairs_assignment ON peer_eval_pairs(assignment_id);
CREATE INDEX IF NOT EXISTS idx_peer_eval_pairs_evaluator ON peer_eval_pairs(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_peer_eval_pairs_evaluatee ON peer_eval_pairs(evaluatee_id);
CREATE INDEX IF NOT EXISTS idx_peer_eval_results_student ON peer_eval_results(student_id);

-- Enable RLS
ALTER TABLE peer_eval_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_eval_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_eval_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_eval_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_eval_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates
CREATE POLICY "Users can view templates in their tenant"
  ON peer_eval_templates FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Instructors can manage templates"
  ON peer_eval_templates FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- RLS Policies for assignments
CREATE POLICY "Users can view assignments in their tenant"
  ON peer_eval_assignments FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Instructors can manage assignments"
  ON peer_eval_assignments FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- RLS Policies for pairs
CREATE POLICY "Users can view their evaluation pairs"
  ON peer_eval_pairs FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (
      evaluator_id = auth.uid()
      OR evaluatee_id = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    )
  );

CREATE POLICY "Instructors can create pairs"
  ON peer_eval_pairs FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

CREATE POLICY "System can update pairs"
  ON peer_eval_pairs FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- RLS Policies for responses
CREATE POLICY "Evaluators can submit responses"
  ON peer_eval_responses FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM peer_eval_pairs p
      WHERE p.id = peer_eval_responses.pair_id
      AND p.evaluator_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can view all responses"
  ON peer_eval_responses FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- RLS Policies for results
CREATE POLICY "Students can view own results"
  ON peer_eval_results FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (
      student_id = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    )
  );

CREATE POLICY "Instructors can manage results"
  ON peer_eval_results FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Function to create evaluation pairs for a team
CREATE OR REPLACE FUNCTION create_peer_eval_pairs_for_team(
  p_assignment_id UUID,
  p_tenant_id UUID,
  p_student_ids UUID[],
  p_include_self BOOLEAN DEFAULT false
) RETURNS INTEGER AS $$
DECLARE
  v_evaluator UUID;
  v_evaluatee UUID;
  v_count INTEGER := 0;
BEGIN
  FOREACH v_evaluator IN ARRAY p_student_ids
  LOOP
    FOREACH v_evaluatee IN ARRAY p_student_ids
    LOOP
      -- Skip self-evaluation if not allowed
      IF v_evaluator = v_evaluatee AND NOT p_include_self THEN
        CONTINUE;
      END IF;

      INSERT INTO peer_eval_pairs (
        tenant_id, assignment_id, evaluator_id, evaluatee_id, status
      ) VALUES (
        p_tenant_id, p_assignment_id, v_evaluator, v_evaluatee, 'pending'
      )
      ON CONFLICT (assignment_id, evaluator_id, evaluatee_id) DO NOTHING;

      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to submit peer evaluation
CREATE OR REPLACE FUNCTION submit_peer_evaluation(
  p_pair_id UUID,
  p_criteria_scores JSONB,
  p_strengths TEXT,
  p_improvements TEXT,
  p_comments TEXT
) RETURNS peer_eval_responses AS $$
DECLARE
  v_response peer_eval_responses;
  v_overall_score DECIMAL(5,2);
  v_pair peer_eval_pairs;
BEGIN
  -- Get pair info
  SELECT * INTO v_pair FROM peer_eval_pairs WHERE id = p_pair_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evaluation pair not found';
  END IF;

  IF v_pair.evaluator_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to submit this evaluation';
  END IF;

  -- Calculate overall score (average of all criteria scores)
  SELECT AVG((value->>'score')::DECIMAL)
  INTO v_overall_score
  FROM jsonb_each(p_criteria_scores) AS x(key, value);

  -- Insert response
  INSERT INTO peer_eval_responses (
    tenant_id, pair_id, criteria_scores, overall_score,
    strengths, areas_for_improvement, additional_comments,
    is_self_evaluation
  ) VALUES (
    v_pair.tenant_id, p_pair_id, p_criteria_scores, v_overall_score,
    p_strengths, p_improvements, p_comments,
    v_pair.evaluator_id = v_pair.evaluatee_id
  )
  ON CONFLICT (pair_id) DO UPDATE SET
    criteria_scores = EXCLUDED.criteria_scores,
    overall_score = EXCLUDED.overall_score,
    strengths = EXCLUDED.strengths,
    areas_for_improvement = EXCLUDED.areas_for_improvement,
    additional_comments = EXCLUDED.additional_comments,
    submitted_at = NOW()
  RETURNING * INTO v_response;

  -- Update pair status
  UPDATE peer_eval_pairs
  SET status = 'completed', completed_at = NOW()
  WHERE id = p_pair_id;

  RETURN v_response;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate aggregated results
CREATE OR REPLACE FUNCTION calculate_peer_eval_results(
  p_assignment_id UUID,
  p_tenant_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_student_id UUID;
  v_count INTEGER := 0;
  v_evaluations_received INTEGER;
  v_average_score DECIMAL(5,2);
  v_criteria_averages JSONB;
BEGIN
  -- Get all evaluatees in this assignment
  FOR v_student_id IN
    SELECT DISTINCT evaluatee_id FROM peer_eval_pairs
    WHERE assignment_id = p_assignment_id
  LOOP
    -- Calculate averages
    SELECT
      COUNT(*),
      AVG(r.overall_score),
      jsonb_object_agg(
        key,
        jsonb_build_object(
          'average_score', AVG((value->>'score')::DECIMAL),
          'count', COUNT(*)
        )
      )
    INTO v_evaluations_received, v_average_score, v_criteria_averages
    FROM peer_eval_pairs p
    JOIN peer_eval_responses r ON r.pair_id = p.id
    CROSS JOIN LATERAL jsonb_each(r.criteria_scores) AS criteria(key, value)
    WHERE p.assignment_id = p_assignment_id
      AND p.evaluatee_id = v_student_id
      AND NOT r.is_self_evaluation
    GROUP BY p.evaluatee_id;

    -- Upsert results
    INSERT INTO peer_eval_results (
      tenant_id, assignment_id, student_id,
      evaluations_received, average_score, criteria_averages,
      calculated_at
    ) VALUES (
      p_tenant_id, p_assignment_id, v_student_id,
      COALESCE(v_evaluations_received, 0),
      v_average_score,
      COALESCE(v_criteria_averages, '{}'),
      NOW()
    )
    ON CONFLICT (assignment_id, student_id) DO UPDATE SET
      evaluations_received = EXCLUDED.evaluations_received,
      average_score = EXCLUDED.average_score,
      criteria_averages = EXCLUDED.criteria_averages,
      calculated_at = NOW();

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Default EMS peer evaluation template
INSERT INTO peer_eval_templates (
  id, tenant_id, name, description, eval_type, criteria, is_anonymous, include_self_evaluation, is_active, created_by
)
SELECT
  gen_random_uuid(),
  t.id,
  'EMS Team Performance Evaluation',
  'Standard peer evaluation for EMS team exercises and simulations',
  'team_exercise',
  '[
    {"id": "communication", "name": "Communication", "description": "Clear, professional communication with team and patient", "max_score": 5, "weight": 1.0},
    {"id": "teamwork", "name": "Teamwork", "description": "Works collaboratively, accepts feedback, supports team members", "max_score": 5, "weight": 1.0},
    {"id": "clinical_skills", "name": "Clinical Skills", "description": "Demonstrates competence in patient assessment and interventions", "max_score": 5, "weight": 1.0},
    {"id": "leadership", "name": "Leadership", "description": "Takes initiative, delegates appropriately, maintains scene control", "max_score": 5, "weight": 1.0},
    {"id": "professionalism", "name": "Professionalism", "description": "Professional demeanor, punctual, prepared, respectful", "max_score": 5, "weight": 1.0},
    {"id": "adaptability", "name": "Adaptability", "description": "Adjusts to changing situations, problem-solves effectively", "max_score": 5, "weight": 1.0}
  ]'::JSONB,
  true,
  false,
  true,
  (SELECT id FROM auth.users LIMIT 1)
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM peer_eval_templates WHERE tenant_id = t.id
);

-- Add comments
COMMENT ON TABLE peer_eval_templates IS 'Templates defining criteria for peer evaluations';
COMMENT ON TABLE peer_eval_assignments IS 'Peer evaluation assignments for courses/activities';
COMMENT ON TABLE peer_eval_pairs IS 'Individual evaluator-evaluatee pairs';
COMMENT ON TABLE peer_eval_responses IS 'Submitted peer evaluation responses';
COMMENT ON TABLE peer_eval_results IS 'Aggregated results per student';
COMMENT ON FUNCTION create_peer_eval_pairs_for_team IS 'Creates all evaluation pairs for a team of students';
COMMENT ON FUNCTION submit_peer_evaluation IS 'Submits and validates a peer evaluation';
COMMENT ON FUNCTION calculate_peer_eval_results IS 'Calculates aggregated results for an assignment';
