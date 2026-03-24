-- =============================================================================
-- Add missing indexes and updated_at triggers for CE platform tables
-- =============================================================================

-- ============================================
-- MISSING INDEXES
-- These columns are used in API queries but had no indexes.
-- ============================================

-- complete-module API: counts total modules per course
CREATE INDEX IF NOT EXISTS idx_ce_course_modules_course_id
  ON ce_course_modules(course_id);

-- complete-module API: counts completed modules per enrollment
CREATE INDEX IF NOT EXISTS idx_ce_module_progress_enrollment_id
  ON ce_module_progress(enrollment_id);

-- complete-module API: checks if course has a quiz
CREATE INDEX IF NOT EXISTS idx_ce_quizzes_course_id
  ON ce_quizzes(course_id);

-- course detail pages: fetches objectives by course
CREATE INDEX IF NOT EXISTS idx_ce_course_objectives_course_id
  ON ce_course_objectives(course_id);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- Automatically sets updated_at = now() on row update.
-- ============================================

CREATE OR REPLACE FUNCTION update_ce_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply to all CE tables that have an updated_at column

CREATE TRIGGER set_ce_users_updated_at
  BEFORE UPDATE ON ce_users
  FOR EACH ROW EXECUTE FUNCTION update_ce_updated_at();

CREATE TRIGGER set_ce_courses_updated_at
  BEFORE UPDATE ON ce_courses
  FOR EACH ROW EXECUTE FUNCTION update_ce_updated_at();

CREATE TRIGGER set_ce_instructors_updated_at
  BEFORE UPDATE ON ce_instructors
  FOR EACH ROW EXECUTE FUNCTION update_ce_updated_at();

CREATE TRIGGER set_ce_agencies_updated_at
  BEFORE UPDATE ON ce_agencies
  FOR EACH ROW EXECUTE FUNCTION update_ce_updated_at();

CREATE TRIGGER set_ce_enrollments_updated_at
  BEFORE UPDATE ON ce_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_ce_updated_at();

CREATE TRIGGER set_ce_quizzes_updated_at
  BEFORE UPDATE ON ce_quizzes
  FOR EACH ROW EXECUTE FUNCTION update_ce_updated_at();
