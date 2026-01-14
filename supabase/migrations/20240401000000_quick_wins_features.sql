-- Quick Wins Features Migration
-- Migration: 20240401000000_quick_wins_features.sql

-- ============================================
-- QUICK WIN 1: Question Tagging System
-- ============================================

-- Question tags table
CREATE TABLE IF NOT EXISTS question_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT 'blue',
  category TEXT, -- e.g., 'topic', 'difficulty', 'nremt_category', 'cognitive_level'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- Junction table for questions to tags (many-to-many)
CREATE TABLE IF NOT EXISTS quiz_question_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES question_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id, tag_id)
);

-- Predefined NREMT categories
CREATE TABLE IF NOT EXISTS nremt_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  certification_level TEXT NOT NULL, -- EMR, EMT, AEMT, Paramedic
  weight_percentage DECIMAL(5,2), -- Weight on actual NREMT exam
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert standard NREMT categories
INSERT INTO nremt_categories (code, name, certification_level, weight_percentage, description) VALUES
-- EMT Categories
('EMT-AIRWAY', 'Airway, Respiration & Ventilation', 'EMT', 18, 'Airway management, oxygen therapy, ventilation'),
('EMT-CARDIO', 'Cardiology & Resuscitation', 'EMT', 20, 'Cardiac emergencies, CPR, AED'),
('EMT-TRAUMA', 'Trauma', 'EMT', 14, 'Bleeding control, shock, musculoskeletal injuries'),
('EMT-MEDICAL', 'Medical Emergencies', 'EMT', 27, 'Medical conditions, pharmacology, toxicology'),
('EMT-OB', 'OB/GYN', 'EMT', 7, 'Obstetric and gynecological emergencies'),
('EMT-PEDS', 'Pediatrics', 'EMT', 7, 'Pediatric assessment and emergencies'),
('EMT-OPS', 'EMS Operations', 'EMT', 7, 'Scene safety, triage, transport decisions'),
-- Paramedic Categories
('PM-AIRWAY', 'Airway, Respiration & Ventilation', 'Paramedic', 18, 'Advanced airway, RSI, ventilator management'),
('PM-CARDIO', 'Cardiology & Resuscitation', 'Paramedic', 20, 'ECG interpretation, ACLS, pacing'),
('PM-TRAUMA', 'Trauma', 'Paramedic', 15, 'Trauma assessment, hemorrhage control'),
('PM-MEDICAL', 'Medical Emergencies', 'Paramedic', 27, 'Advanced medical management, pharmacology'),
('PM-OB', 'OB/GYN', 'Paramedic', 6, 'Complicated deliveries, neonatal resuscitation'),
('PM-PEDS', 'Pediatrics', 'Paramedic', 7, 'Pediatric advanced life support'),
('PM-OPS', 'EMS Operations', 'Paramedic', 7, 'MCI, hazmat, crew resource management')
ON CONFLICT (code) DO NOTHING;

-- Difficulty levels
CREATE TYPE question_difficulty AS ENUM ('easy', 'medium', 'hard', 'expert');

-- Cognitive levels (Bloom's Taxonomy)
CREATE TYPE cognitive_level AS ENUM (
  'remember',    -- Recall facts
  'understand',  -- Explain concepts
  'apply',       -- Use in new situations
  'analyze',     -- Draw connections
  'evaluate',    -- Justify decisions
  'create'       -- Produce new work
);

-- Add columns to quiz_questions if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quiz_questions' AND column_name = 'difficulty') THEN
    ALTER TABLE quiz_questions ADD COLUMN difficulty question_difficulty DEFAULT 'medium';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quiz_questions' AND column_name = 'cognitive_level') THEN
    ALTER TABLE quiz_questions ADD COLUMN cognitive_level cognitive_level DEFAULT 'apply';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quiz_questions' AND column_name = 'nremt_category_id') THEN
    ALTER TABLE quiz_questions ADD COLUMN nremt_category_id UUID REFERENCES nremt_categories(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quiz_questions' AND column_name = 'rationale') THEN
    ALTER TABLE quiz_questions ADD COLUMN rationale TEXT;
  END IF;
END $$;

-- ============================================
-- QUICK WIN 2: @Mentions in Discussions
-- ============================================

-- Mentions table to track @mentions
CREATE TABLE IF NOT EXISTS discussion_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES discussion_posts(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, mentioned_user_id)
);

-- Function to extract and create mentions from post content
CREATE OR REPLACE FUNCTION process_discussion_mentions()
RETURNS TRIGGER AS $$
DECLARE
  mention_match TEXT;
  mentioned_username TEXT;
  mentioned_user_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Get tenant_id from the post's thread
  SELECT dt.tenant_id INTO v_tenant_id
  FROM discussion_threads dt
  WHERE dt.id = NEW.thread_id;

  -- Find all @mentions in content (pattern: @username or @"Full Name")
  FOR mention_match IN
    SELECT (regexp_matches(NEW.content, '@([a-zA-Z0-9_]+|"[^"]+")' , 'g'))[1]
  LOOP
    -- Clean up the mention (remove quotes if present)
    mentioned_username := trim(both '"' from mention_match);

    -- Find user by full_name or email prefix
    SELECT id INTO mentioned_user_id
    FROM users
    WHERE tenant_id = v_tenant_id
      AND (
        full_name ILIKE mentioned_username
        OR split_part(email, '@', 1) ILIKE mentioned_username
      )
    LIMIT 1;

    IF mentioned_user_id IS NOT NULL THEN
      INSERT INTO discussion_mentions (tenant_id, post_id, mentioned_user_id)
      VALUES (v_tenant_id, NEW.id, mentioned_user_id)
      ON CONFLICT (post_id, mentioned_user_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for processing mentions
DROP TRIGGER IF EXISTS trigger_process_mentions ON discussion_posts;
CREATE TRIGGER trigger_process_mentions
  AFTER INSERT OR UPDATE OF content ON discussion_posts
  FOR EACH ROW
  EXECUTE FUNCTION process_discussion_mentions();

-- ============================================
-- QUICK WIN 3: Anonymous Grading
-- ============================================

-- Add anonymous grading settings to assignments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'anonymous_grading') THEN
    ALTER TABLE assignments ADD COLUMN anonymous_grading BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'anonymous_grading_revealed') THEN
    ALTER TABLE assignments ADD COLUMN anonymous_grading_revealed BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'anonymous_submission_id') THEN
    ALTER TABLE submissions ADD COLUMN anonymous_id TEXT;
  END IF;
END $$;

-- Function to generate anonymous IDs for submissions
CREATE OR REPLACE FUNCTION generate_anonymous_submission_id()
RETURNS TRIGGER AS $$
DECLARE
  v_anon_grading BOOLEAN;
BEGIN
  SELECT anonymous_grading INTO v_anon_grading
  FROM assignments
  WHERE id = NEW.assignment_id;

  IF v_anon_grading AND NEW.anonymous_id IS NULL THEN
    NEW.anonymous_id := 'Student_' || substr(md5(NEW.student_id::text || NEW.assignment_id::text), 1, 8);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_anonymous_submission ON submissions;
CREATE TRIGGER trigger_anonymous_submission
  BEFORE INSERT ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION generate_anonymous_submission_id();

-- ============================================
-- QUICK WIN 4: Grade Distribution Analytics
-- ============================================

-- Function to get grade distribution for an assignment
CREATE OR REPLACE FUNCTION get_grade_distribution(
  p_assignment_id UUID,
  p_bucket_size INTEGER DEFAULT 10
) RETURNS TABLE (
  grade_range TEXT,
  count BIGINT,
  percentage DECIMAL(5,2)
) AS $$
DECLARE
  v_total BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM submissions
  WHERE assignment_id = p_assignment_id
    AND status = 'graded'
    AND final_score IS NOT NULL;

  RETURN QUERY
  WITH buckets AS (
    SELECT
      floor(final_score / p_bucket_size) * p_bucket_size as bucket_start,
      COUNT(*) as bucket_count
    FROM submissions
    WHERE assignment_id = p_assignment_id
      AND status = 'graded'
      AND final_score IS NOT NULL
    GROUP BY floor(final_score / p_bucket_size)
  )
  SELECT
    bucket_start::INTEGER || '-' || (bucket_start + p_bucket_size - 1)::INTEGER as grade_range,
    bucket_count as count,
    CASE WHEN v_total > 0
      THEN round((bucket_count::DECIMAL / v_total) * 100, 2)
      ELSE 0
    END as percentage
  FROM buckets
  ORDER BY bucket_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get course grade statistics
CREATE OR REPLACE FUNCTION get_course_grade_stats(p_course_id UUID)
RETURNS TABLE (
  assignment_id UUID,
  assignment_title TEXT,
  submissions_count BIGINT,
  graded_count BIGINT,
  average_score DECIMAL(5,2),
  median_score DECIMAL(5,2),
  min_score DECIMAL(5,2),
  max_score DECIMAL(5,2),
  std_deviation DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id as assignment_id,
    a.title as assignment_title,
    COUNT(s.id) as submissions_count,
    COUNT(s.id) FILTER (WHERE s.status = 'graded') as graded_count,
    round(AVG(s.final_score), 2) as average_score,
    round(percentile_cont(0.5) WITHIN GROUP (ORDER BY s.final_score), 2) as median_score,
    round(MIN(s.final_score), 2) as min_score,
    round(MAX(s.final_score), 2) as max_score,
    round(stddev(s.final_score), 2) as std_deviation
  FROM assignments a
  JOIN modules m ON a.module_id = m.id
  LEFT JOIN submissions s ON a.id = s.assignment_id AND s.status = 'graded'
  WHERE m.course_id = p_course_id
  GROUP BY a.id, a.title
  ORDER BY a.title;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- QUICK WIN 5: Live Polling System
-- ============================================

CREATE TYPE poll_status AS ENUM ('draft', 'active', 'closed');
CREATE TYPE poll_type AS ENUM ('single_choice', 'multiple_choice', 'word_cloud', 'rating', 'open_ended');

-- Polls table
CREATE TABLE IF NOT EXISTS live_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  poll_type poll_type NOT NULL DEFAULT 'single_choice',
  options JSONB DEFAULT '[]', -- For choice-based polls
  settings JSONB DEFAULT '{}', -- show_results_live, anonymous, time_limit, etc.
  status poll_status NOT NULL DEFAULT 'draft',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Poll responses
CREATE TABLE IF NOT EXISTS poll_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  poll_id UUID NOT NULL REFERENCES live_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response JSONB NOT NULL, -- selected_option(s), text_response, rating, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

-- Function to get poll results
CREATE OR REPLACE FUNCTION get_poll_results(p_poll_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_poll live_polls;
  v_results JSONB;
BEGIN
  SELECT * INTO v_poll FROM live_polls WHERE id = p_poll_id;

  IF v_poll.poll_type IN ('single_choice', 'multiple_choice') THEN
    SELECT jsonb_build_object(
      'total_responses', COUNT(DISTINCT user_id),
      'options', (
        SELECT jsonb_agg(jsonb_build_object(
          'option', opt,
          'count', COALESCE(counts.cnt, 0),
          'percentage', CASE WHEN COUNT(DISTINCT pr.user_id) > 0
            THEN round((COALESCE(counts.cnt, 0)::DECIMAL / COUNT(DISTINCT pr.user_id)) * 100, 1)
            ELSE 0 END
        ))
        FROM jsonb_array_elements_text(v_poll.options) opt
        LEFT JOIN LATERAL (
          SELECT COUNT(*) as cnt
          FROM poll_responses pr2
          WHERE pr2.poll_id = p_poll_id
            AND (pr2.response->>'selected' = opt OR pr2.response->'selected' ? opt)
        ) counts ON true
      )
    ) INTO v_results
    FROM poll_responses pr
    WHERE pr.poll_id = p_poll_id;
  ELSIF v_poll.poll_type = 'rating' THEN
    SELECT jsonb_build_object(
      'total_responses', COUNT(*),
      'average_rating', round(AVG((response->>'rating')::DECIMAL), 2),
      'distribution', jsonb_object_agg(rating, cnt)
    ) INTO v_results
    FROM (
      SELECT (response->>'rating')::INTEGER as rating, COUNT(*) as cnt
      FROM poll_responses
      WHERE poll_id = p_poll_id
      GROUP BY (response->>'rating')::INTEGER
    ) ratings;
  ELSE
    SELECT jsonb_build_object(
      'total_responses', COUNT(*),
      'responses', jsonb_agg(response->'text')
    ) INTO v_results
    FROM poll_responses
    WHERE poll_id = p_poll_id;
  END IF;

  RETURN COALESCE(v_results, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- QUICK WIN 6: Survey Tool (Non-Graded)
-- ============================================

CREATE TYPE survey_status AS ENUM ('draft', 'published', 'closed', 'archived');

-- Surveys table
CREATE TABLE IF NOT EXISTS surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE, -- NULL for tenant-wide surveys
  created_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  status survey_status NOT NULL DEFAULT 'draft',
  is_anonymous BOOLEAN DEFAULT true,
  allow_multiple_submissions BOOLEAN DEFAULT false,
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Survey questions
CREATE TABLE IF NOT EXISTS survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL, -- text, textarea, single_choice, multiple_choice, rating, scale, date
  options JSONB DEFAULT '[]',
  is_required BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  settings JSONB DEFAULT '{}', -- min/max for scale, placeholder text, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Survey responses
CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL if anonymous
  answers JSONB NOT NULL, -- {question_id: answer}
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Function to get survey summary
CREATE OR REPLACE FUNCTION get_survey_summary(p_survey_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_summary JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_responses', COUNT(DISTINCT sr.id),
    'completion_rate', round(
      (COUNT(DISTINCT sr.id)::DECIMAL / NULLIF(
        (SELECT COUNT(*) FROM enrollments e
         JOIN surveys s ON s.course_id = e.course_id
         WHERE s.id = p_survey_id AND e.status = 'active'), 0
      )) * 100, 1
    ),
    'questions', (
      SELECT jsonb_agg(jsonb_build_object(
        'question_id', sq.id,
        'question_text', sq.question_text,
        'question_type', sq.question_type,
        'response_count', (
          SELECT COUNT(*) FROM survey_responses sr2
          WHERE sr2.survey_id = p_survey_id
            AND sr2.answers ? sq.id::text
        ),
        'summary', CASE
          WHEN sq.question_type IN ('single_choice', 'multiple_choice') THEN (
            SELECT jsonb_object_agg(opt, COALESCE(cnt, 0))
            FROM jsonb_array_elements_text(sq.options) opt
            LEFT JOIN LATERAL (
              SELECT COUNT(*) as cnt
              FROM survey_responses sr3
              WHERE sr3.survey_id = p_survey_id
                AND (sr3.answers->>sq.id::text = opt
                     OR sr3.answers->sq.id::text ? opt)
            ) c ON true
          )
          WHEN sq.question_type IN ('rating', 'scale') THEN (
            SELECT jsonb_build_object(
              'average', round(AVG((answers->>sq.id::text)::DECIMAL), 2),
              'min', MIN((answers->>sq.id::text)::DECIMAL),
              'max', MAX((answers->>sq.id::text)::DECIMAL)
            )
            FROM survey_responses
            WHERE survey_id = p_survey_id
              AND answers ? sq.id::text
          )
          ELSE NULL
        END
      ) ORDER BY sq.order_index)
      FROM survey_questions sq
      WHERE sq.survey_id = p_survey_id
    )
  ) INTO v_summary
  FROM survey_responses sr
  WHERE sr.survey_id = p_survey_id;

  RETURN COALESCE(v_summary, '{"total_responses": 0}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- QUICK WIN 7: Multi-Select Gradebook Filters
-- ============================================

-- Saved gradebook filters per user
CREATE TABLE IF NOT EXISTS gradebook_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL, -- {modules: [], assignment_types: [], students: [], grade_range: {min, max}, status: []}
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- QUICK WIN 8: Late Submission Policies
-- ============================================

CREATE TYPE late_policy_type AS ENUM ('none', 'percent_per_day', 'percent_per_hour', 'fixed_deduction', 'zero_after_deadline');

-- Add late policy columns to assignments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'late_policy_type') THEN
    ALTER TABLE assignments ADD COLUMN late_policy_type late_policy_type DEFAULT 'none';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'late_deduction_amount') THEN
    ALTER TABLE assignments ADD COLUMN late_deduction_amount DECIMAL(5,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'late_deduction_max') THEN
    ALTER TABLE assignments ADD COLUMN late_deduction_max DECIMAL(5,2) DEFAULT 100;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assignments' AND column_name = 'late_submission_cutoff') THEN
    ALTER TABLE assignments ADD COLUMN late_submission_cutoff TIMESTAMPTZ; -- After this, no submissions accepted
  END IF;
END $$;

-- Function to calculate late penalty
CREATE OR REPLACE FUNCTION calculate_late_penalty(
  p_assignment_id UUID,
  p_submitted_at TIMESTAMPTZ
) RETURNS DECIMAL AS $$
DECLARE
  v_assignment assignments;
  v_hours_late DECIMAL;
  v_days_late DECIMAL;
  v_penalty DECIMAL := 0;
BEGIN
  SELECT * INTO v_assignment FROM assignments WHERE id = p_assignment_id;

  -- No penalty if submitted on time or no late policy
  IF p_submitted_at <= v_assignment.due_date OR v_assignment.late_policy_type = 'none' THEN
    RETURN 0;
  END IF;

  -- Check if past cutoff
  IF v_assignment.late_submission_cutoff IS NOT NULL AND p_submitted_at > v_assignment.late_submission_cutoff THEN
    RETURN 100; -- 100% penalty (zero grade)
  END IF;

  v_hours_late := EXTRACT(EPOCH FROM (p_submitted_at - v_assignment.due_date)) / 3600;
  v_days_late := CEILING(v_hours_late / 24);

  CASE v_assignment.late_policy_type
    WHEN 'percent_per_day' THEN
      v_penalty := v_days_late * v_assignment.late_deduction_amount;
    WHEN 'percent_per_hour' THEN
      v_penalty := CEILING(v_hours_late) * v_assignment.late_deduction_amount;
    WHEN 'fixed_deduction' THEN
      v_penalty := v_assignment.late_deduction_amount;
    WHEN 'zero_after_deadline' THEN
      v_penalty := 100;
    ELSE
      v_penalty := 0;
  END CASE;

  -- Cap at maximum deduction
  RETURN LEAST(v_penalty, v_assignment.late_deduction_max);
END;
$$ LANGUAGE plpgsql;

-- Add late penalty column to submissions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'late_penalty') THEN
    ALTER TABLE submissions ADD COLUMN late_penalty DECIMAL(5,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'is_late') THEN
    ALTER TABLE submissions ADD COLUMN is_late BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Trigger to calculate late penalty on submission
CREATE OR REPLACE FUNCTION apply_late_penalty()
RETURNS TRIGGER AS $$
DECLARE
  v_due_date TIMESTAMPTZ;
BEGIN
  SELECT due_date INTO v_due_date FROM assignments WHERE id = NEW.assignment_id;

  NEW.is_late := NEW.submitted_at > v_due_date;
  NEW.late_penalty := calculate_late_penalty(NEW.assignment_id, NEW.submitted_at);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_late_penalty ON submissions;
CREATE TRIGGER trigger_late_penalty
  BEFORE INSERT OR UPDATE OF submitted_at ON submissions
  FOR EACH ROW
  WHEN (NEW.submitted_at IS NOT NULL)
  EXECUTE FUNCTION apply_late_penalty();

-- ============================================
-- QUICK WIN 9: Unpublish Module Only
-- ============================================

-- Add cascade_publish column to modules
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'modules' AND column_name = 'cascade_publish') THEN
    ALTER TABLE modules ADD COLUMN cascade_publish BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Function to unpublish module only (not items inside)
CREATE OR REPLACE FUNCTION unpublish_module_only(p_module_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE modules
  SET is_published = false, cascade_publish = false
  WHERE id = p_module_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to publish module with items
CREATE OR REPLACE FUNCTION publish_module_with_items(p_module_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE modules
  SET is_published = true, cascade_publish = true
  WHERE id = p_module_id;

  -- Publish all lessons in module
  UPDATE lessons
  SET is_published = true
  WHERE module_id = p_module_id;

  -- Publish all assignments in module
  UPDATE assignments
  SET is_published = true
  WHERE module_id = p_module_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_question_tags_tenant ON question_tags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quiz_question_tags_question ON quiz_question_tags(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_question_tags_tag ON quiz_question_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_discussion_mentions_post ON discussion_mentions(post_id);
CREATE INDEX IF NOT EXISTS idx_discussion_mentions_user ON discussion_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_live_polls_course ON live_polls(course_id);
CREATE INDEX IF NOT EXISTS idx_poll_responses_poll ON poll_responses(poll_id);
CREATE INDEX IF NOT EXISTS idx_surveys_course ON surveys(course_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_survey ON survey_questions(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_gradebook_filters_user ON gradebook_filters(user_id, course_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE question_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_question_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE gradebook_filters ENABLE ROW LEVEL SECURITY;

-- Question tags policies
CREATE POLICY "Users can view question tags in their tenant"
  ON question_tags FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Instructors can manage question tags"
  ON question_tags FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Quiz question tags policies
CREATE POLICY "Users can view quiz question tags"
  ON quiz_question_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quiz_questions q
      JOIN assignments a ON q.assignment_id = a.id
      WHERE q.id = quiz_question_tags.question_id
      AND a.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Instructors can manage quiz question tags"
  ON quiz_question_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM quiz_questions q
      JOIN assignments a ON q.assignment_id = a.id
      WHERE q.id = quiz_question_tags.question_id
      AND a.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
      AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    )
  );

-- Discussion mentions policies
CREATE POLICY "Users can view their mentions"
  ON discussion_mentions FOR SELECT
  USING (
    mentioned_user_id = auth.uid()
    OR tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- Live polls policies
CREATE POLICY "Users can view polls in their courses"
  ON live_polls FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (
      EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = live_polls.course_id AND e.student_id = auth.uid())
      OR EXISTS (SELECT 1 FROM courses c WHERE c.id = live_polls.course_id AND c.instructor_id = auth.uid())
      OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    )
  );

CREATE POLICY "Instructors can manage polls"
  ON live_polls FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Poll responses policies
CREATE POLICY "Users can submit poll responses"
  ON poll_responses FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can view poll responses"
  ON poll_responses FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (
      user_id = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    )
  );

-- Survey policies
CREATE POLICY "Users can view published surveys"
  ON surveys FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (
      status = 'published'
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    )
  );

CREATE POLICY "Instructors can manage surveys"
  ON surveys FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Survey questions policies
CREATE POLICY "Users can view survey questions"
  ON survey_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM surveys s
      WHERE s.id = survey_questions.survey_id
      AND s.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Instructors can manage survey questions"
  ON survey_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM surveys s
      WHERE s.id = survey_questions.survey_id
      AND s.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
      AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    )
  );

-- Survey responses policies
CREATE POLICY "Users can submit survey responses"
  ON survey_responses FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Instructors can view survey responses"
  ON survey_responses FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Gradebook filters policies
CREATE POLICY "Users can manage their own gradebook filters"
  ON gradebook_filters FOR ALL
  USING (user_id = auth.uid());

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE question_tags IS 'Tags for categorizing quiz questions';
COMMENT ON TABLE quiz_question_tags IS 'Many-to-many relationship between questions and tags';
COMMENT ON TABLE nremt_categories IS 'Standard NREMT exam categories with weights';
COMMENT ON TABLE discussion_mentions IS 'Track @mentions in discussion posts';
COMMENT ON TABLE live_polls IS 'Real-time polling during class sessions';
COMMENT ON TABLE poll_responses IS 'Student responses to live polls';
COMMENT ON TABLE surveys IS 'Non-graded surveys for feedback collection';
COMMENT ON TABLE survey_questions IS 'Questions within a survey';
COMMENT ON TABLE survey_responses IS 'Submitted survey responses';
COMMENT ON TABLE gradebook_filters IS 'Saved filter configurations for gradebook';
COMMENT ON FUNCTION calculate_late_penalty IS 'Calculate grade penalty for late submissions';
COMMENT ON FUNCTION get_grade_distribution IS 'Get grade distribution for an assignment';
COMMENT ON FUNCTION get_poll_results IS 'Aggregate poll responses and calculate results';
