-- Add question exclusion support for quiz grading
-- Allows instructors to "throw out" problematic questions and recalculate scores

-- Add exclusion columns to quiz_questions
ALTER TABLE quiz_questions
ADD COLUMN IF NOT EXISTS is_excluded BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS excluded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS excluded_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS exclusion_reason TEXT;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_quiz_questions_excluded
ON quiz_questions(assignment_id, is_excluded);

-- Add comment for documentation
COMMENT ON COLUMN quiz_questions.is_excluded IS 'When true, question is excluded from scoring calculations';
COMMENT ON COLUMN quiz_questions.excluded_at IS 'Timestamp when question was excluded';
COMMENT ON COLUMN quiz_questions.excluded_by IS 'User who excluded the question';
COMMENT ON COLUMN quiz_questions.exclusion_reason IS 'Optional reason for excluding (e.g., ambiguous wording, incorrect answer key)';

-- Create a function to recalculate quiz scores when questions are excluded
CREATE OR REPLACE FUNCTION recalculate_quiz_scores(p_assignment_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_submission RECORD;
    v_new_score NUMERIC;
    v_total_points NUMERIC;
BEGIN
    -- Get total points from non-excluded questions
    SELECT COALESCE(SUM(points), 0) INTO v_total_points
    FROM quiz_questions
    WHERE assignment_id = p_assignment_id
    AND (is_excluded = FALSE OR is_excluded IS NULL);

    -- If no points possible, exit
    IF v_total_points = 0 THEN
        RETURN 0;
    END IF;

    -- Loop through all submissions for this assignment
    FOR v_submission IN
        SELECT id, content
        FROM submissions
        WHERE assignment_id = p_assignment_id
        AND status IN ('submitted', 'graded')
    LOOP
        -- Calculate new score based on non-excluded questions only
        SELECT COALESCE(SUM(
            CASE
                WHEN qq.correct_answer = (v_submission.content::jsonb->'answers'->>qq.id::text)::jsonb
                THEN COALESCE(qq.points, 0)
                ELSE 0
            END
        ), 0) INTO v_new_score
        FROM quiz_questions qq
        WHERE qq.assignment_id = p_assignment_id
        AND (qq.is_excluded = FALSE OR qq.is_excluded IS NULL);

        -- Update the submission score
        UPDATE submissions
        SET
            raw_score = v_new_score,
            final_score = CASE
                WHEN curved_score IS NOT NULL THEN curved_score
                ELSE v_new_score
            END,
            updated_at = NOW()
        WHERE id = v_submission.id;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION recalculate_quiz_scores(UUID) TO authenticated;
