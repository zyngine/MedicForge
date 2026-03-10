-- =============================================================================
-- CE Platform Initial Schema
-- All tables prefixed with ce_ — completely separate from LMS tables.
-- Built to CAPCE standards from day one.
-- =============================================================================

-- ============================================
-- HELPER FUNCTIONS (performance-optimized)
-- ============================================

CREATE OR REPLACE FUNCTION get_ce_user_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT id FROM ce_users WHERE id = (SELECT auth.uid())
$$;

CREATE OR REPLACE FUNCTION get_ce_user_role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT role FROM ce_users WHERE id = (SELECT auth.uid())
$$;

CREATE OR REPLACE FUNCTION get_ce_user_agency_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT agency_id FROM ce_users WHERE id = (SELECT auth.uid())
$$;

-- ============================================
-- AGENCIES
-- ============================================

CREATE TABLE IF NOT EXISTS ce_agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  city text,
  state text,
  zip text,
  phone text,
  admin_user_id uuid, -- set after first admin registers
  subscription_tier text DEFAULT 'starter', -- starter, team, agency, enterprise, enterprise_plus, custom
  subscription_start date,
  subscription_end date,
  invite_code text UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ce_agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE admins can manage all agencies"
  ON ce_agencies FOR ALL
  USING (get_ce_user_role() = 'admin');

CREATE POLICY "Agency admins can view own agency"
  ON ce_agencies FOR SELECT
  USING (
    get_ce_user_role() = 'agency_admin'
    AND id = get_ce_user_agency_id()
  );

CREATE POLICY "Agency admins can update own agency"
  ON ce_agencies FOR UPDATE
  USING (
    get_ce_user_role() = 'agency_admin'
    AND id = get_ce_user_agency_id()
  );

-- ============================================
-- CE USERS
-- ============================================

CREATE TABLE IF NOT EXISTS ce_users (
  id uuid PRIMARY KEY, -- matches auth.users.id
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  nremt_id text,
  certification_level text, -- EMR, EMT, AEMT, Paramedic
  state text,
  agency_id uuid REFERENCES ce_agencies(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'user', -- user, agency_admin, committee_member, medical_director, admin
  preferred_language text DEFAULT 'en',
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ce_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own CE profile"
  ON ce_users FOR SELECT
  USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update own CE profile"
  ON ce_users FOR UPDATE
  USING (id = (SELECT auth.uid()));

CREATE POLICY "CE admins can view all CE users"
  ON ce_users FOR SELECT
  USING (get_ce_user_role() = 'admin');

CREATE POLICY "CE admins can manage CE users"
  ON ce_users FOR ALL
  USING (get_ce_user_role() = 'admin');

CREATE POLICY "Agency admins can view own agency users"
  ON ce_users FOR SELECT
  USING (
    get_ce_user_role() = 'agency_admin'
    AND agency_id = get_ce_user_agency_id()
  );

-- For setup: allow insert when no row exists yet (service role handles this via API)
-- Note: inserts go through setup-ce-user API (service role) so no RLS INSERT policy needed

-- ============================================
-- AGENCY INVITE CODES
-- ============================================

CREATE TABLE IF NOT EXISTS ce_agency_invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES ce_agencies(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  expires_at timestamptz,
  max_uses int DEFAULT 100,
  uses_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ce_agency_invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE admins can manage invite codes"
  ON ce_agency_invite_codes FOR ALL
  USING (get_ce_user_role() = 'admin');

CREATE POLICY "Agency admins can manage own invite codes"
  ON ce_agency_invite_codes FOR ALL
  USING (
    get_ce_user_role() = 'agency_admin'
    AND agency_id = get_ce_user_agency_id()
  );

-- ============================================
-- COMMITTEE MEMBERS
-- ============================================

CREATE TABLE IF NOT EXISTS ce_committee_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES ce_users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member', -- chair, medical_director, member, secretary
  credentials text, -- "MD, FACEP" or "NRP, FP-C"
  employer text,
  cv_url text,
  bio text,
  term_start date,
  term_end date,
  status text DEFAULT 'active', -- active, inactive, resigned
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ce_committee_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE admins can manage committee members"
  ON ce_committee_members FOR ALL
  USING (get_ce_user_role() = 'admin');

CREATE POLICY "Committee members can view all members"
  ON ce_committee_members FOR SELECT
  USING (get_ce_user_role() IN ('admin', 'committee_member', 'medical_director'));

-- ============================================
-- INSTRUCTORS
-- ============================================

CREATE TABLE IF NOT EXISTS ce_instructors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES ce_users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  credentials text, -- "NRP, FP-C, CCEMT-P"
  bio text,
  headshot_url text,
  cv_url text, -- REQUIRED for CAPCE
  employer text,
  years_experience int,
  expertise_areas jsonb DEFAULT '[]', -- ["Cardiology", "Trauma", "Airway"]
  is_medical_director boolean DEFAULT false,
  status text DEFAULT 'active', -- active, inactive
  coi_form_id uuid, -- set after COI form submitted
  coi_expires_at date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ce_instructors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE admins can manage instructors"
  ON ce_instructors FOR ALL
  USING (get_ce_user_role() = 'admin');

CREATE POLICY "CE users can view active instructors"
  ON ce_instructors FOR SELECT
  USING (status = 'active');

-- ============================================
-- COURSES
-- ============================================

CREATE TABLE IF NOT EXISTS ce_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_number text UNIQUE, -- MF-2026-001
  title text NOT NULL,
  description text,
  category text, -- Airway, Cardiology, Trauma, Medical, Operations, Pediatric, OB, Behavioral
  subcategory text,
  ceh_hours decimal NOT NULL DEFAULT 1.0,
  nremt_category text DEFAULT 'National', -- National, Local, Individual
  capce_course_number text, -- assigned after CAPCE accreditation
  is_capce_accredited boolean DEFAULT false,
  course_type text DEFAULT 'standard', -- standard, refresher, protocol_update, skills
  delivery_method text DEFAULT 'online_self_paced', -- online_self_paced, online_live, blended, in_person
  is_agency_custom boolean DEFAULT false,
  created_by_agency_id uuid REFERENCES ce_agencies(id) ON DELETE SET NULL,
  price decimal,
  is_free boolean DEFAULT false,
  passing_score int DEFAULT 70,
  expiration_months int,
  target_audience text,
  prerequisites text,
  certification_levels jsonb DEFAULT '[]', -- ["EMT", "AEMT", "Paramedic"]
  language text DEFAULT 'en',
  translated_from_course_id uuid REFERENCES ce_courses(id) ON DELETE SET NULL,
  version int DEFAULT 1,
  version_notes text,
  requires_retake_on_update boolean DEFAULT false,
  previous_version_id uuid REFERENCES ce_courses(id) ON DELETE SET NULL,

  -- CAPCE Required Fields
  disclosure_statement text, -- conflicts of interest disclosure
  has_commercial_support boolean DEFAULT false,
  commercial_supporter_name text,
  commercial_support_disclosure text,
  off_label_use_disclosure text,
  evidence_basis text,

  -- Workflow Status
  status text DEFAULT 'draft', -- draft, pending_committee_review, revisions_requested, approved, published, archived
  submitted_for_review_at timestamptz,
  committee_reviewed_at timestamptz,
  committee_decision text, -- approved, approved_with_revisions, rejected
  committee_notes text,
  medical_director_approved boolean DEFAULT false,
  medical_director_approved_at timestamptz,
  medical_director_notes text,
  published_at timestamptz,
  archived_at timestamptz,
  archive_reason text,

  -- Beta
  is_beta boolean DEFAULT false,
  beta_feedback_enabled boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES ce_users(id) ON DELETE SET NULL
);

ALTER TABLE ce_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published courses visible to all authenticated CE users"
  ON ce_courses FOR SELECT
  USING (
    status = 'published'
    AND (SELECT auth.uid()) IS NOT NULL
  );

CREATE POLICY "CE admins can manage all courses"
  ON ce_courses FOR ALL
  USING (get_ce_user_role() = 'admin');

CREATE POLICY "Agency custom courses visible to agency"
  ON ce_courses FOR SELECT
  USING (
    is_agency_custom = true
    AND created_by_agency_id = get_ce_user_agency_id()
  );

-- ============================================
-- COURSE OBJECTIVES
-- ============================================

CREATE TABLE IF NOT EXISTS ce_course_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES ce_courses(id) ON DELETE CASCADE,
  objective_text text NOT NULL,
  bloom_level text, -- knowledge, comprehension, application, analysis, synthesis, evaluation
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ce_course_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE course objectives follow course visibility"
  ON ce_course_objectives FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ce_courses
      WHERE id = ce_course_objectives.course_id
      AND (status = 'published' OR get_ce_user_role() = 'admin')
    )
  );

CREATE POLICY "CE admins can manage course objectives"
  ON ce_course_objectives FOR ALL
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- COURSE REFERENCES
-- ============================================

CREATE TABLE IF NOT EXISTS ce_course_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES ce_courses(id) ON DELETE CASCADE,
  reference_type text, -- journal, textbook, guideline, protocol, website
  citation text NOT NULL,
  url text,
  accessed_date date,
  sort_order int DEFAULT 0
);

ALTER TABLE ce_course_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE course references follow course visibility"
  ON ce_course_references FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ce_courses
      WHERE id = ce_course_references.course_id
      AND (status = 'published' OR get_ce_user_role() = 'admin')
    )
  );

CREATE POLICY "CE admins can manage course references"
  ON ce_course_references FOR ALL
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- COURSE INSTRUCTORS (junction)
-- ============================================

CREATE TABLE IF NOT EXISTS ce_course_instructors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES ce_courses(id) ON DELETE CASCADE,
  instructor_id uuid NOT NULL REFERENCES ce_instructors(id) ON DELETE CASCADE,
  role text DEFAULT 'presenter', -- presenter, author, reviewer, content_developer
  compensation_received boolean DEFAULT false,
  compensation_details text,
  UNIQUE(course_id, instructor_id)
);

ALTER TABLE ce_course_instructors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE admins can manage course instructors"
  ON ce_course_instructors FOR ALL
  USING (get_ce_user_role() = 'admin');

CREATE POLICY "Authenticated users can view course instructors for published courses"
  ON ce_course_instructors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ce_courses
      WHERE id = ce_course_instructors.course_id
      AND (status = 'published' OR get_ce_user_role() = 'admin')
    )
  );

-- ============================================
-- COMMITTEE MEETINGS
-- ============================================

CREATE TABLE IF NOT EXISTS ce_committee_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_date date NOT NULL,
  start_time time,
  end_time time,
  location text DEFAULT 'Video Conference',
  meeting_type text DEFAULT 'regular', -- regular, special, emergency
  status text DEFAULT 'scheduled', -- scheduled, completed, cancelled
  quorum_present boolean DEFAULT false,
  minutes_approved boolean DEFAULT false,
  minutes_approved_date date,
  previous_minutes_approved boolean DEFAULT false,
  old_business text,
  new_business text,
  needs_assessment_notes text,
  next_meeting_date date,
  adjourned_at time,
  created_by uuid REFERENCES ce_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ce_committee_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE admins and committee members can view meetings"
  ON ce_committee_meetings FOR SELECT
  USING (get_ce_user_role() IN ('admin', 'committee_member', 'medical_director'));

CREATE POLICY "CE admins can manage meetings"
  ON ce_committee_meetings FOR ALL
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- COMMITTEE MEETING ATTENDANCE
-- ============================================

CREATE TABLE IF NOT EXISTS ce_committee_meeting_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES ce_committee_meetings(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES ce_committee_members(id) ON DELETE CASCADE,
  present boolean DEFAULT false,
  notes text,
  UNIQUE(meeting_id, member_id)
);

ALTER TABLE ce_committee_meeting_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE admins and committee members can view attendance"
  ON ce_committee_meeting_attendance FOR SELECT
  USING (get_ce_user_role() IN ('admin', 'committee_member', 'medical_director'));

CREATE POLICY "CE admins can manage attendance"
  ON ce_committee_meeting_attendance FOR ALL
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- COMMITTEE MEETING MOTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS ce_committee_meeting_motions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES ce_committee_meetings(id) ON DELETE CASCADE,
  motion_text text NOT NULL,
  motion_type text DEFAULT 'other', -- approve_minutes, approve_course, other
  moved_by uuid REFERENCES ce_committee_members(id) ON DELETE SET NULL,
  seconded_by uuid REFERENCES ce_committee_members(id) ON DELETE SET NULL,
  votes_for int DEFAULT 0,
  votes_against int DEFAULT 0,
  votes_abstain int DEFAULT 0,
  passed boolean,
  related_course_id uuid REFERENCES ce_courses(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ce_committee_meeting_motions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE admins and committee members can view motions"
  ON ce_committee_meeting_motions FOR SELECT
  USING (get_ce_user_role() IN ('admin', 'committee_member', 'medical_director'));

CREATE POLICY "CE admins can manage motions"
  ON ce_committee_meeting_motions FOR ALL
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- COMMITTEE ACTION ITEMS
-- ============================================

CREATE TABLE IF NOT EXISTS ce_committee_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES ce_committee_meetings(id) ON DELETE CASCADE,
  description text NOT NULL,
  assigned_to uuid REFERENCES ce_committee_members(id) ON DELETE SET NULL,
  due_date date,
  status text DEFAULT 'pending', -- pending, completed, overdue
  completed_at timestamptz,
  notes text
);

ALTER TABLE ce_committee_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE admins and committee members can view action items"
  ON ce_committee_action_items FOR SELECT
  USING (get_ce_user_role() IN ('admin', 'committee_member', 'medical_director'));

CREATE POLICY "CE admins can manage action items"
  ON ce_committee_action_items FOR ALL
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- COURSE REVIEWS (by committee)
-- ============================================

CREATE TABLE IF NOT EXISTS ce_committee_course_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES ce_courses(id) ON DELETE CASCADE,
  meeting_id uuid REFERENCES ce_committee_meetings(id) ON DELETE SET NULL,
  review_type text DEFAULT 'initial', -- initial, revision, annual
  reviewed_by_medical_director boolean DEFAULT false,
  medical_director_id uuid REFERENCES ce_committee_members(id) ON DELETE SET NULL,
  medical_director_approved boolean,
  medical_director_notes text,
  medical_director_reviewed_at timestamptz,
  committee_vote_for int,
  committee_vote_against int,
  committee_vote_abstain int,
  committee_decision text, -- approved, approved_with_revisions, rejected, tabled
  committee_notes text,
  revisions_required text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ce_committee_course_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE admins and committee can view course reviews"
  ON ce_committee_course_reviews FOR SELECT
  USING (get_ce_user_role() IN ('admin', 'committee_member', 'medical_director'));

CREATE POLICY "CE admins can manage course reviews"
  ON ce_committee_course_reviews FOR ALL
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- CONFLICT OF INTEREST
-- ============================================

CREATE TABLE IF NOT EXISTS ce_conflict_of_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES ce_committee_members(id) ON DELETE CASCADE,
  instructor_id uuid REFERENCES ce_instructors(id) ON DELETE CASCADE,
  disclosure_date date NOT NULL,
  has_competing_ce_interest boolean DEFAULT false,
  competing_ce_details text,
  has_pharma_relationship boolean DEFAULT false,
  pharma_details text,
  has_ownership_interest boolean DEFAULT false,
  ownership_details text,
  has_royalties boolean DEFAULT false,
  royalties_details text,
  has_other_conflict boolean DEFAULT false,
  other_conflict_details text,
  attestation_signed boolean DEFAULT false,
  attestation_date timestamptz,
  reviewed_by uuid REFERENCES ce_users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_notes text,
  conflict_status text DEFAULT 'none', -- none, noted, managed
  expires_at date, -- annual renewal required
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ce_conflict_of_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE admins can manage COI forms"
  ON ce_conflict_of_interest FOR ALL
  USING (get_ce_user_role() = 'admin');

CREATE POLICY "Committee members can view COI forms"
  ON ce_conflict_of_interest FOR SELECT
  USING (get_ce_user_role() IN ('admin', 'committee_member', 'medical_director'));

-- ============================================
-- NEEDS ASSESSMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS ce_needs_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_date date NOT NULL,
  assessment_type text NOT NULL, -- survey, data_analysis, feedback_review, incident_analysis
  title text NOT NULL,
  description text,
  methodology text,
  sample_size int,
  findings text,
  recommended_topics jsonb DEFAULT '[]',
  priority text DEFAULT 'medium', -- high, medium, low
  addressed_by_courses jsonb DEFAULT '[]', -- array of course IDs
  created_by uuid REFERENCES ce_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ce_needs_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE admins and committee can view needs assessments"
  ON ce_needs_assessments FOR SELECT
  USING (get_ce_user_role() IN ('admin', 'committee_member', 'medical_director'));

CREATE POLICY "CE admins can manage needs assessments"
  ON ce_needs_assessments FOR ALL
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- ENROLLMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS ce_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES ce_users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES ce_courses(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES ce_users(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  due_date date,
  completion_status text DEFAULT 'enrolled', -- enrolled, in_progress, completed, expired, withdrawn
  completed_at timestamptz,
  progress_percentage int DEFAULT 0,
  UNIQUE(user_id, course_id)
);

ALTER TABLE ce_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own enrollments"
  ON ce_enrollments FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "CE admins can manage all enrollments"
  ON ce_enrollments FOR ALL
  USING (get_ce_user_role() = 'admin');

CREATE POLICY "Agency admins can view own agency enrollments"
  ON ce_enrollments FOR SELECT
  USING (
    get_ce_user_role() = 'agency_admin'
    AND EXISTS (
      SELECT 1 FROM ce_users u
      WHERE u.id = ce_enrollments.user_id
      AND u.agency_id = get_ce_user_agency_id()
    )
  );

CREATE POLICY "Agency admins can insert enrollments for agency users"
  ON ce_enrollments FOR INSERT
  WITH CHECK (
    get_ce_user_role() = 'agency_admin'
    AND EXISTS (
      SELECT 1 FROM ce_users u
      WHERE u.id = ce_enrollments.user_id
      AND u.agency_id = get_ce_user_agency_id()
    )
  );

-- ============================================
-- COURSE MODULES
-- ============================================

CREATE TABLE IF NOT EXISTS ce_course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES ce_courses(id) ON DELETE CASCADE,
  module_number int NOT NULL,
  title text NOT NULL,
  duration_minutes int DEFAULT 0,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ce_course_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled users can view course modules"
  ON ce_course_modules FOR SELECT
  USING (
    get_ce_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM ce_enrollments
      WHERE user_id = (SELECT auth.uid())
      AND course_id = ce_course_modules.course_id
      AND completion_status != 'withdrawn'
    )
  );

CREATE POLICY "CE admins can manage course modules"
  ON ce_course_modules FOR ALL
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- MODULE CONTENT
-- ============================================

CREATE TABLE IF NOT EXISTS ce_module_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES ce_course_modules(id) ON DELETE CASCADE,
  content_type text NOT NULL, -- text, video, pdf, image
  content_order int DEFAULT 0,
  title text,
  body text,
  video_url text,
  pdf_url text,
  image_url text,
  transcript text
);

ALTER TABLE ce_module_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled users can view module content"
  ON ce_module_content FOR SELECT
  USING (
    get_ce_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM ce_course_modules m
      JOIN ce_enrollments e ON e.course_id = m.course_id
      WHERE m.id = ce_module_content.module_id
      AND e.user_id = (SELECT auth.uid())
      AND e.completion_status != 'withdrawn'
    )
  );

CREATE POLICY "CE admins can manage module content"
  ON ce_module_content FOR ALL
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- MODULE PROGRESS
-- ============================================

CREATE TABLE IF NOT EXISTS ce_module_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES ce_enrollments(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES ce_course_modules(id) ON DELETE CASCADE,
  started_at timestamptz,
  completed_at timestamptz,
  time_spent_minutes int DEFAULT 0,
  progress_percentage int DEFAULT 0,
  last_accessed_at timestamptz DEFAULT now(),
  UNIQUE(enrollment_id, module_id)
);

ALTER TABLE ce_module_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own module progress"
  ON ce_module_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ce_enrollments
      WHERE id = ce_module_progress.enrollment_id
      AND user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update own module progress"
  ON ce_module_progress FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ce_enrollments
      WHERE id = ce_module_progress.enrollment_id
      AND user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "CE admins can view all module progress"
  ON ce_module_progress FOR SELECT
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- QUIZZES
-- ============================================

CREATE TABLE IF NOT EXISTS ce_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES ce_courses(id) ON DELETE CASCADE,
  quiz_type text DEFAULT 'post_test', -- pre_test, post_test, module_quiz, final_exam
  title text NOT NULL,
  description text,
  passing_score int DEFAULT 70,
  randomize_questions boolean DEFAULT true,
  max_attempts int DEFAULT 3,
  show_answers_after text DEFAULT 'after_passing', -- never, after_attempt, after_passing
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ce_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled users can view quizzes"
  ON ce_quizzes FOR SELECT
  USING (
    get_ce_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM ce_enrollments
      WHERE user_id = (SELECT auth.uid())
      AND course_id = ce_quizzes.course_id
      AND completion_status != 'withdrawn'
    )
  );

CREATE POLICY "CE admins can manage quizzes"
  ON ce_quizzes FOR ALL
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- QUIZ QUESTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS ce_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES ce_quizzes(id) ON DELETE CASCADE,
  question_type text DEFAULT 'multiple_choice', -- multiple_choice, true_false, matching
  question_text text NOT NULL,
  explanation text, -- shown after answer
  correct_answer text NOT NULL,
  difficulty text DEFAULT 'medium', -- easy, medium, hard
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ce_quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled users can view quiz questions"
  ON ce_quiz_questions FOR SELECT
  USING (
    get_ce_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM ce_quizzes q
      JOIN ce_enrollments e ON e.course_id = q.course_id
      WHERE q.id = ce_quiz_questions.quiz_id
      AND e.user_id = (SELECT auth.uid())
      AND e.completion_status != 'withdrawn'
    )
  );

CREATE POLICY "CE admins can manage quiz questions"
  ON ce_quiz_questions FOR ALL
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- QUIZ QUESTION OPTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS ce_quiz_question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES ce_quiz_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  option_order int DEFAULT 0
);

ALTER TABLE ce_quiz_question_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled users can view question options"
  ON ce_quiz_question_options FOR SELECT
  USING (
    get_ce_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM ce_quiz_questions qq
      JOIN ce_quizzes q ON q.id = qq.quiz_id
      JOIN ce_enrollments e ON e.course_id = q.course_id
      WHERE qq.id = ce_quiz_question_options.question_id
      AND e.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "CE admins can manage question options"
  ON ce_quiz_question_options FOR ALL
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- QUIZ ATTEMPTS
-- ============================================

CREATE TABLE IF NOT EXISTS ce_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES ce_enrollments(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES ce_quizzes(id) ON DELETE CASCADE,
  attempt_number int NOT NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  score int,
  is_passing boolean,
  answers jsonb DEFAULT '{}' -- {question_id: answer_text}
);

ALTER TABLE ce_quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz attempts"
  ON ce_quiz_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ce_enrollments
      WHERE id = ce_quiz_attempts.enrollment_id
      AND user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can insert own quiz attempts"
  ON ce_quiz_attempts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ce_enrollments
      WHERE id = ce_quiz_attempts.enrollment_id
      AND user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update own in-progress quiz attempts"
  ON ce_quiz_attempts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ce_enrollments
      WHERE id = ce_quiz_attempts.enrollment_id
      AND user_id = (SELECT auth.uid())
    )
    AND completed_at IS NULL
  );

CREATE POLICY "CE admins can view all quiz attempts"
  ON ce_quiz_attempts FOR SELECT
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- EVALUATIONS (required per CAPCE)
-- ============================================

CREATE TABLE IF NOT EXISTS ce_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES ce_enrollments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES ce_users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES ce_courses(id) ON DELETE CASCADE,
  submitted_at timestamptz DEFAULT now(),

  -- Likert scale (1-5)
  objectives_met int CHECK (objectives_met BETWEEN 1 AND 5),
  content_relevant int CHECK (content_relevant BETWEEN 1 AND 5),
  content_current int CHECK (content_current BETWEEN 1 AND 5),
  instructor_effective int CHECK (instructor_effective BETWEEN 1 AND 5),
  materials_quality int CHECK (materials_quality BETWEEN 1 AND 5),
  assessment_appropriate int CHECK (assessment_appropriate BETWEEN 1 AND 5),
  would_recommend int CHECK (would_recommend BETWEEN 1 AND 5),
  overall_rating int CHECK (overall_rating BETWEEN 1 AND 5),

  -- Open-ended
  most_valuable text,
  suggestions text,
  additional_topics text,
  comments text,

  -- Bias/Commercial detection
  perceived_bias boolean DEFAULT false,
  bias_description text,
  commercial_influence_perceived boolean DEFAULT false,
  commercial_influence_description text,

  created_at timestamptz DEFAULT now(),
  UNIQUE(enrollment_id)
);

ALTER TABLE ce_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and submit own evaluations"
  ON ce_evaluations FOR ALL
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "CE admins can view all evaluations"
  ON ce_evaluations FOR SELECT
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- EVALUATION SUMMARIES
-- ============================================

CREATE TABLE IF NOT EXISTS ce_evaluation_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES ce_courses(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_responses int DEFAULT 0,
  avg_objectives_met decimal,
  avg_content_relevant decimal,
  avg_content_current decimal,
  avg_instructor_effective decimal,
  avg_materials_quality decimal,
  avg_assessment_appropriate decimal,
  avg_would_recommend decimal,
  avg_overall_rating decimal,
  bias_reports_count int DEFAULT 0,
  commercial_influence_reports_count int DEFAULT 0,
  generated_at timestamptz DEFAULT now()
);

ALTER TABLE ce_evaluation_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE admins and committee can view evaluation summaries"
  ON ce_evaluation_summary FOR SELECT
  USING (get_ce_user_role() IN ('admin', 'committee_member', 'medical_director'));

CREATE POLICY "CE admins can manage evaluation summaries"
  ON ce_evaluation_summary FOR ALL
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- CERTIFICATES
-- ============================================

CREATE TABLE IF NOT EXISTS ce_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES ce_enrollments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES ce_users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES ce_courses(id) ON DELETE CASCADE,
  certificate_number text UNIQUE NOT NULL, -- MF-2026-12345
  issued_at timestamptz DEFAULT now(),
  expires_at date,
  pdf_url text,

  -- Denormalized for permanence
  user_name text NOT NULL,
  user_nremt_id text,
  course_title text NOT NULL,
  course_number text NOT NULL,
  ceh_hours decimal NOT NULL,
  completion_date date NOT NULL,
  provider_name text DEFAULT 'MedicForge - Summers Digital LLC',
  provider_address text,
  medical_director_name text,
  is_capce_accredited boolean DEFAULT false,
  capce_course_number text,

  -- Verification
  verification_code text UNIQUE NOT NULL,
  verified_count int DEFAULT 0,
  last_verified_at timestamptz
);

ALTER TABLE ce_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own certificates"
  ON ce_certificates FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "CE admins can manage all certificates"
  ON ce_certificates FOR ALL
  USING (get_ce_user_role() = 'admin');

-- Public verification by code (no auth required) — handled via API route with service role

-- ============================================
-- DISCUSSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS ce_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES ce_courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES ce_users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  reply_count int DEFAULT 0,
  like_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ce_discussions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enrolled users can view discussions"
  ON ce_discussions FOR SELECT
  USING (
    get_ce_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM ce_enrollments
      WHERE user_id = (SELECT auth.uid())
      AND course_id = ce_discussions.course_id
      AND completion_status != 'withdrawn'
    )
  );

CREATE POLICY "Enrolled users can post discussions"
  ON ce_discussions FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM ce_enrollments
      WHERE user_id = (SELECT auth.uid())
      AND course_id = ce_discussions.course_id
      AND completion_status != 'withdrawn'
    )
  );

CREATE POLICY "Users can update own discussions"
  ON ce_discussions FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "CE admins can manage all discussions"
  ON ce_discussions FOR ALL
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- DISCUSSION REPLIES
-- ============================================

CREATE TABLE IF NOT EXISTS ce_discussion_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id uuid NOT NULL REFERENCES ce_discussions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES ce_users(id) ON DELETE CASCADE,
  parent_reply_id uuid REFERENCES ce_discussion_replies(id) ON DELETE CASCADE,
  body text NOT NULL,
  like_count int DEFAULT 0,
  is_instructor_response boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ce_discussion_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view replies for enrolled course discussions"
  ON ce_discussion_replies FOR SELECT
  USING (
    get_ce_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM ce_discussions d
      JOIN ce_enrollments e ON e.course_id = d.course_id
      WHERE d.id = ce_discussion_replies.discussion_id
      AND e.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can post replies"
  ON ce_discussion_replies FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own replies"
  ON ce_discussion_replies FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "CE admins can manage all replies"
  ON ce_discussion_replies FOR ALL
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- DISCUSSION LIKES
-- ============================================

CREATE TABLE IF NOT EXISTS ce_discussion_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES ce_users(id) ON DELETE CASCADE,
  discussion_id uuid REFERENCES ce_discussions(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES ce_discussion_replies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT exactly_one_target CHECK (
    (discussion_id IS NOT NULL AND reply_id IS NULL) OR
    (discussion_id IS NULL AND reply_id IS NOT NULL)
  ),
  UNIQUE(user_id, discussion_id),
  UNIQUE(user_id, reply_id)
);

ALTER TABLE ce_discussion_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own likes"
  ON ce_discussion_likes FOR ALL
  USING (user_id = (SELECT auth.uid()));

-- ============================================
-- PURCHASES
-- ============================================

CREATE TABLE IF NOT EXISTS ce_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES ce_users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES ce_courses(id) ON DELETE CASCADE,
  amount decimal NOT NULL,
  square_payment_id text,
  purchased_at timestamptz DEFAULT now(),
  refunded boolean DEFAULT false,
  refunded_at timestamptz,
  refund_reason text
);

ALTER TABLE ce_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
  ON ce_purchases FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "CE admins can manage all purchases"
  ON ce_purchases FOR ALL
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- USER SUBSCRIPTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS ce_user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES ce_users(id) ON DELETE CASCADE,
  plan text NOT NULL, -- monthly, annual
  price decimal NOT NULL,
  starts_at date NOT NULL,
  expires_at date NOT NULL,
  square_subscription_id text,
  status text DEFAULT 'active', -- active, canceled, expired
  auto_renew boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ce_user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON ce_user_subscriptions FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "CE admins can manage all subscriptions"
  ON ce_user_subscriptions FOR ALL
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- AGENCY SUBSCRIPTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS ce_agency_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES ce_agencies(id) ON DELETE CASCADE,
  tier text NOT NULL, -- starter, team, agency, enterprise, enterprise_plus, custom
  plan_type text DEFAULT 'capce_only', -- capce_only, capce_plus_custom
  employee_count int,
  price decimal NOT NULL,
  starts_at date NOT NULL,
  expires_at date NOT NULL,
  wave_invoice_id text,
  payment_status text DEFAULT 'pending', -- pending, paid, overdue
  payment_received_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ce_agency_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE admins can manage agency subscriptions"
  ON ce_agency_subscriptions FOR ALL
  USING (get_ce_user_role() = 'admin');

CREATE POLICY "Agency admins can view own subscription"
  ON ce_agency_subscriptions FOR SELECT
  USING (
    get_ce_user_role() = 'agency_admin'
    AND agency_id = get_ce_user_agency_id()
  );

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS ce_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES ce_users(id) ON DELETE CASCADE,
  type text NOT NULL, -- course_assigned, due_reminder, completed, certificate_ready, etc.
  title text NOT NULL,
  message text NOT NULL,
  link text,
  read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ce_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notifications"
  ON ce_notifications FOR ALL
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "CE admins can view all notifications"
  ON ce_notifications FOR SELECT
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- EMAIL LOG
-- ============================================

CREATE TABLE IF NOT EXISTS ce_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES ce_users(id) ON DELETE SET NULL,
  email_type text NOT NULL,
  subject text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  status text DEFAULT 'sent', -- sent, delivered, bounced, failed
  resend_message_id text
);

ALTER TABLE ce_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE admins can view email log"
  ON ce_email_log FOR ALL
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- CAPCE SUBMISSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS ce_capce_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_date date NOT NULL,
  submission_type text DEFAULT 'manual', -- manual, api
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_records int DEFAULT 0,
  file_url text,
  status text DEFAULT 'pending', -- pending, submitted, confirmed, error
  confirmation_number text,
  error_message text,
  submitted_by uuid REFERENCES ce_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ce_capce_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE admins can manage CAPCE submissions"
  ON ce_capce_submissions FOR ALL
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- CAPCE SUBMISSION RECORDS
-- ============================================

CREATE TABLE IF NOT EXISTS ce_capce_submission_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES ce_capce_submissions(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES ce_enrollments(id) ON DELETE CASCADE,
  user_nremt_id text NOT NULL,
  user_name text NOT NULL,
  course_number text NOT NULL,
  course_title text NOT NULL,
  ceh_hours decimal NOT NULL,
  completion_date date NOT NULL,
  status text DEFAULT 'pending', -- pending, reported, error
  error_message text
);

ALTER TABLE ce_capce_submission_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE admins can manage CAPCE submission records"
  ON ce_capce_submission_records FOR ALL
  USING (get_ce_user_role() = 'admin');

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ce_users_email ON ce_users(email);
CREATE INDEX IF NOT EXISTS idx_ce_users_agency_id ON ce_users(agency_id);
CREATE INDEX IF NOT EXISTS idx_ce_enrollments_user_id ON ce_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_ce_enrollments_course_id ON ce_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_ce_enrollments_status ON ce_enrollments(completion_status);
CREATE INDEX IF NOT EXISTS idx_ce_courses_status ON ce_courses(status);
CREATE INDEX IF NOT EXISTS idx_ce_courses_category ON ce_courses(category);
CREATE INDEX IF NOT EXISTS idx_ce_certificates_user_id ON ce_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_ce_certificates_verification_code ON ce_certificates(verification_code);
CREATE INDEX IF NOT EXISTS idx_ce_quiz_attempts_enrollment_id ON ce_quiz_attempts(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_ce_notifications_user_id ON ce_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_ce_discussions_course_id ON ce_discussions(course_id);
