-- Fix quiz submission scores that stored raw points instead of percentage
-- The bug: final_score was set to raw_score (e.g., 10) instead of percentage (e.g., 100%)
-- This caused reports to show "10%" when a student got 10/10 points

-- Update quiz submissions to convert raw_score to percentage
-- by using the assignment's points_possible as the denominator
UPDATE submissions s
SET final_score = CASE
  WHEN a.points_possible > 0 THEN ROUND((s.raw_score / a.points_possible) * 100, 2)
  ELSE s.final_score
END
FROM assignments a
WHERE s.assignment_id = a.id
  AND a.type = 'quiz'
  AND s.status = 'graded'
  AND s.raw_score IS NOT NULL
  AND a.points_possible IS NOT NULL
  AND a.points_possible > 0
  -- Only fix scores that appear to be raw scores (not already percentages)
  -- If final_score equals raw_score and raw_score < points_possible, it's likely wrong
  AND s.final_score = s.raw_score
  AND s.raw_score <= a.points_possible;

-- Also fix any scores where final_score is suspiciously low compared to what it should be
-- This catches cases where the score was stored as raw_score
UPDATE submissions s
SET final_score = CASE
  WHEN a.points_possible > 0 THEN ROUND((s.raw_score / a.points_possible) * 100, 2)
  ELSE s.final_score
END
FROM assignments a
WHERE s.assignment_id = a.id
  AND a.type = 'quiz'
  AND s.status = 'graded'
  AND s.raw_score IS NOT NULL
  AND a.points_possible IS NOT NULL
  AND a.points_possible > 0
  -- If final_score is much lower than expected percentage, fix it
  AND s.final_score < 100
  AND (s.raw_score / a.points_possible * 100) > s.final_score + 10;

-- Log the fix
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM submissions s
  JOIN assignments a ON s.assignment_id = a.id
  WHERE a.type = 'quiz'
    AND s.status = 'graded'
    AND s.raw_score IS NOT NULL
    AND a.points_possible > 0
    AND s.final_score IS NOT NULL
    AND s.final_score = ROUND((s.raw_score / a.points_possible) * 100, 2);

  RAISE NOTICE 'Quiz scores have been recalculated. Submissions with correct percentage scores: %', fixed_count;
END $$;
