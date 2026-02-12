-- Fix course_instructors RLS policies to avoid recursive queries
-- The "Lead instructors manage course instructors" policy was self-referencing

-- Drop the problematic policy
DROP POLICY IF EXISTS "Lead instructors manage course instructors" ON course_instructors;

-- Recreate with a non-recursive approach using the courses table
CREATE POLICY "Lead instructors manage course instructors"
  ON course_instructors FOR ALL
  USING (
    -- User is the original lead instructor on the course
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_instructors.course_id
      AND c.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_instructors.course_id
      AND c.instructor_id = auth.uid()
    )
  );

-- Also add a simpler SELECT policy for instructors to view their own assignments
CREATE POLICY "Instructors view own course assignments"
  ON course_instructors FOR SELECT
  USING (instructor_id = auth.uid());
