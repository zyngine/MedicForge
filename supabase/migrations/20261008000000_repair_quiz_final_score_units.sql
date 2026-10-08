-- =============================================================================
-- Migration: 20261008000000_repair_quiz_final_score_units.sql
-- Description: Put submissions.final_score back into points for quiz rows that
--              stored a percentage.
--
-- final_score is points. Every reader divides it by assignments.points_possible
-- to get a percentage — the student grade list, the instructor gradebook and the
-- v1 grades API all do — and every writer stored points, except one: the student
-- quiz submit path wrote toPercentage(score, totalPoints).
--
-- So a student who scored 1 of 7 had final_score 14 written, and the grade list
-- rendered it as "14.0 / 7". The code is fixed; the rows it already wrote are
-- repaired here.
--
-- Two shapes are repaired, both only for quizzes, and both set final_score back
-- to raw_score, which is the auto-graded points the same insert recorded:
--
--   * final_score equals the rounded percentage of raw_score — written by the
--     path above
--   * final_score exceeds the quiz's own maximum — impossible as a point score,
--     so whatever produced it, it is not a score anyone can act on
--
-- Deliberately NOT repaired: any row where final_score differs from raw_score
-- but is still within the quiz maximum. That is what a deliberate instructor
-- adjustment looks like, and this migration must not overwrite one. Verified
-- against production before writing: that set is empty today, so the exclusion
-- costs nothing now and protects the rows a hand-grading pass creates later.
-- =============================================================================

DO $$
DECLARE
    v_repaired INT;
BEGIN
    WITH repairable AS (
        SELECT s.id, s.raw_score
        FROM submissions s
        JOIN assignments a ON a.id = s.assignment_id
        WHERE a.type = 'quiz'
          AND s.raw_score IS NOT NULL
          AND s.final_score IS NOT NULL
          AND s.final_score IS DISTINCT FROM s.raw_score
          AND (
                (a.points_possible > 0
                 AND round(s.raw_score / a.points_possible * 100) = round(s.final_score))
             OR (a.points_possible > 0 AND s.final_score > a.points_possible)
          )
    )
    UPDATE submissions s
    SET final_score = r.raw_score
    FROM repairable r
    WHERE s.id = r.id;

    GET DIAGNOSTICS v_repaired = ROW_COUNT;
    RAISE NOTICE 'Repaired % quiz submission(s) whose final_score was not in points', v_repaired;
END $$;
