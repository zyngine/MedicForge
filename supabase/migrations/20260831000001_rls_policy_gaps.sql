-- =============================================================================
-- Migration: 20260831000001_rls_policy_gaps.sql
-- Description: Close two classes of row-level-security gaps found in audit.
--
--   1. Tables that had RLS ENABLED but zero policies. Postgres denies every
--      row in that state, so any feature reading them through the browser or
--      user-scoped Supabase client silently returned empty arrays and every
--      write failed. Affects: rubrics, portfolios, peer review, flashcards,
--      podcasts, practice exams, SpeedGrader annotations, moderated grading,
--      LTI, prerequisites/release conditions, video breakout rooms,
--      geolocation check-in and gradebook exports.
--
--   2. Tables created without RLS enabled at all, which PostgREST exposes to
--      the anon and authenticated roles across every tenant.
--
-- Every table below carries tenant_id, so the policies reuse the existing
-- get_user_tenant_id() / get_user_role() SECURITY DEFINER helpers.
-- All statements are idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tables that were left with RLS enabled and no policy at all
-- ---------------------------------------------------------------------------

-- Read for everyone in the tenant, write restricted to instructors/admins.
DO $$
DECLARE
    t TEXT;
    staff_tables TEXT[] := ARRAY[
        'rubric_criteria',
        'rubric_ratings',
        'flashcards',
        'podcast_episodes',
        'checkin_events',
        'prerequisites',
        'release_conditions',
        'lti_placements',
        'breakout_rooms',
        'peer_review_assignments'
    ];
BEGIN
    FOREACH t IN ARRAY staff_tables LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS "Tenant members can view %1$s" ON %1$I', t);
        EXECUTE format(
            'CREATE POLICY "Tenant members can view %1$s" ON %1$I
                 FOR SELECT USING (tenant_id = get_user_tenant_id())', t);

        EXECUTE format(
            'DROP POLICY IF EXISTS "Staff manage %1$s" ON %1$I', t);
        EXECUTE format(
            'CREATE POLICY "Staff manage %1$s" ON %1$I
                 FOR ALL USING (
                     tenant_id = get_user_tenant_id()
                     AND get_user_role() IN (''admin'', ''instructor'')
                 )
                 WITH CHECK (
                     tenant_id = get_user_tenant_id()
                     AND get_user_role() IN (''admin'', ''instructor'')
                 )', t);
    END LOOP;
END $$;

-- Instructor/admin only, end to end: grading and reporting artifacts that
-- students must never read.
DO $$
DECLARE
    t TEXT;
    staff_only_tables TEXT[] := ARRAY[
        'submission_annotations',
        'grading_comment_library',
        'moderated_grades',
        'moderated_final_grades',
        'gradebook_exports',
        'lti_grades',
        'lti_launches',
        'rubric_assessments',
        'rubric_assessment_scores'
    ];
BEGIN
    FOREACH t IN ARRAY staff_only_tables LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS "Staff manage %1$s" ON %1$I', t);
        EXECUTE format(
            'CREATE POLICY "Staff manage %1$s" ON %1$I
                 FOR ALL USING (
                     tenant_id = get_user_tenant_id()
                     AND get_user_role() IN (''admin'', ''instructor'')
                 )
                 WITH CHECK (
                     tenant_id = get_user_tenant_id()
                     AND get_user_role() IN (''admin'', ''instructor'')
                 )', t);
    END LOOP;
END $$;

-- Per-user rows: the owning user manages their own, staff can read the
-- tenant's rows for reporting.
DO $$
DECLARE
    t TEXT;
    owner_col TEXT;
    owned_tables TEXT[][] := ARRAY[
        ARRAY['podcast_progress', 'user_id'],
        ARRAY['student_weak_areas', 'user_id'],
        ARRAY['student_content_access', 'student_id'],
        ARRAY['video_meeting_participants', 'user_id'],
        ARRAY['breakout_room_assignments', 'user_id']
    ];
    i INT;
BEGIN
    FOR i IN 1 .. array_length(owned_tables, 1) LOOP
        t := owned_tables[i][1];
        owner_col := owned_tables[i][2];

        EXECUTE format(
            'DROP POLICY IF EXISTS "Users manage own %1$s" ON %1$I', t);
        EXECUTE format(
            'CREATE POLICY "Users manage own %1$s" ON %1$I
                 FOR ALL USING (
                     tenant_id = get_user_tenant_id() AND %2$I = auth.uid()
                 )
                 WITH CHECK (
                     tenant_id = get_user_tenant_id() AND %2$I = auth.uid()
                 )', t, owner_col);

        EXECUTE format(
            'DROP POLICY IF EXISTS "Staff manage %1$s" ON %1$I', t);
        EXECUTE format(
            'CREATE POLICY "Staff manage %1$s" ON %1$I
                 FOR ALL USING (
                     tenant_id = get_user_tenant_id()
                     AND get_user_role() IN (''admin'', ''instructor'')
                 )
                 WITH CHECK (
                     tenant_id = get_user_tenant_id()
                     AND get_user_role() IN (''admin'', ''instructor'')
                 )', t);
    END LOOP;
END $$;

-- practice_exam_questions: rows belong to a practice_exam_sessions row, which
-- already carries the owning user.
DROP POLICY IF EXISTS "Users manage own practice exam questions" ON practice_exam_questions;
CREATE POLICY "Users manage own practice exam questions"
    ON practice_exam_questions FOR ALL
    USING (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM practice_exam_sessions s
            WHERE s.id = practice_exam_questions.session_id
              AND s.user_id = auth.uid()
        )
    )
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM practice_exam_sessions s
            WHERE s.id = practice_exam_questions.session_id
              AND s.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Staff view practice exam questions" ON practice_exam_questions;
CREATE POLICY "Staff view practice exam questions"
    ON practice_exam_questions FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    );

-- Portfolios: sections, artifacts and shares hang off a portfolio row. Owners
-- manage their own; staff in the tenant can read.
DO $$
DECLARE
    t TEXT;
    portfolio_tables TEXT[] := ARRAY[
        'portfolio_sections',
        'portfolio_shares'
    ];
BEGIN
    FOREACH t IN ARRAY portfolio_tables LOOP
        EXECUTE format(
            'DROP POLICY IF EXISTS "Owners manage %1$s" ON %1$I', t);
        EXECUTE format(
            'CREATE POLICY "Owners manage %1$s" ON %1$I
                 FOR ALL USING (
                     tenant_id = get_user_tenant_id()
                     AND EXISTS (
                         SELECT 1 FROM portfolios p
                         WHERE p.id = %1$I.portfolio_id AND p.owner_id = auth.uid()
                     )
                 )
                 WITH CHECK (
                     tenant_id = get_user_tenant_id()
                     AND EXISTS (
                         SELECT 1 FROM portfolios p
                         WHERE p.id = %1$I.portfolio_id AND p.owner_id = auth.uid()
                     )
                 )', t);

        EXECUTE format(
            'DROP POLICY IF EXISTS "Staff view %1$s" ON %1$I', t);
        EXECUTE format(
            'CREATE POLICY "Staff view %1$s" ON %1$I
                 FOR SELECT USING (
                     tenant_id = get_user_tenant_id()
                     AND get_user_role() IN (''admin'', ''instructor'')
                 )', t);
    END LOOP;
END $$;

-- portfolio_artifacts is nested one level deeper (section -> portfolio).
DROP POLICY IF EXISTS "Owners manage portfolio_artifacts" ON portfolio_artifacts;
CREATE POLICY "Owners manage portfolio_artifacts"
    ON portfolio_artifacts FOR ALL
    USING (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM portfolio_sections ps
            JOIN portfolios p ON p.id = ps.portfolio_id
            WHERE ps.id = portfolio_artifacts.section_id
              AND p.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM portfolio_sections ps
            JOIN portfolios p ON p.id = ps.portfolio_id
            WHERE ps.id = portfolio_artifacts.section_id
              AND p.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Staff view portfolio_artifacts" ON portfolio_artifacts;
CREATE POLICY "Staff view portfolio_artifacts"
    ON portfolio_artifacts FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    );

-- peer_reviews: the reviewer writes, staff read. Pair membership decides who
-- may see a submitted review.
DROP POLICY IF EXISTS "Reviewers manage own peer_reviews" ON peer_reviews;
CREATE POLICY "Reviewers manage own peer_reviews"
    ON peer_reviews FOR ALL
    USING (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM peer_review_pairs pr
            WHERE pr.id = peer_reviews.peer_review_pair_id
              AND pr.reviewer_id = auth.uid()
        )
    )
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM peer_review_pairs pr
            WHERE pr.id = peer_reviews.peer_review_pair_id
              AND pr.reviewer_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Authors view peer_reviews" ON peer_reviews;
CREATE POLICY "Authors view peer_reviews"
    ON peer_reviews FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM peer_review_pairs pr
            WHERE pr.id = peer_reviews.peer_review_pair_id
              AND pr.author_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Staff manage peer_reviews" ON peer_reviews;
CREATE POLICY "Staff manage peer_reviews"
    ON peer_reviews FOR ALL
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    )
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    );

-- ---------------------------------------------------------------------------
-- 2. Tables created without RLS enabled at all
-- ---------------------------------------------------------------------------

-- api_request_logs carries tenant_id, IP addresses and user agents and was
-- readable by any anon PostgREST caller.
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view own tenant api logs" ON api_request_logs;
CREATE POLICY "Admins view own tenant api logs"
    ON api_request_logs FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() = 'admin'
    );

-- Shared reference data: readable by any signed-in user, writable only by
-- platform admins (the seed scripts use the service role and bypass RLS).
ALTER TABLE nremt_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Signed-in users read nremt_categories" ON nremt_categories;
CREATE POLICY "Signed-in users read nremt_categories"
    ON nremt_categories FOR SELECT
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Platform admins manage nremt_categories" ON nremt_categories;
CREATE POLICY "Platform admins manage nremt_categories"
    ON nremt_categories FOR ALL
    USING (is_platform_admin())
    WITH CHECK (is_platform_admin());

ALTER TABLE standardized_question_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Signed-in users read standardized_question_tags" ON standardized_question_tags;
CREATE POLICY "Signed-in users read standardized_question_tags"
    ON standardized_question_tags FOR SELECT
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Platform admins manage standardized_question_tags" ON standardized_question_tags;
CREATE POLICY "Platform admins manage standardized_question_tags"
    ON standardized_question_tags FOR ALL
    USING (is_platform_admin())
    WITH CHECK (is_platform_admin());
