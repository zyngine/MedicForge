-- Fix existing exam/quiz scores where final_score was incorrectly calculated
-- This happened in use-standardized-exams.ts where points_earned was set to
-- question.points (which could be null) instead of 1 for correct answers

-- The issue manifested as:
-- - A quiz with 10 correct answers out of 10 questions
-- - Each question.points was null, so points_earned = null for correct answers
-- - When calculating percentage: 0 points / 10 possible = 0% or sometimes 10%

-- For quiz submissions (content contains 'responses' with 'is_correct'),
-- recalculate final_score based on correct answer count
UPDATE submissions
SET final_score = (
  SELECT
    CASE
      WHEN jsonb_array_length(content->'responses') > 0 THEN
        ROUND(
          (
            SELECT COUNT(*)::numeric
            FROM jsonb_array_elements(content->'responses') AS resp
            WHERE (resp->>'is_correct')::boolean = true
          ) / jsonb_array_length(content->'responses')::numeric * 100,
          2
        )
      ELSE final_score
    END
)
WHERE
  -- Only process submissions with quiz-style content (has responses array)
  content IS NOT NULL
  AND content ? 'responses'
  AND jsonb_typeof(content->'responses') = 'array'
  AND jsonb_array_length(content->'responses') > 0
  -- Only fix scores that seem incorrect (score doesn't match correct answer ratio)
  AND final_score IS NOT NULL
  AND final_score < (
    SELECT
      ROUND(
        (
          SELECT COUNT(*)::numeric
          FROM jsonb_array_elements(content->'responses') AS resp
          WHERE (resp->>'is_correct')::boolean = true
        ) / jsonb_array_length(content->'responses')::numeric * 100,
        2
      )
  );

-- Also update raw_score to match final_score for consistency
UPDATE submissions
SET raw_score = final_score
WHERE
  content IS NOT NULL
  AND content ? 'responses'
  AND jsonb_typeof(content->'responses') = 'array'
  AND jsonb_array_length(content->'responses') > 0
  AND (raw_score IS NULL OR raw_score != final_score);

-- Log the fix
DO $$
BEGIN
  RAISE NOTICE 'Quiz submission scores have been recalculated based on correct answer count';
END $$;
