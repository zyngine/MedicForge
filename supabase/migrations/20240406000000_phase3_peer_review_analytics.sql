-- Phase 3: Peer Review, Rubrics, ePortfolios, Analytics, and Advanced Features
-- MedicForge LMS

-- =====================================================
-- PEER REVIEW SYSTEM
-- =====================================================

-- Peer review assignments configuration
CREATE TABLE peer_review_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  reviews_per_student INTEGER NOT NULL DEFAULT 3,
  anonymous_reviews BOOLEAN DEFAULT true,
  self_review_allowed BOOLEAN DEFAULT false,
  review_rubric_id UUID, -- Optional: use specific rubric for reviews
  review_due_date TIMESTAMPTZ,
  review_instructions TEXT,
  min_word_count INTEGER,
  assignment_method TEXT DEFAULT 'random', -- 'random', 'manual', 'balanced'
  status TEXT DEFAULT 'setup', -- 'setup', 'distributing', 'reviewing', 'completed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id)
);

-- Peer review assignments (who reviews whom)
CREATE TABLE peer_review_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  peer_review_assignment_id UUID NOT NULL REFERENCES peer_review_assignments(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id),
  author_id UUID NOT NULL REFERENCES users(id),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'skipped'
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(peer_review_assignment_id, reviewer_id, author_id)
);

-- Peer reviews
CREATE TABLE peer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  peer_review_pair_id UUID NOT NULL REFERENCES peer_review_pairs(id) ON DELETE CASCADE,
  overall_score DECIMAL(5,2),
  overall_feedback TEXT,
  rubric_scores JSONB, -- {criterion_id: {score, feedback}}
  strengths TEXT,
  areas_for_improvement TEXT,
  private_notes TEXT, -- Notes only visible to instructor
  is_helpful BOOLEAN, -- Author can rate if review was helpful
  helpfulness_feedback TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(peer_review_pair_id)
);

-- =====================================================
-- RUBRIC SYSTEM
-- =====================================================

-- Rubrics
CREATE TABLE rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  rubric_type TEXT DEFAULT 'analytic', -- 'analytic', 'holistic', 'single_point'
  is_template BOOLEAN DEFAULT false,
  is_shared BOOLEAN DEFAULT false,
  total_points DECIMAL(6,2),
  hide_score_from_students BOOLEAN DEFAULT false,
  free_form_comments_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rubric criteria (rows)
CREATE TABLE rubric_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rubric_id UUID NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  long_description TEXT,
  points DECIMAL(5,2) NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rubric ratings (columns/levels for each criterion)
CREATE TABLE rubric_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES rubric_criteria(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- e.g., "Excellent", "Good", "Needs Improvement"
  description TEXT NOT NULL,
  points DECIMAL(5,2) NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rubric assessments (grading with rubric)
CREATE TABLE rubric_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rubric_id UUID NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  assessor_id UUID NOT NULL REFERENCES users(id),
  total_score DECIMAL(6,2),
  overall_comments TEXT,
  is_draft BOOLEAN DEFAULT true,
  assessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rubric_id, submission_id, assessor_id)
);

-- Rubric assessment scores (per criterion)
CREATE TABLE rubric_assessment_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES rubric_assessments(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES rubric_criteria(id) ON DELETE CASCADE,
  rating_id UUID REFERENCES rubric_ratings(id), -- Selected rating
  custom_points DECIMAL(5,2), -- Override points
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assessment_id, criterion_id)
);

-- =====================================================
-- OUTCOMES/COMPETENCY MAPPING
-- =====================================================

-- Learning outcomes
CREATE TABLE learning_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  outcome_code TEXT, -- e.g., "CLO1", "PLO2"
  outcome_type TEXT DEFAULT 'course', -- 'course', 'program', 'institutional'
  parent_outcome_id UUID REFERENCES learning_outcomes(id),
  mastery_threshold DECIMAL(5,2) DEFAULT 70.0, -- % needed to demonstrate mastery
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outcome alignments (linking outcomes to assessments)
CREATE TABLE outcome_alignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  outcome_id UUID NOT NULL REFERENCES learning_outcomes(id) ON DELETE CASCADE,
  alignable_type TEXT NOT NULL, -- 'assignment', 'quiz_question', 'rubric_criterion', 'lesson'
  alignable_id UUID NOT NULL,
  alignment_strength TEXT DEFAULT 'aligned', -- 'introduced', 'reinforced', 'aligned', 'mastery'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(outcome_id, alignable_type, alignable_id)
);

-- Student outcome mastery
CREATE TABLE student_outcome_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id),
  outcome_id UUID NOT NULL REFERENCES learning_outcomes(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id),
  mastery_score DECIMAL(5,2), -- Calculated percentage
  attempts_count INTEGER DEFAULT 0,
  mastery_achieved BOOLEAN DEFAULT false,
  mastery_achieved_at TIMESTAMPTZ,
  last_assessed TIMESTAMPTZ,
  score_history JSONB DEFAULT '[]', -- Array of {date, score, source}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, outcome_id, course_id)
);

-- =====================================================
-- ePORTFOLIOS
-- =====================================================

-- Portfolios
CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  portfolio_type TEXT DEFAULT 'showcase', -- 'showcase', 'learning', 'assessment'
  is_public BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  theme TEXT DEFAULT 'default',
  custom_css TEXT,
  cover_image_url TEXT,
  layout_config JSONB DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio sections
CREATE TABLE portfolio_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  section_type TEXT DEFAULT 'custom', -- 'custom', 'about', 'education', 'experience', 'skills', 'projects', 'certifications'
  content TEXT, -- Rich text content
  order_index INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio artifacts (items within sections)
CREATE TABLE portfolio_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES portfolio_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  artifact_type TEXT NOT NULL, -- 'submission', 'file', 'link', 'text', 'image', 'video', 'certificate'
  source_type TEXT, -- 'assignment', 'clinical', 'skill', 'external'
  source_id UUID, -- Reference to original item
  file_url TEXT,
  external_url TEXT,
  content TEXT,
  thumbnail_url TEXT,
  tags TEXT[],
  reflection TEXT, -- Student reflection on the artifact
  order_index INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio sharing
CREATE TABLE portfolio_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  share_type TEXT NOT NULL, -- 'link', 'email', 'user'
  share_token TEXT UNIQUE,
  shared_with_email TEXT,
  shared_with_user_id UUID REFERENCES users(id),
  permissions TEXT DEFAULT 'view', -- 'view', 'comment'
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COURSE TEMPLATES/BLUEPRINTS
-- =====================================================

-- Course templates
CREATE TABLE course_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  course_type TEXT, -- 'EMR', 'EMT', 'AEMT', 'Paramedic', 'Custom'
  thumbnail_url TEXT,
  is_published BOOLEAN DEFAULT false,
  is_official BOOLEAN DEFAULT false, -- MedicForge official templates
  usage_count INTEGER DEFAULT 0,
  template_data JSONB NOT NULL, -- Complete course structure
  includes_content BOOLEAN DEFAULT true,
  includes_assignments BOOLEAN DEFAULT true,
  includes_rubrics BOOLEAN DEFAULT true,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blueprint courses (linked courses that sync)
CREATE TABLE blueprint_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  blueprint_course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  associated_course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  sync_content BOOLEAN DEFAULT true,
  sync_assignments BOOLEAN DEFAULT true,
  sync_due_dates BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blueprint_course_id, associated_course_id)
);

-- Blueprint sync history
CREATE TABLE blueprint_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  blueprint_course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  synced_by UUID NOT NULL REFERENCES users(id),
  sync_type TEXT NOT NULL, -- 'full', 'content', 'assignments'
  items_synced INTEGER DEFAULT 0,
  errors JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PREREQUISITES & RELEASE CONDITIONS
-- =====================================================

-- Prerequisites
CREATE TABLE prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL, -- 'module', 'lesson', 'assignment', 'quiz'
  target_id UUID NOT NULL,
  prerequisite_type TEXT NOT NULL, -- 'module', 'lesson', 'assignment', 'quiz', 'score'
  prerequisite_id UUID NOT NULL,
  requirement_type TEXT DEFAULT 'completion', -- 'completion', 'score', 'view'
  minimum_score DECIMAL(5,2), -- For score requirements
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(target_type, target_id, prerequisite_type, prerequisite_id)
);

-- Content release conditions
CREATE TABLE release_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'module', 'lesson', 'assignment'
  content_id UUID NOT NULL,
  condition_type TEXT NOT NULL, -- 'date', 'score', 'completion', 'group', 'manual'
  condition_data JSONB NOT NULL, -- {date: '', itemId: '', minScore: '', groupId: ''}
  logic_operator TEXT DEFAULT 'and', -- 'and', 'or' for multiple conditions
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student content access tracking
CREATE TABLE student_content_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  is_unlocked BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMPTZ,
  unlock_reason TEXT, -- 'prerequisite', 'date', 'manual', 'exemption'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, content_type, content_id)
);

-- =====================================================
-- ANALYTICS DASHBOARD
-- =====================================================

-- Analytics events
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  event_type TEXT NOT NULL, -- 'page_view', 'video_watch', 'assignment_start', 'quiz_submit', etc.
  event_data JSONB,
  session_id TEXT,
  device_type TEXT,
  browser TEXT,
  ip_address TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated daily metrics
CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  course_id UUID REFERENCES courses(id),
  metric_type TEXT NOT NULL, -- 'active_users', 'submissions', 'page_views', 'video_minutes', etc.
  metric_value DECIMAL(12,2) NOT NULL,
  breakdown JSONB, -- Additional breakdown by hour, content, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, metric_date, course_id, metric_type)
);

-- Student engagement scores
CREATE TABLE student_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  login_count INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  assignments_submitted INTEGER DEFAULT 0,
  discussions_posted INTEGER DEFAULT 0,
  videos_watched INTEGER DEFAULT 0,
  engagement_score DECIMAL(5,2), -- Calculated 0-100
  risk_level TEXT, -- 'low', 'medium', 'high'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, course_id, week_start)
);

-- =====================================================
-- GRADEBOOK EXPORT
-- =====================================================

-- Export templates
CREATE TABLE gradebook_export_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  export_format TEXT NOT NULL, -- 'csv', 'xlsx', 'pdf', 'sis'
  column_config JSONB NOT NULL, -- Columns to include, order, formatting
  filter_config JSONB, -- Default filters
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Export history
CREATE TABLE gradebook_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  exported_by UUID NOT NULL REFERENCES users(id),
  template_id UUID REFERENCES gradebook_export_templates(id),
  export_format TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  record_count INTEGER,
  filters_applied JSONB,
  exported_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PLAGIARISM DETECTION
-- =====================================================

-- Plagiarism check settings
CREATE TABLE plagiarism_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  check_student_papers BOOLEAN DEFAULT true, -- Compare against other students
  check_internet BOOLEAN DEFAULT true, -- Check against internet sources
  check_publications BOOLEAN DEFAULT false, -- Check against publications database
  exclude_quoted BOOLEAN DEFAULT true,
  exclude_bibliography BOOLEAN DEFAULT true,
  exclude_small_matches INTEGER DEFAULT 10, -- Words
  allow_resubmission BOOLEAN DEFAULT true,
  show_report_to_students BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id)
);

-- Plagiarism reports
CREATE TABLE plagiarism_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  similarity_score DECIMAL(5,2), -- Overall percentage
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'error'
  report_url TEXT,
  sources JSONB, -- Array of {url, title, percentage, matched_text}
  word_count INTEGER,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Peer review
CREATE INDEX idx_peer_review_assignments_assignment ON peer_review_assignments(assignment_id);
CREATE INDEX idx_peer_review_pairs_reviewer ON peer_review_pairs(reviewer_id);
CREATE INDEX idx_peer_review_pairs_author ON peer_review_pairs(author_id);
CREATE INDEX idx_peer_reviews_pair ON peer_reviews(peer_review_pair_id);

-- Rubrics
CREATE INDEX idx_rubrics_tenant ON rubrics(tenant_id);
CREATE INDEX idx_rubric_criteria_rubric ON rubric_criteria(rubric_id);
CREATE INDEX idx_rubric_ratings_criterion ON rubric_ratings(criterion_id);
CREATE INDEX idx_rubric_assessments_submission ON rubric_assessments(submission_id);

-- Outcomes
CREATE INDEX idx_learning_outcomes_course ON learning_outcomes(course_id);
CREATE INDEX idx_outcome_alignments_outcome ON outcome_alignments(outcome_id);
CREATE INDEX idx_student_outcome_mastery_student ON student_outcome_mastery(student_id);

-- Portfolios
CREATE INDEX idx_portfolios_owner ON portfolios(owner_id);
CREATE INDEX idx_portfolio_sections_portfolio ON portfolio_sections(portfolio_id);
CREATE INDEX idx_portfolio_artifacts_section ON portfolio_artifacts(section_id);
CREATE INDEX idx_portfolio_shares_token ON portfolio_shares(share_token);

-- Templates
CREATE INDEX idx_course_templates_tenant ON course_templates(tenant_id);
CREATE INDEX idx_blueprint_courses_blueprint ON blueprint_courses(blueprint_course_id);

-- Prerequisites
CREATE INDEX idx_prerequisites_target ON prerequisites(target_type, target_id);
CREATE INDEX idx_release_conditions_content ON release_conditions(content_type, content_id);
CREATE INDEX idx_student_content_access_student ON student_content_access(student_id);

-- Analytics
CREATE INDEX idx_analytics_events_tenant ON analytics_events(tenant_id);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX idx_daily_metrics_date ON daily_metrics(metric_date);
CREATE INDEX idx_student_engagement_student ON student_engagement(student_id);

-- Plagiarism
CREATE INDEX idx_plagiarism_reports_submission ON plagiarism_reports(submission_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Distribute peer reviews randomly
CREATE OR REPLACE FUNCTION distribute_peer_reviews(
  p_peer_review_assignment_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_config peer_review_assignments;
  v_submissions RECORD;
  v_reviewers UUID[];
  v_author_id UUID;
  v_reviewer_id UUID;
  v_assigned_count INTEGER := 0;
  v_review_count INTEGER;
  i INTEGER;
BEGIN
  -- Get configuration
  SELECT * INTO v_config FROM peer_review_assignments WHERE id = p_peer_review_assignment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Peer review assignment not found';
  END IF;

  -- Get all submissions for this assignment
  FOR v_submissions IN
    SELECT s.id, s.student_id
    FROM submissions s
    WHERE s.assignment_id = v_config.assignment_id
      AND s.status = 'submitted'
  LOOP
    v_author_id := v_submissions.student_id;

    -- Get potential reviewers (other students who submitted)
    SELECT array_agg(s.student_id) INTO v_reviewers
    FROM submissions s
    WHERE s.assignment_id = v_config.assignment_id
      AND s.status = 'submitted'
      AND s.student_id != v_author_id
      AND (v_config.self_review_allowed OR s.student_id != v_author_id);

    IF v_reviewers IS NULL OR array_length(v_reviewers, 1) < v_config.reviews_per_student THEN
      CONTINUE; -- Not enough reviewers
    END IF;

    -- Shuffle reviewers
    v_reviewers := ARRAY(SELECT unnest(v_reviewers) ORDER BY random());

    -- Assign reviewers
    v_review_count := 0;
    FOREACH v_reviewer_id IN ARRAY v_reviewers
    LOOP
      IF v_review_count >= v_config.reviews_per_student THEN
        EXIT;
      END IF;

      -- Check if this pair already exists
      IF NOT EXISTS (
        SELECT 1 FROM peer_review_pairs
        WHERE peer_review_assignment_id = p_peer_review_assignment_id
          AND reviewer_id = v_reviewer_id
          AND author_id = v_author_id
      ) THEN
        INSERT INTO peer_review_pairs (
          tenant_id, peer_review_assignment_id, reviewer_id, author_id, submission_id
        ) VALUES (
          v_config.tenant_id, p_peer_review_assignment_id, v_reviewer_id, v_author_id, v_submissions.id
        );

        v_review_count := v_review_count + 1;
        v_assigned_count := v_assigned_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  -- Update status
  UPDATE peer_review_assignments
  SET status = 'reviewing', updated_at = NOW()
  WHERE id = p_peer_review_assignment_id;

  RETURN v_assigned_count;
END;
$$ LANGUAGE plpgsql;

-- Calculate student outcome mastery
CREATE OR REPLACE FUNCTION calculate_outcome_mastery(
  p_student_id UUID,
  p_outcome_id UUID,
  p_course_id UUID DEFAULT NULL
) RETURNS DECIMAL AS $$
DECLARE
  v_outcome learning_outcomes;
  v_total_points DECIMAL := 0;
  v_earned_points DECIMAL := 0;
  v_alignment RECORD;
  v_score DECIMAL;
BEGIN
  SELECT * INTO v_outcome FROM learning_outcomes WHERE id = p_outcome_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Get all alignments for this outcome
  FOR v_alignment IN
    SELECT * FROM outcome_alignments WHERE outcome_id = p_outcome_id
  LOOP
    -- Get score based on alignable type
    IF v_alignment.alignable_type = 'assignment' THEN
      SELECT final_score INTO v_score
      FROM submissions
      WHERE assignment_id = v_alignment.alignable_id
        AND student_id = p_student_id
        AND status = 'graded';

      IF v_score IS NOT NULL THEN
        SELECT points_possible INTO v_total_points
        FROM assignments WHERE id = v_alignment.alignable_id;

        v_earned_points := v_earned_points + v_score;
        v_total_points := v_total_points + COALESCE(v_total_points, 0);
      END IF;

    ELSIF v_alignment.alignable_type = 'rubric_criterion' THEN
      SELECT ras.custom_points INTO v_score
      FROM rubric_assessment_scores ras
      JOIN rubric_assessments ra ON ras.assessment_id = ra.id
      JOIN submissions s ON ra.submission_id = s.id
      WHERE ras.criterion_id = v_alignment.alignable_id
        AND s.student_id = p_student_id;

      IF v_score IS NOT NULL THEN
        SELECT points INTO v_total_points
        FROM rubric_criteria WHERE id = v_alignment.alignable_id;

        v_earned_points := v_earned_points + v_score;
        v_total_points := v_total_points + COALESCE(v_total_points, 0);
      END IF;
    END IF;
  END LOOP;

  IF v_total_points = 0 THEN
    RETURN NULL;
  END IF;

  RETURN ROUND((v_earned_points / v_total_points) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Check prerequisite completion
CREATE OR REPLACE FUNCTION check_prerequisites_met(
  p_student_id UUID,
  p_target_type TEXT,
  p_target_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_prereq RECORD;
  v_met BOOLEAN;
BEGIN
  FOR v_prereq IN
    SELECT * FROM prerequisites
    WHERE target_type = p_target_type AND target_id = p_target_id
  LOOP
    v_met := FALSE;

    IF v_prereq.requirement_type = 'completion' THEN
      -- Check if prerequisite item is completed
      IF v_prereq.prerequisite_type = 'module' THEN
        v_met := EXISTS (
          SELECT 1 FROM student_content_access
          WHERE student_id = p_student_id
            AND content_type = 'module'
            AND content_id = v_prereq.prerequisite_id
            AND is_unlocked = true
        );
      ELSIF v_prereq.prerequisite_type = 'assignment' THEN
        v_met := EXISTS (
          SELECT 1 FROM submissions
          WHERE student_id = p_student_id
            AND assignment_id = v_prereq.prerequisite_id
            AND status IN ('submitted', 'graded')
        );
      END IF;

    ELSIF v_prereq.requirement_type = 'score' THEN
      -- Check if minimum score is achieved
      SELECT final_score >= v_prereq.minimum_score INTO v_met
      FROM submissions
      WHERE student_id = p_student_id
        AND assignment_id = v_prereq.prerequisite_id
        AND status = 'graded';
    END IF;

    IF NOT COALESCE(v_met, FALSE) THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(
  p_student_id UUID,
  p_course_id UUID,
  p_week_start DATE
) RETURNS DECIMAL AS $$
DECLARE
  v_score DECIMAL := 0;
  v_login_count INTEGER;
  v_page_views INTEGER;
  v_time_spent INTEGER;
  v_submissions INTEGER;
  v_discussions INTEGER;
  v_videos INTEGER;
BEGIN
  -- Get metrics
  SELECT
    COALESCE(login_count, 0),
    COALESCE(page_views, 0),
    COALESCE(time_spent_minutes, 0),
    COALESCE(assignments_submitted, 0),
    COALESCE(discussions_posted, 0),
    COALESCE(videos_watched, 0)
  INTO v_login_count, v_page_views, v_time_spent, v_submissions, v_discussions, v_videos
  FROM student_engagement
  WHERE student_id = p_student_id
    AND course_id = p_course_id
    AND week_start = p_week_start;

  -- Calculate weighted score (customize weights as needed)
  v_score := (
    LEAST(v_login_count * 5, 20) +           -- Max 20 points for logins
    LEAST(v_page_views * 0.5, 15) +          -- Max 15 points for page views
    LEAST(v_time_spent * 0.2, 25) +          -- Max 25 points for time
    LEAST(v_submissions * 10, 20) +          -- Max 20 points for submissions
    LEAST(v_discussions * 5, 10) +           -- Max 10 points for discussions
    LEAST(v_videos * 2, 10)                  -- Max 10 points for videos
  );

  RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE peer_review_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_review_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_assessment_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_alignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_outcome_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE blueprint_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_content_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE gradebook_export_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE gradebook_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE plagiarism_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE plagiarism_reports ENABLE ROW LEVEL SECURITY;

-- Peer reviews: Reviewers see assigned, authors see received
CREATE POLICY "View peer review assignments"
  ON peer_review_pairs FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (reviewer_id = auth.uid() OR author_id = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor'))
  );

-- Rubrics: Shared or owned
CREATE POLICY "View rubrics"
  ON rubrics FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (is_shared = true OR created_by = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor'))
  );

CREATE POLICY "Manage rubrics"
  ON rubrics FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (created_by = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor'))
  );

-- Portfolios: Owners manage, public viewable
CREATE POLICY "View portfolios"
  ON portfolios FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (owner_id = auth.uid() OR is_public = true
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor'))
  );

CREATE POLICY "Manage own portfolios"
  ON portfolios FOR ALL
  USING (owner_id = auth.uid());

-- Student outcome mastery: Own or instructor
CREATE POLICY "View own mastery"
  ON student_outcome_mastery FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (student_id = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor'))
  );

-- Analytics: Instructors see course, students see own
CREATE POLICY "View analytics"
  ON analytics_events FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (user_id = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor'))
  );

CREATE POLICY "Insert own analytics"
  ON analytics_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Student engagement: Own or instructor
CREATE POLICY "View engagement"
  ON student_engagement FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (student_id = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor'))
  );
