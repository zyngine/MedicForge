-- =============================================================================
-- Migration: 20261110000000_assignment_counts_toward_grade.sql
-- Description: Let an assignment be excluded from the grade.
--
-- Reported as "gradebook shows total submissions including practice quizzes,
-- unsure if they are calculating into the grade". They are: nothing in the
-- schema told a practice quiz apart from a graded one, only the word
-- "Practice" in its title, so every one of them counted.
--
-- That is not a small amount of the grade. At the time of writing production
-- holds 75 assignments with "practice" in the title, 34 of which have
-- submissions, carrying 211 submissions between them — against 187 on
-- everything else. More than half of all submitted work is practice.
--
-- Which is exactly why this defaults to true. Flipping those 75 assignments
-- would restate every student's grade in one deploy, and that is a decision for
-- the programs running the courses, not for this migration. Nothing changes
-- until someone unticks the box.
-- =============================================================================

ALTER TABLE assignments
    ADD COLUMN IF NOT EXISTS counts_toward_grade BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN assignments.counts_toward_grade IS
  'Whether this assignment counts towards course grades and averages. False for '
  'practice work that is still submitted and still shown, but not scored into '
  'the grade. Defaults true so existing grades are unchanged.';

-- The grade queries filter on it across a course's assignments.
CREATE INDEX IF NOT EXISTS idx_assignments_counts_toward_grade
    ON assignments (counts_toward_grade)
    WHERE counts_toward_grade = false;
