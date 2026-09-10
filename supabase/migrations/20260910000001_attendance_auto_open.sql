-- =============================================================================
-- Migration: 20260910000001_attendance_auto_open.sql
-- Description: Make pre-scheduled attendance open itself on a class night.
--
-- Before this, program_schedules + generate_attendance_sessions() could create
-- sessions for a date range, but nothing ever opened one: a session sat at
-- session_status 'scheduled' with no check-in code until an instructor pressed a
-- button, and that button created a whole new ad-hoc session instead.
--
-- Two pieces are added here:
--
--   ensure_attendance_window()  keeps a rolling window of sessions generated
--                               ahead for every active schedule in the caller's
--                               tenant, so there is always a session to open.
--
--   auto_open_due_sessions()    opens the sessions whose class time has arrived,
--                               in one statement so two instructors loading the
--                               page at once cannot double-open.
--
-- Both derive the tenant from auth.uid() rather than taking it as an argument,
-- so a caller cannot reach into another tenant, and both require an admin or
-- instructor role.
--
-- On local time: scheduled_date is a DATE and start_time/end_time are TIME, with
-- no zone stored anywhere. Comparing them against a UTC now() breaks exactly the
-- case that matters here — an evening class. A 20:00 class in US Central is
-- 01:00-02:00 UTC the *next* day, so a UTC CURRENT_DATE stops matching the
-- session's own date partway through the class. The caller therefore passes its
-- own local date and time and all comparisons stay in local terms.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- One code per session. 20240315000000 declared UNIQUE(session_id) but
-- 20250226000003 re-created the table without it, and CREATE TABLE IF NOT
-- EXISTS means whichever ran first decides. The code below relies on it to make
-- opening idempotent, so assert it here.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    -- Collapse any pre-existing duplicates, keeping the newest code per session.
    DELETE FROM attendance_check_in_codes c
    USING attendance_check_in_codes newer
    WHERE c.session_id = newer.session_id
      AND c.created_at < newer.created_at;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'attendance_check_in_codes_session_id_key'
    ) THEN
        CREATE UNIQUE INDEX attendance_check_in_codes_session_id_key
            ON attendance_check_in_codes (session_id);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Six-character check-in code, ambiguous glyphs (0/O, 1/I) left out.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_check_in_code()
RETURNS TEXT AS $$
DECLARE
    v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    v_code TEXT := '';
    i INT;
BEGIN
    FOR i IN 1..6 LOOP
        v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::INT, 1);
    END LOOP;
    RETURN v_code;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ---------------------------------------------------------------------------
-- Keep a rolling window of generated sessions for the caller's tenant.
-- Idempotent: generate_attendance_sessions() skips dates that already have a
-- session for the schedule, so calling this repeatedly is cheap and safe.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ensure_attendance_window(
    p_local_date DATE,
    p_days INT DEFAULT 60
)
RETURNS INT AS $$
DECLARE
    v_tenant_id UUID;
    v_role TEXT;
    v_program_id UUID;
    v_created INT := 0;
BEGIN
    v_tenant_id := get_user_tenant_id();
    v_role := get_user_role()::TEXT;

    IF v_tenant_id IS NULL OR v_role NOT IN ('admin', 'instructor') THEN
        RETURN 0;
    END IF;

    -- Guard against a caller asking for an unbounded window.
    p_days := LEAST(GREATEST(COALESCE(p_days, 60), 1), 365);

    FOR v_program_id IN
        SELECT DISTINCT program_id
        FROM program_schedules
        WHERE tenant_id = v_tenant_id
          AND is_active = true
    LOOP
        v_created := v_created + generate_attendance_sessions(
            v_program_id,
            v_tenant_id,
            p_local_date,
            p_local_date + p_days,
            auth.uid()
        );
    END LOOP;

    RETURN v_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- Open every scheduled session whose class time has arrived.
--
-- "Arrived" means: the session is on p_local_date, p_local_time is at or after
-- start_time minus p_lead_minutes, and not past end_time. A session that
-- already has a code is skipped by the ON CONFLICT, which is what makes this
-- safe to call from every page load and from several instructors at once.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_open_due_sessions(
    p_local_date DATE,
    p_local_time TIME,
    p_lead_minutes INT DEFAULT 15
)
-- The OUT columns are deliberately prefixed: a plain "session_id" here would
-- shadow attendance_check_in_codes.session_id inside ON CONFLICT below and make
-- the reference ambiguous.
RETURNS TABLE (
    opened_session_id UUID,
    opened_title TEXT,
    opened_code TEXT,
    opened_expires_at TIMESTAMPTZ
) AS $$
DECLARE
    v_tenant_id UUID;
    v_role TEXT;
BEGIN
    v_tenant_id := get_user_tenant_id();
    v_role := get_user_role()::TEXT;

    IF v_tenant_id IS NULL OR v_role NOT IN ('admin', 'instructor') THEN
        RETURN;
    END IF;

    p_lead_minutes := LEAST(GREATEST(COALESCE(p_lead_minutes, 15), 0), 120);

    RETURN QUERY
    WITH due AS (
        SELECT s.id, s.title, s.end_time
        FROM attendance_sessions s
        WHERE s.tenant_id = v_tenant_id
          AND s.scheduled_date = p_local_date
          AND s.schedule_id IS NOT NULL          -- only pre-scheduled classes
          AND COALESCE(s.session_status, 'scheduled') = 'scheduled'
          AND p_local_time >= s.start_time - make_interval(mins => p_lead_minutes)
          AND p_local_time <= s.end_time
          AND NOT EXISTS (
              SELECT 1 FROM attendance_check_in_codes c WHERE c.session_id = s.id
          )
    ),
    opened AS (
        INSERT INTO attendance_check_in_codes (
            session_id, tenant_id, code, expires_at, created_by
        )
        SELECT
            d.id,
            v_tenant_id,
            generate_check_in_code(),
            -- Expire when the class ends. The stored end_time is local, and the
            -- caller told us what local time it is, so shift by the difference
            -- between the two rather than assuming the server's zone.
            now() + (d.end_time - p_local_time),
            auth.uid()
        FROM due d
        ON CONFLICT (session_id) DO NOTHING
        RETURNING attendance_check_in_codes.session_id,
                  attendance_check_in_codes.code,
                  attendance_check_in_codes.expires_at
    ),
    marked AS (
        UPDATE attendance_sessions s
        SET session_status = 'in_progress'
        WHERE s.id IN (SELECT o.session_id FROM opened o)
        RETURNING s.id, s.title
    )
    SELECT m.id, m.title, o.code, o.expires_at
    FROM opened o
    JOIN marked m ON m.id = o.session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- Today's sessions, for a caller-supplied local date.
--
-- The existing two-argument get_todays_sessions() filters on CURRENT_DATE,
-- which is the server's UTC date — so an evening class drops off the list
-- partway through itself in any timezone behind UTC. This overload takes the
-- date from the caller. The old signature is left alone so nothing breaks.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_todays_sessions(
    p_tenant_id UUID,
    p_instructor_id UUID,
    p_local_date DATE
) RETURNS TABLE (
    id UUID,
    title TEXT,
    program_id UUID,
    program_name TEXT,
    scheduled_date DATE,
    start_time TIME,
    end_time TIME,
    session_type TEXT,
    location TEXT,
    session_status TEXT,
    check_in_count BIGINT,
    has_active_code BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.title,
        s.program_id,
        c.name as program_name,
        s.scheduled_date,
        s.start_time,
        s.end_time,
        s.session_type,
        s.location,
        s.session_status,
        (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = s.id) as check_in_count,
        EXISTS (
            SELECT 1 FROM attendance_check_in_codes cc
            WHERE cc.session_id = s.id AND cc.expires_at > NOW()
        ) as has_active_code
    FROM attendance_sessions s
    LEFT JOIN cohorts c ON c.id = s.program_id
    WHERE s.tenant_id = p_tenant_id
      AND s.scheduled_date = p_local_date
      AND (p_instructor_id IS NULL OR s.created_by = p_instructor_id OR c.id IN (
          SELECT DISTINCT co.id FROM cohorts co
          JOIN cohort_courses cc ON cc.cohort_id = co.id
          JOIN courses crs ON crs.id = cc.course_id
          WHERE crs.instructor_id = p_instructor_id
      ))
    ORDER BY s.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION ensure_attendance_window(DATE, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION auto_open_due_sessions(DATE, TIME, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ensure_attendance_window(DATE, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_open_due_sessions(DATE, TIME, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_todays_sessions(UUID, UUID, DATE) TO authenticated;
