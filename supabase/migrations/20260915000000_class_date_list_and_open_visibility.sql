-- =============================================================================
-- Migration: 20260915000000_class_date_list_and_open_visibility.sql
-- Description: Class nights from an explicit date list, openable by whoever
--              actually shows up.
--
-- Two gaps this closes, both reported by a program running evening classes:
--
-- 1. There is no way to say "these are our class dates".
--
--    program_schedules only expresses a weekly recurrence (day_of_week +
--    start_time), and generate_attendance_sessions() walks a date range looking
--    for matching weekdays. A cohort whose calendar is a published list of dates
--    -- the common case for an EMT class that meets Tue/Thu except when it
--    doesn't, plus four Saturday labs -- cannot be expressed as a recurrence at
--    all. Admins were left creating each night by hand on the night itself.
--
--    add_program_class_dates() takes the list directly and creates one
--    attendance_session per date, marked is_generated so auto-open picks it up.
--
-- 2. A substitute instructor could not see, let alone open, tonight's class.
--
--    get_todays_sessions() filtered to sessions the caller created or whose
--    cohort contains a course the caller is assigned to teach. Cover for the
--    regular instructor and the list comes back empty; the only way in was to
--    create a second, ad-hoc session, which splits the night's attendance across
--    two rows. Any admin or instructor in the tenant now sees every session for
--    the day, which is also what auto_open_due_sessions() has always done.
--
-- Also fixed here: get_todays_sessions() is SECURITY DEFINER and took the tenant
-- as an argument without checking it against the caller, so any signed-in user
-- could read any other tenant's class schedule by passing their id. The tenant
-- now comes from the caller.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Create sessions for an explicit list of dates.
--
-- Returns one row per supplied date saying what happened to it, so the UI can
-- report "10 added, 2 already scheduled, 1 on a holiday" rather than a bare
-- count. Dates already carrying a session for this program at this start time
-- are left alone, which makes the whole call safe to repeat -- an admin pasting
-- a corrected list does not double up the nights that were already right.
--
-- Excluded dates (program_excluded_dates) are reported rather than created: the
-- admin set that holiday up deliberately, and silently scheduling a class on it
-- because it appeared in a pasted list would be the wrong way to resolve the
-- contradiction.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION add_program_class_dates(
    p_program_id   UUID,
    p_dates        DATE[],
    p_start_time   TIME,
    p_end_time     TIME,
    p_title        TEXT DEFAULT 'Class',
    p_session_type TEXT DEFAULT 'lecture',
    p_location     TEXT DEFAULT NULL
)
RETURNS TABLE (
    class_date DATE,
    outcome    TEXT,      -- 'created' | 'exists' | 'excluded'
    session_id UUID
) AS $$
DECLARE
    v_tenant_id UUID;
    v_role      TEXT;
    v_date      DATE;
    v_new_id    UUID;
    v_title     TEXT;
    v_type      TEXT;
BEGIN
    v_tenant_id := get_user_tenant_id();
    v_role := get_user_role()::TEXT;

    IF v_tenant_id IS NULL OR v_role NOT IN ('admin', 'instructor') THEN
        RAISE EXCEPTION 'Only an admin or instructor can add class dates';
    END IF;

    -- The program must be one of ours. Without this the tenant check above buys
    -- nothing: the insert would land in our tenant but hang off someone else's
    -- cohort.
    IF NOT EXISTS (
        SELECT 1 FROM cohorts c
        WHERE c.id = p_program_id AND c.tenant_id = v_tenant_id
    ) THEN
        RAISE EXCEPTION 'Program % does not belong to this organization', p_program_id;
    END IF;

    IF p_dates IS NULL OR array_length(p_dates, 1) IS NULL THEN
        RETURN;
    END IF;

    IF array_length(p_dates, 1) > 400 THEN
        RAISE EXCEPTION 'Too many dates in one request (% supplied, 400 maximum)',
            array_length(p_dates, 1);
    END IF;

    IF p_start_time IS NULL OR p_end_time IS NULL OR p_end_time <= p_start_time THEN
        RAISE EXCEPTION 'A class must end after it starts (start %, end %)',
            p_start_time, p_end_time;
    END IF;

    v_title := NULLIF(btrim(COALESCE(p_title, '')), '');
    v_title := COALESCE(v_title, 'Class');
    v_type  := COALESCE(NULLIF(btrim(COALESCE(p_session_type, '')), ''), 'lecture');

    -- DISTINCT so a list with a repeated date does not try to insert it twice and
    -- then report the second one as pre-existing.
    FOR v_date IN
        SELECT DISTINCT d FROM unnest(p_dates) AS d WHERE d IS NOT NULL ORDER BY d
    LOOP
        IF EXISTS (
            SELECT 1 FROM program_excluded_dates x
            WHERE x.program_id = p_program_id
              AND x.excluded_date = v_date
        ) THEN
            RETURN QUERY SELECT v_date, 'excluded'::TEXT, NULL::UUID;
            CONTINUE;
        END IF;

        SELECT s.id INTO v_new_id
        FROM attendance_sessions s
        WHERE s.tenant_id = v_tenant_id
          AND s.program_id = p_program_id
          AND s.scheduled_date = v_date
          AND s.start_time = p_start_time
        LIMIT 1;

        IF v_new_id IS NOT NULL THEN
            RETURN QUERY SELECT v_date, 'exists'::TEXT, v_new_id;
            v_new_id := NULL;
            CONTINUE;
        END IF;

        INSERT INTO attendance_sessions (
            tenant_id, program_id, course_id, schedule_id,
            title, session_type, location,
            scheduled_date, start_time, end_time,
            is_generated, session_status,
            tardy_window_minutes, allow_late_checkin,
            created_by
        ) VALUES (
            v_tenant_id, p_program_id, NULL, NULL,
            v_title, v_type, NULLIF(btrim(COALESCE(p_location, '')), ''),
            v_date, p_start_time, p_end_time,
            -- is_generated is what auto_open_due_sessions() keys on below. These
            -- rows have no schedule_id, so without it they would sit at
            -- 'scheduled' all night with nobody able to check in.
            true, 'scheduled',
            15, true,
            auth.uid()
        )
        RETURNING id INTO v_new_id;

        RETURN QUERY SELECT v_date, 'created'::TEXT, v_new_id;
        v_new_id := NULL;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Makes the per-date duplicate check above a lookup rather than a scan.
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_program_date
    ON attendance_sessions (program_id, scheduled_date);

-- ---------------------------------------------------------------------------
-- Auto-open: key on is_generated, not schedule_id.
--
-- Identical to 20260910000002's version apart from that predicate. Sessions from
-- a date list have no schedule_id, and requiring one meant they never opened.
-- Both generate_attendance_sessions() and add_program_class_dates() set
-- is_generated, so it covers the recurrence and the date list alike, while still
-- leaving ad-hoc "Start Attendance" sessions (is_generated false, opened by hand
-- at the moment they are created) out of it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_open_due_sessions(
    p_local_date DATE DEFAULT NULL,
    p_local_time TIME DEFAULT NULL,
    p_lead_minutes INT DEFAULT 15
)
RETURNS TABLE (
    opened_session_id UUID,
    opened_title TEXT,
    opened_code TEXT,
    opened_expires_at TIMESTAMPTZ
) AS $$
DECLARE
    v_tenant_id UUID;
    v_role TEXT;
    v_now TIMESTAMP;
    v_date DATE;
    v_time TIME;
BEGIN
    v_tenant_id := get_user_tenant_id();
    v_role := get_user_role()::TEXT;

    IF v_tenant_id IS NULL OR v_role NOT IN ('admin', 'instructor') THEN
        RETURN;
    END IF;

    v_now := tenant_local_now(v_tenant_id);

    IF v_now IS NOT NULL THEN
        v_date := v_now::DATE;
        v_time := v_now::TIME;
    ELSE
        v_date := COALESCE(p_local_date, (now() AT TIME ZONE 'UTC')::DATE);
        v_time := COALESCE(p_local_time, (now() AT TIME ZONE 'UTC')::TIME);
    END IF;

    p_lead_minutes := LEAST(GREATEST(COALESCE(p_lead_minutes, 15), 0), 120);

    RETURN QUERY
    WITH due AS (
        SELECT s.id, s.title, s.end_time
        FROM attendance_sessions s
        WHERE s.tenant_id = v_tenant_id
          AND s.scheduled_date = v_date
          AND COALESCE(s.is_generated, false) = true
          AND COALESCE(s.session_status, 'scheduled') = 'scheduled'
          AND v_time >= s.start_time - make_interval(mins => p_lead_minutes)
          AND v_time <= s.end_time
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
            now() + (d.end_time - v_time),
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
-- Retire the original two-argument get_todays_sessions().
--
-- 20250227000003 defined get_todays_sessions(UUID, UUID DEFAULT NULL) and
-- 20260910000001 added a three-argument version alongside it rather than
-- replacing it, so both exist. Three problems with leaving it:
--
--   * a two-argument call is now ambiguous between the two, because the third
--     argument has a default -- Postgres refuses it outright with "function
--     get_todays_sessions(unknown, unknown) is not unique"
--   * it filters on CURRENT_DATE, the server's UTC date, which is the evening
--     class bug 20260910000001 existed to fix
--   * it is SECURITY DEFINER and never checks p_tenant_id against the caller, so
--     any signed-in user can read any tenant's class schedule through it
--
-- Nothing calls it: the only caller, useTodaysSessions, passes all three
-- arguments by name. Dropping it also makes a two-argument call resolve to the
-- version below, which does check the tenant.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_todays_sessions(UUID, UUID);

-- ---------------------------------------------------------------------------
-- Today's sessions: every session in the tenant, for any admin or instructor.
--
-- p_tenant_id is kept in the signature so existing callers still compile, but it
-- is now validated rather than trusted -- see the header note. p_instructor_id
-- likewise stays, and still narrows the list for a caller who is neither an
-- admin nor an instructor, so nothing a student can reach gets wider.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_todays_sessions(
    p_tenant_id UUID,
    p_instructor_id UUID,
    p_local_date DATE DEFAULT NULL
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
DECLARE
    v_tenant_id UUID;
    v_role TEXT;
    v_date DATE;
    v_staff BOOLEAN;
BEGIN
    v_tenant_id := get_user_tenant_id();
    v_role := get_user_role()::TEXT;

    -- Callers pass their own tenant; anything else is someone reaching across
    -- tenants through a SECURITY DEFINER function, so return nothing.
    IF v_tenant_id IS NULL
       OR (p_tenant_id IS NOT NULL AND p_tenant_id <> v_tenant_id) THEN
        RETURN;
    END IF;

    v_staff := v_role IN ('admin', 'instructor');

    v_date := COALESCE(
        tenant_local_now(v_tenant_id)::DATE,
        p_local_date,
        (now() AT TIME ZONE 'UTC')::DATE
    );

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
    WHERE s.tenant_id = v_tenant_id
      AND s.scheduled_date = v_date
      AND (
          v_staff
          OR p_instructor_id IS NULL
          OR s.created_by = p_instructor_id
          OR c.id IN (
              SELECT DISTINCT co.id FROM cohorts co
              JOIN cohort_courses cc ON cc.cohort_id = co.id
              JOIN courses crs ON crs.id = cc.course_id
              WHERE crs.instructor_id = p_instructor_id
          )
      )
    ORDER BY s.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION add_program_class_dates(UUID, DATE[], TIME, TIME, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION add_program_class_dates(UUID, DATE[], TIME, TIME, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_open_due_sessions(DATE, TIME, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_todays_sessions(UUID, UUID, DATE) TO authenticated;
