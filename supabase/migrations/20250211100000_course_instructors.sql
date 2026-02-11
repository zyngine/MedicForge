-- Multi-instructor support for courses
-- Creates a junction table to allow multiple instructors per course

-- Create course_instructors junction table
CREATE TABLE IF NOT EXISTS course_instructors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'instructor' CHECK (role IN ('lead', 'coordinator', 'instructor', 'assistant', 'grader')),
  can_edit BOOLEAN DEFAULT true,
  can_grade BOOLEAN DEFAULT true,
  can_manage_students BOOLEAN DEFAULT true,
  added_by UUID REFERENCES users(id),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, instructor_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_instructors_course ON course_instructors(course_id);
CREATE INDEX IF NOT EXISTS idx_course_instructors_instructor ON course_instructors(instructor_id);

-- Migrate existing instructor_id data to the junction table
-- This preserves existing course-instructor relationships as 'lead' role
INSERT INTO course_instructors (course_id, instructor_id, role, added_by)
SELECT id, instructor_id, 'lead', instructor_id
FROM courses
WHERE instructor_id IS NOT NULL
ON CONFLICT (course_id, instructor_id) DO NOTHING;

-- Enable RLS
ALTER TABLE course_instructors ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone in the tenant can view course instructors
CREATE POLICY "View course instructors"
  ON course_instructors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_instructors.course_id
      AND c.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    )
  );

-- Admins can manage all course instructors in their tenant
CREATE POLICY "Admins manage course instructors"
  ON course_instructors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_instructors.course_id
      AND c.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
      AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_instructors.course_id
      AND c.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
      AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    )
  );

-- Lead instructors can manage instructors for their courses
CREATE POLICY "Lead instructors manage course instructors"
  ON course_instructors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM course_instructors ci
      WHERE ci.course_id = course_instructors.course_id
      AND ci.instructor_id = auth.uid()
      AND ci.role = 'lead'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM course_instructors ci
      WHERE ci.course_id = course_instructors.course_id
      AND ci.instructor_id = auth.uid()
      AND ci.role = 'lead'
    )
  );

-- Create a function to check if user is a course instructor
CREATE OR REPLACE FUNCTION is_course_instructor(p_course_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM course_instructors
    WHERE course_id = p_course_id
    AND instructor_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get instructor's courses
CREATE OR REPLACE FUNCTION get_instructor_course_ids(p_user_id UUID DEFAULT auth.uid())
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT course_id FROM course_instructors
  WHERE instructor_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policy for courses to use the junction table
-- Drop existing policy first
DROP POLICY IF EXISTS "Instructors can update own courses" ON courses;

-- Recreate with junction table check
CREATE POLICY "Instructors can update own courses"
  ON courses FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (
      instructor_id = auth.uid()  -- Original instructor
      OR EXISTS (  -- Or any instructor in junction table with edit permission
        SELECT 1 FROM course_instructors ci
        WHERE ci.course_id = courses.id
        AND ci.instructor_id = auth.uid()
        AND ci.can_edit = true
      )
      OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    )
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

COMMENT ON TABLE course_instructors IS 'Junction table for multi-instructor course support';
COMMENT ON COLUMN course_instructors.role IS 'Instructor role: lead (primary), coordinator, instructor, assistant, or grader';
