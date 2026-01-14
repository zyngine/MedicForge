-- CoAEMSP Accreditation Reporting & Affective Domain Tracking
-- Migration: 20240403000000_accreditation_affective.sql

-- ============================================
-- CoAEMSP ACCREDITATION STANDARDS
-- ============================================

-- Standard sections for CoAEMSP accreditation
CREATE TABLE IF NOT EXISTS coaemsp_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_code TEXT NOT NULL UNIQUE, -- e.g., "III.A.1"
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- Sponsorship, Resources, Students, etc.
  certification_level TEXT NOT NULL, -- EMT, AEMT, Paramedic
  required_evidence TEXT[], -- Types of documentation needed
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed CoAEMSP standards
INSERT INTO coaemsp_standards (standard_code, title, description, category, certification_level, required_evidence) VALUES
-- Standard III - Resources
('III.A.1', 'Program Director Qualifications', 'Program must have qualified Program Director', 'Resources', 'Paramedic', '{"cv", "credentials", "job_description"}'),
('III.A.2', 'Medical Director Qualifications', 'Program must have qualified Medical Director', 'Resources', 'Paramedic', '{"cv", "credentials", "medical_license", "agreement"}'),
('III.B.1', 'Faculty Qualifications', 'All faculty must meet minimum qualifications', 'Resources', 'Paramedic', '{"faculty_roster", "credentials", "cv"}'),
('III.C.1', 'Classroom Facilities', 'Adequate classroom space and equipment', 'Resources', 'Paramedic', '{"facility_photos", "equipment_inventory"}'),
('III.C.2', 'Laboratory Facilities', 'Skills lab with required equipment', 'Resources', 'Paramedic', '{"lab_photos", "equipment_inventory"}'),
('III.D.1', 'Clinical Affiliations', 'Sufficient clinical sites for student experiences', 'Resources', 'Paramedic', '{"affiliation_agreements", "site_roster"}'),
('III.D.2', 'Field Internship Sites', 'EMS agencies for field clinical experiences', 'Resources', 'Paramedic', '{"affiliation_agreements", "agency_roster"}'),
-- Standard IV - Students
('IV.A.1', 'Admissions Requirements', 'Published admission requirements and process', 'Students', 'Paramedic', '{"admission_policy", "prerequisite_list"}'),
('IV.A.2', 'Student Selection', 'Fair and consistent student selection process', 'Students', 'Paramedic', '{"selection_criteria", "interview_rubric"}'),
('IV.B.1', 'Student Records', 'Secure maintenance of student records', 'Students', 'Paramedic', '{"records_policy", "sample_records"}'),
('IV.C.1', 'Student Health/Safety', 'Health requirements and safety training', 'Students', 'Paramedic', '{"health_policy", "immunization_records", "safety_training"}'),
-- Standard V - Fair Practices
('V.A.1', 'Published Policies', 'All policies available to students', 'Fair Practices', 'Paramedic', '{"handbook", "catalog"}'),
('V.B.1', 'Grievance Procedure', 'Fair grievance procedure for students', 'Fair Practices', 'Paramedic', '{"grievance_policy"}'),
('V.C.1', 'Refund Policy', 'Published refund and cancellation policy', 'Fair Practices', 'Paramedic', '{"refund_policy"}'),
-- Standard VI - Assessment
('VI.A.1', 'Cognitive Assessment', 'Ongoing assessment of cognitive domain', 'Assessment', 'Paramedic', '{"exam_results", "progression_data"}'),
('VI.A.2', 'Psychomotor Assessment', 'Competency-based psychomotor evaluation', 'Assessment', 'Paramedic', '{"skills_checkoffs", "simulation_records"}'),
('VI.A.3', 'Affective Assessment', 'Assessment of professional behaviors', 'Assessment', 'Paramedic', '{"affective_evaluations", "behavior_incidents"}'),
('VI.B.1', 'Clinical Performance', 'Assessment of clinical performance', 'Assessment', 'Paramedic', '{"clinical_evaluations", "patient_contacts"}'),
('VI.B.2', 'Field Performance', 'Assessment of field internship performance', 'Assessment', 'Paramedic', '{"field_evaluations", "capstone_records"}')
ON CONFLICT (standard_code) DO NOTHING;

-- ============================================
-- ACCREDITATION DOCUMENTS
-- ============================================

CREATE TYPE document_status AS ENUM (
  'draft',
  'under_review',
  'approved',
  'expired',
  'archived'
);

CREATE TABLE IF NOT EXISTS accreditation_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  standard_id UUID REFERENCES coaemsp_standards(id),
  document_type TEXT NOT NULL, -- cv, agreement, policy, roster, etc.
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  version INTEGER DEFAULT 1,
  status document_status DEFAULT 'draft',
  valid_from DATE,
  valid_until DATE,
  uploaded_by UUID REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ACCREDITATION COMPLIANCE TRACKING
-- ============================================

CREATE TYPE compliance_status AS ENUM (
  'compliant',
  'partial',
  'non_compliant',
  'not_applicable',
  'pending_review'
);

CREATE TABLE IF NOT EXISTS accreditation_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  standard_id UUID NOT NULL REFERENCES coaemsp_standards(id),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE, -- For course-specific compliance
  status compliance_status NOT NULL DEFAULT 'pending_review',
  evidence_document_ids UUID[] DEFAULT '{}',
  notes TEXT,
  action_items TEXT[],
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  next_review_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, standard_id, course_id)
);

-- ============================================
-- ACCREDITATION REPORTS
-- ============================================

CREATE TABLE IF NOT EXISTS accreditation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL, -- annual, self_study, site_visit, interim
  report_period_start DATE,
  report_period_end DATE,
  title TEXT NOT NULL,
  generated_data JSONB NOT NULL DEFAULT '{}', -- All aggregated data
  status TEXT DEFAULT 'draft', -- draft, submitted, accepted
  submitted_at TIMESTAMPTZ,
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- OUTCOME DATA TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS program_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cohort_year INTEGER NOT NULL,
  certification_level TEXT NOT NULL,

  -- Enrollment metrics
  students_enrolled INTEGER DEFAULT 0,
  students_graduated INTEGER DEFAULT 0,
  students_withdrawn INTEGER DEFAULT 0,
  students_dismissed INTEGER DEFAULT 0,

  -- Completion metrics
  retention_rate DECIMAL(5,2),
  completion_rate DECIMAL(5,2),
  positive_placement_rate DECIMAL(5,2), -- Working in EMS within 12 months

  -- Certification metrics
  nremt_first_attempt_pass INTEGER DEFAULT 0,
  nremt_eventual_pass INTEGER DEFAULT 0,
  nremt_attempts_total INTEGER DEFAULT 0,
  cognitive_pass_rate DECIMAL(5,2),
  psychomotor_pass_rate DECIMAL(5,2),

  -- Satisfaction
  graduate_satisfaction_score DECIMAL(3,2),
  employer_satisfaction_score DECIMAL(3,2),

  -- Notes
  notes TEXT,
  data_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, cohort_year, certification_level)
);

-- ============================================
-- AFFECTIVE DOMAIN TRACKING
-- ============================================

-- Professional behavior categories
CREATE TABLE IF NOT EXISTS affective_behaviors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- Professional, Ethical, Communication, etc.
  indicators TEXT[], -- Observable indicators
  unacceptable_behaviors TEXT[], -- Examples of unacceptable behavior
  is_critical BOOLEAN DEFAULT false, -- Failure = immediate action
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed affective behaviors
INSERT INTO affective_behaviors (code, name, description, category, indicators, unacceptable_behaviors, is_critical) VALUES
('INTEGRITY', 'Integrity', 'Consistent honesty and trustworthiness in all interactions', 'Professional',
  '{"Admits mistakes promptly", "Accurately reports findings", "Maintains confidentiality", "Takes responsibility for actions"}',
  '{"Falsifying records", "Cheating on exams", "Breaching patient confidentiality", "Lying to instructors"}', true),
('EMPATHY', 'Empathy', 'Shows genuine concern for patients, families, and colleagues', 'Communication',
  '{"Active listening", "Appropriate emotional response", "Respects cultural differences", "Considers patient perspective"}',
  '{"Dismissive of patient concerns", "Inappropriate jokes", "Cultural insensitivity"}', false),
('SELF_MOTIVATION', 'Self-Motivation', 'Takes initiative in learning and professional development', 'Professional',
  '{"Prepared for class/clinicals", "Seeks learning opportunities", "Completes work on time", "Goes beyond minimum requirements"}',
  '{"Consistently unprepared", "Relies on others for basic tasks", "Misses deadlines without reason"}', false),
('APPEARANCE', 'Appearance & Personal Hygiene', 'Maintains professional appearance appropriate for healthcare', 'Professional',
  '{"Clean uniform", "Proper grooming", "Appropriate attire", "Good personal hygiene"}',
  '{"Dirty/wrinkled uniform", "Strong odors", "Inappropriate attire for clinical setting"}', false),
('SELF_CONFIDENCE', 'Self-Confidence', 'Demonstrates appropriate confidence without arrogance', 'Professional',
  '{"Speaks clearly", "Makes decisions when needed", "Accepts constructive criticism", "Knows limitations"}',
  '{"Unable to make decisions", "Refuses feedback", "Overconfident beyond competence"}', false),
('COMMUNICATION', 'Communication Skills', 'Effectively communicates with patients, families, and team', 'Communication',
  '{"Clear verbal communication", "Appropriate documentation", "Listens actively", "Adapts to audience"}',
  '{"Poor documentation", "Rude to patients", "Fails to communicate critical info"}', true),
('TIME_MANAGEMENT', 'Time Management', 'Effectively manages time and meets obligations', 'Professional',
  '{"Punctual", "Meets deadlines", "Prioritizes appropriately", "Efficient with tasks"}',
  '{"Chronic lateness", "Missed shifts without notice", "Incomplete tasks"}', false),
('TEAMWORK', 'Teamwork & Diplomacy', 'Works effectively with others and handles conflict professionally', 'Communication',
  '{"Cooperates with team", "Supports colleagues", "Handles conflict professionally", "Shares workload"}',
  '{"Creates conflict", "Refuses to help others", "Undermines team members"}', false),
('RESPECT', 'Respect', 'Shows respect for patients, colleagues, and the profession', 'Ethical',
  '{"Treats all with dignity", "Values diversity", "Respects boundaries", "Professional language"}',
  '{"Discriminatory behavior", "Harassment", "Disrespect to patients or staff"}', true),
('PATIENT_ADVOCACY', 'Patient Advocacy', 'Advocates for patient needs and safety', 'Ethical',
  '{"Speaks up for patient needs", "Reports safety concerns", "Ensures informed consent", "Protects patient rights"}',
  '{"Ignores patient requests", "Fails to report abuse", "Violates patient rights"}', true),
('CAREFUL_DELIVERY', 'Careful Delivery of Service', 'Provides careful, thorough patient care', 'Clinical',
  '{"Thorough assessments", "Attention to detail", "Safe medication handling", "Proper documentation"}',
  '{"Careless errors", "Skips steps in protocols", "Medication errors", "Incomplete assessments"}', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- AFFECTIVE EVALUATIONS
-- ============================================

CREATE TYPE evaluation_context AS ENUM (
  'classroom',
  'lab',
  'clinical',
  'field',
  'simulation'
);

CREATE TYPE evaluation_rating AS ENUM (
  'exceeds',      -- Consistently exceeds expectations
  'meets',        -- Meets expectations
  'developing',   -- Developing, shows improvement
  'below',        -- Below expectations
  'unacceptable'  -- Unacceptable, requires intervention
);

CREATE TABLE IF NOT EXISTS affective_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES auth.users(id),

  -- Context
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  context evaluation_context NOT NULL,
  shift_id UUID REFERENCES clinical_shifts(id), -- If during clinical

  -- Ratings
  ratings JSONB NOT NULL DEFAULT '{}', -- {behavior_code: rating}

  -- Overall
  overall_rating evaluation_rating,
  overall_comments TEXT,

  -- Action items
  areas_for_improvement TEXT[],
  remediation_required BOOLEAN DEFAULT false,
  follow_up_date DATE,

  -- Acknowledgment
  student_acknowledged BOOLEAN DEFAULT false,
  student_acknowledged_at TIMESTAMPTZ,
  student_comments TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AFFECTIVE INCIDENTS
-- ============================================

CREATE TYPE incident_severity AS ENUM (
  'minor',      -- Coaching needed
  'moderate',   -- Formal warning
  'major',      -- Remediation required
  'critical'    -- Immediate action/dismissal consideration
);

CREATE TABLE IF NOT EXISTS affective_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id),

  -- Incident details
  incident_date DATE NOT NULL,
  incident_time TIME,
  location TEXT,
  context evaluation_context,

  -- Classification
  behavior_ids UUID[] DEFAULT '{}', -- Related affective behaviors
  severity incident_severity NOT NULL,

  -- Description
  description TEXT NOT NULL,
  witnesses TEXT[],
  evidence_urls TEXT[],

  -- Response
  immediate_action TEXT,
  follow_up_action TEXT,
  remediation_plan TEXT,

  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolution_date DATE,
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),

  -- Student acknowledgment
  student_notified BOOLEAN DEFAULT false,
  student_notified_at TIMESTAMPTZ,
  student_response TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AFFECTIVE REMEDIATION PLANS
-- ============================================

CREATE TABLE IF NOT EXISTS affective_remediation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES affective_incidents(id),

  -- Plan details
  target_behaviors UUID[] NOT NULL, -- Behaviors to improve
  objectives TEXT[] NOT NULL,
  activities TEXT[] NOT NULL,
  timeline TEXT,
  start_date DATE NOT NULL,
  target_completion_date DATE NOT NULL,

  -- Progress
  checkpoints JSONB DEFAULT '[]', -- {date, notes, evaluator_id, progress_rating}
  current_status TEXT DEFAULT 'active', -- active, completed, failed, extended

  -- Completion
  completed_at TIMESTAMPTZ,
  outcome TEXT, -- successful, unsuccessful, extended
  final_evaluation_id UUID REFERENCES affective_evaluations(id),

  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ACCREDITATION REPORT GENERATION
-- ============================================

-- Function to generate CoAEMSP annual report data
CREATE OR REPLACE FUNCTION generate_coaemsp_report(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS JSONB AS $$
DECLARE
  v_report JSONB;
  v_enrollment_data JSONB;
  v_outcomes_data JSONB;
  v_clinical_data JSONB;
  v_affective_data JSONB;
BEGIN
  -- Enrollment data
  SELECT jsonb_build_object(
    'total_enrolled', COUNT(DISTINCT e.student_id),
    'active', COUNT(DISTINCT e.student_id) FILTER (WHERE e.status = 'active'),
    'completed', COUNT(DISTINCT e.student_id) FILTER (WHERE e.status = 'completed'),
    'withdrawn', COUNT(DISTINCT e.student_id) FILTER (WHERE e.status = 'dropped'),
    'by_course', (
      SELECT jsonb_agg(jsonb_build_object(
        'course_id', c.id,
        'course_title', c.title,
        'enrolled', COUNT(DISTINCT e2.student_id)
      ))
      FROM courses c
      LEFT JOIN enrollments e2 ON c.id = e2.course_id
      WHERE c.tenant_id = p_tenant_id
      GROUP BY c.id, c.title
    )
  ) INTO v_enrollment_data
  FROM enrollments e
  JOIN courses c ON e.course_id = c.id
  WHERE c.tenant_id = p_tenant_id
    AND e.enrolled_at BETWEEN p_start_date AND p_end_date;

  -- Outcomes data
  SELECT jsonb_build_object(
    'nremt_pass_rate', round(AVG(cognitive_pass_rate), 1),
    'completion_rate', round(AVG(completion_rate), 1),
    'retention_rate', round(AVG(retention_rate), 1),
    'placement_rate', round(AVG(positive_placement_rate), 1)
  ) INTO v_outcomes_data
  FROM program_outcomes
  WHERE tenant_id = p_tenant_id
    AND cohort_year >= EXTRACT(YEAR FROM p_start_date)
    AND cohort_year <= EXTRACT(YEAR FROM p_end_date);

  -- Clinical data
  SELECT jsonb_build_object(
    'total_patient_contacts', COUNT(DISTINCT cpc.id),
    'total_clinical_hours', SUM(csb.hours_completed),
    'by_age_range', (
      SELECT jsonb_object_agg(patient_age_range, cnt)
      FROM (
        SELECT patient_age_range, COUNT(*) as cnt
        FROM clinical_patient_contacts
        WHERE tenant_id = p_tenant_id
        GROUP BY patient_age_range
      ) age_counts
    ),
    'team_lead_experiences', COUNT(DISTINCT cpc.id) FILTER (WHERE cpc.was_team_lead)
  ) INTO v_clinical_data
  FROM clinical_patient_contacts cpc
  LEFT JOIN clinical_shift_bookings csb ON cpc.booking_id = csb.id
  WHERE cpc.tenant_id = p_tenant_id
    AND cpc.created_at BETWEEN p_start_date AND p_end_date;

  -- Affective domain data
  SELECT jsonb_build_object(
    'total_evaluations', COUNT(DISTINCT ae.id),
    'incidents_count', (SELECT COUNT(*) FROM affective_incidents WHERE tenant_id = p_tenant_id),
    'remediation_plans', (SELECT COUNT(*) FROM affective_remediation_plans WHERE tenant_id = p_tenant_id),
    'average_ratings', (
      SELECT jsonb_object_agg(behavior_code, avg_rating)
      FROM (
        SELECT ab.code as behavior_code, AVG(
          CASE r.value
            WHEN 'exceeds' THEN 5
            WHEN 'meets' THEN 4
            WHEN 'developing' THEN 3
            WHEN 'below' THEN 2
            WHEN 'unacceptable' THEN 1
          END
        ) as avg_rating
        FROM affective_evaluations ae2,
          jsonb_each_text(ae2.ratings) r
        JOIN affective_behaviors ab ON ab.code = r.key
        WHERE ae2.tenant_id = p_tenant_id
        GROUP BY ab.code
      ) ratings
    )
  ) INTO v_affective_data
  FROM affective_evaluations ae
  WHERE ae.tenant_id = p_tenant_id
    AND ae.evaluation_date BETWEEN p_start_date AND p_end_date;

  -- Build final report
  v_report := jsonb_build_object(
    'report_period', jsonb_build_object(
      'start_date', p_start_date,
      'end_date', p_end_date
    ),
    'enrollment', v_enrollment_data,
    'outcomes', v_outcomes_data,
    'clinical', v_clinical_data,
    'affective', v_affective_data,
    'compliance', (
      SELECT jsonb_object_agg(
        cs.standard_code,
        jsonb_build_object(
          'status', ac.status,
          'last_reviewed', ac.reviewed_at
        )
      )
      FROM coaemsp_standards cs
      LEFT JOIN accreditation_compliance ac ON cs.id = ac.standard_id AND ac.tenant_id = p_tenant_id
    ),
    'generated_at', NOW()
  );

  RETURN v_report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate student affective score
CREATE OR REPLACE FUNCTION get_student_affective_score(
  p_student_id UUID,
  p_course_id UUID
) RETURNS TABLE (
  behavior_code TEXT,
  behavior_name TEXT,
  average_rating DECIMAL,
  evaluation_count INTEGER,
  incidents_count INTEGER,
  trend TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ab.code as behavior_code,
    ab.name as behavior_name,
    AVG(
      CASE ae.ratings->>ab.code
        WHEN 'exceeds' THEN 5
        WHEN 'meets' THEN 4
        WHEN 'developing' THEN 3
        WHEN 'below' THEN 2
        WHEN 'unacceptable' THEN 1
        ELSE NULL
      END
    )::DECIMAL as average_rating,
    COUNT(ae.id)::INTEGER as evaluation_count,
    (SELECT COUNT(*)::INTEGER FROM affective_incidents ai
     WHERE ai.student_id = p_student_id
       AND ai.course_id = p_course_id
       AND ab.id = ANY(ai.behavior_ids)) as incidents_count,
    CASE
      WHEN COUNT(ae.id) < 2 THEN 'insufficient_data'
      ELSE 'stable' -- Would need more sophisticated trend calculation
    END as trend
  FROM affective_behaviors ab
  LEFT JOIN affective_evaluations ae ON
    ae.student_id = p_student_id
    AND ae.course_id = p_course_id
    AND ae.ratings ? ab.code
  GROUP BY ab.id, ab.code, ab.name
  ORDER BY ab.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_accred_docs_tenant ON accreditation_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accred_docs_standard ON accreditation_documents(standard_id);
CREATE INDEX IF NOT EXISTS idx_accred_compliance_tenant ON accreditation_compliance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_program_outcomes_tenant ON program_outcomes(tenant_id, cohort_year);
CREATE INDEX IF NOT EXISTS idx_affective_eval_student ON affective_evaluations(student_id);
CREATE INDEX IF NOT EXISTS idx_affective_eval_course ON affective_evaluations(course_id);
CREATE INDEX IF NOT EXISTS idx_affective_incidents_student ON affective_incidents(student_id);
CREATE INDEX IF NOT EXISTS idx_affective_remediation_student ON affective_remediation_plans(student_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE coaemsp_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE accreditation_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE accreditation_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE accreditation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE affective_behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE affective_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE affective_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE affective_remediation_plans ENABLE ROW LEVEL SECURITY;

-- Standards are public (read-only)
CREATE POLICY "Anyone can view standards"
  ON coaemsp_standards FOR SELECT USING (true);

-- Affective behaviors are public (read-only)
CREATE POLICY "Anyone can view affective behaviors"
  ON affective_behaviors FOR SELECT USING (true);

-- Accreditation documents
CREATE POLICY "Admins can manage accreditation docs"
  ON accreditation_documents FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Instructors can view accreditation docs"
  ON accreditation_documents FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Compliance tracking
CREATE POLICY "Admins can manage compliance"
  ON accreditation_compliance FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Instructors can view compliance"
  ON accreditation_compliance FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Reports
CREATE POLICY "Admins can manage reports"
  ON accreditation_reports FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Program outcomes
CREATE POLICY "Admins can manage outcomes"
  ON program_outcomes FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Instructors can view outcomes"
  ON program_outcomes FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Affective evaluations
CREATE POLICY "Instructors can manage evaluations"
  ON affective_evaluations FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

CREATE POLICY "Students can view own evaluations"
  ON affective_evaluations FOR SELECT
  USING (student_id = auth.uid());

-- Affective incidents
CREATE POLICY "Instructors can manage incidents"
  ON affective_incidents FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

CREATE POLICY "Students can view own incidents"
  ON affective_incidents FOR SELECT
  USING (student_id = auth.uid());

-- Remediation plans
CREATE POLICY "Instructors can manage remediation"
  ON affective_remediation_plans FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

CREATE POLICY "Students can view own remediation"
  ON affective_remediation_plans FOR SELECT
  USING (student_id = auth.uid());

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE coaemsp_standards IS 'CoAEMSP accreditation standards reference';
COMMENT ON TABLE accreditation_documents IS 'Documents for accreditation compliance';
COMMENT ON TABLE accreditation_compliance IS 'Track compliance status per standard';
COMMENT ON TABLE accreditation_reports IS 'Generated accreditation reports';
COMMENT ON TABLE program_outcomes IS 'Annual program outcome metrics';
COMMENT ON TABLE affective_behaviors IS 'Professional behavior definitions';
COMMENT ON TABLE affective_evaluations IS 'Student affective domain evaluations';
COMMENT ON TABLE affective_incidents IS 'Professional behavior incidents';
COMMENT ON TABLE affective_remediation_plans IS 'Remediation plans for affective issues';
COMMENT ON FUNCTION generate_coaemsp_report IS 'Generate comprehensive CoAEMSP annual report';
COMMENT ON FUNCTION get_student_affective_score IS 'Calculate student affective domain scores';
