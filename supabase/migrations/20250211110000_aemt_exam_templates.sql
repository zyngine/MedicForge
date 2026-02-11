-- Add AEMT exam templates for entrance and CAT comprehensive exams

-- AEMT Entrance Exam (Standard)
INSERT INTO standardized_exam_templates (
  id,
  tenant_id,
  name,
  description,
  exam_type,
  certification_level,
  delivery_mode,
  total_questions,
  time_limit_minutes,
  passing_score,
  category_weights,
  shuffle_questions,
  shuffle_options,
  show_results_immediately,
  allow_review,
  is_system_template,
  is_active
) VALUES (
  gen_random_uuid(),
  NULL, -- System template available to all tenants
  'AEMT Entrance Exam',
  'Standard entrance assessment for Advanced EMT program admission. Covers EMT foundations plus advanced assessment and pharmacology basics.',
  'entrance',
  'AEMT',
  'standard',
  120,
  150, -- 2.5 hours
  70,
  '{
    "AEMT-AIRWAY": 15,
    "AEMT-CARDIO": 18,
    "AEMT-TRAUMA": 12,
    "AEMT-MEDICAL": 22,
    "AEMT-PHARM": 15,
    "AEMT-ASSESSMENT": 10,
    "AEMT-OPS": 8
  }'::jsonb,
  true,
  true,
  true,
  true,
  true,
  true
) ON CONFLICT DO NOTHING;

-- AEMT Comprehensive Exam (CAT/Adaptive)
INSERT INTO standardized_exam_templates (
  id,
  tenant_id,
  name,
  description,
  exam_type,
  certification_level,
  delivery_mode,
  total_questions,
  min_questions,
  max_questions,
  time_limit_minutes,
  passing_score,
  cut_score_method,
  category_weights,
  cat_settings,
  shuffle_questions,
  shuffle_options,
  show_results_immediately,
  allow_review,
  is_system_template,
  is_active
) VALUES (
  gen_random_uuid(),
  NULL, -- System template available to all tenants
  'AEMT Comprehensive Exam (CAT)',
  'Computer Adaptive Testing comprehensive exam for AEMT certification readiness. Uses Item Response Theory to assess competency.',
  'comprehensive',
  'AEMT',
  'adaptive',
  NULL, -- Adaptive, no fixed total
  75,   -- Minimum questions
  135,  -- Maximum questions
  180,  -- 3 hours max
  0,    -- Theta >= 0 for passing (IRT-based)
  'irt_theta',
  '{
    "AEMT-AIRWAY": 15,
    "AEMT-CARDIO": 18,
    "AEMT-TRAUMA": 12,
    "AEMT-MEDICAL": 22,
    "AEMT-PHARM": 15,
    "AEMT-ASSESSMENT": 10,
    "AEMT-OPS": 8
  }'::jsonb,
  '{
    "initial_theta": 0,
    "se_threshold": 0.30,
    "max_exposure_rate": 0.25,
    "content_balancing": true
  }'::jsonb,
  true,
  true,
  true,
  false, -- No review for CAT to maintain item security
  true,
  true
) ON CONFLICT DO NOTHING;

-- AEMT Practice Exam (Standard - for self-study)
INSERT INTO standardized_exam_templates (
  id,
  tenant_id,
  name,
  description,
  exam_type,
  certification_level,
  delivery_mode,
  total_questions,
  time_limit_minutes,
  passing_score,
  category_weights,
  shuffle_questions,
  shuffle_options,
  show_results_immediately,
  show_correct_answers,
  allow_review,
  is_system_template,
  is_active
) VALUES (
  gen_random_uuid(),
  NULL,
  'AEMT Practice Exam',
  'Self-study practice exam for AEMT students. Immediate feedback with explanations.',
  'practice',
  'AEMT',
  'standard',
  50,
  75, -- 1.25 hours
  70,
  '{
    "AEMT-AIRWAY": 15,
    "AEMT-CARDIO": 18,
    "AEMT-TRAUMA": 12,
    "AEMT-MEDICAL": 22,
    "AEMT-PHARM": 15,
    "AEMT-ASSESSMENT": 10,
    "AEMT-OPS": 8
  }'::jsonb,
  true,
  true,
  true,
  true, -- Show correct answers for learning
  true,
  true,
  true
) ON CONFLICT DO NOTHING;

COMMENT ON TABLE standardized_exam_templates IS 'Exam templates including AEMT entrance, CAT comprehensive, and practice exams';
