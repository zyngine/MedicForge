-- =============================================================================
-- Migration: 20260910000002_tenant_timezone.sql
-- Description: Give each tenant a real timezone and let the database use it.
--
-- attendance_sessions stores scheduled_date as a DATE and start_time/end_time as
-- TIMEs with no zone attached, so "is this class happening now" is unanswerable
-- without knowing where the program is. 20260910000001 worked around that by
-- having the browser send its own wall clock. That is correct for whoever is
-- looking, but it is the wrong anchor:
--
--   * an instructor travelling to another timezone sees the wrong class night
--   * nothing server-side (a cron, a report, an export) has a browser to ask
--   * two people in different zones disagree about which day it is
--
-- A class night belongs to a campus, not to whoever happens to be looking at it.
-- So the timezone lives on the tenant, and the client's clock becomes a fallback
-- for tenants that have not set one yet.
--
-- Existing tenants are backfilled from the location they already store:
-- tenants.settings->>'state' for schools (set on the Organization settings page)
-- and agency_settings.state_code for agencies.
-- =============================================================================

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS timezone TEXT;

COMMENT ON COLUMN tenants.timezone IS
  'IANA timezone for this tenant''s classes and schedules, e.g. America/Chicago. '
  'NULL means not set, in which case callers fall back to the viewer''s own clock.';

-- ---------------------------------------------------------------------------
-- Best-effort US state -> IANA timezone.
--
-- Twelve states straddle a boundary (FL, ID, IN, KS, KY, MI, ND, NE, OR, SD,
-- TN, TX). This returns the zone most of that state's population is in, which
-- is a starting value, not an authority — admins can change it, and that is the
-- whole reason it is a stored column rather than something derived on the fly.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION state_to_timezone(p_state TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE upper(trim(COALESCE(p_state, '')))
        WHEN 'AL' THEN 'America/Chicago'
        WHEN 'AK' THEN 'America/Anchorage'
        WHEN 'AZ' THEN 'America/Phoenix'
        WHEN 'AR' THEN 'America/Chicago'
        WHEN 'CA' THEN 'America/Los_Angeles'
        WHEN 'CO' THEN 'America/Denver'
        WHEN 'CT' THEN 'America/New_York'
        WHEN 'DC' THEN 'America/New_York'
        WHEN 'DE' THEN 'America/New_York'
        WHEN 'FL' THEN 'America/New_York'   -- panhandle is Central
        WHEN 'GA' THEN 'America/New_York'
        WHEN 'HI' THEN 'Pacific/Honolulu'
        WHEN 'IA' THEN 'America/Chicago'
        WHEN 'ID' THEN 'America/Boise'      -- northern panhandle is Pacific
        WHEN 'IL' THEN 'America/Chicago'
        WHEN 'IN' THEN 'America/Indiana/Indianapolis'
        WHEN 'KS' THEN 'America/Chicago'    -- four western counties are Mountain
        WHEN 'KY' THEN 'America/New_York'   -- western Kentucky is Central
        WHEN 'LA' THEN 'America/Chicago'
        WHEN 'MA' THEN 'America/New_York'
        WHEN 'MD' THEN 'America/New_York'
        WHEN 'ME' THEN 'America/New_York'
        WHEN 'MI' THEN 'America/Detroit'    -- western UP is Central
        WHEN 'MN' THEN 'America/Chicago'
        WHEN 'MO' THEN 'America/Chicago'
        WHEN 'MS' THEN 'America/Chicago'
        WHEN 'MT' THEN 'America/Denver'
        WHEN 'NC' THEN 'America/New_York'
        WHEN 'ND' THEN 'America/Chicago'    -- southwest is Mountain
        WHEN 'NE' THEN 'America/Chicago'    -- panhandle is Mountain
        WHEN 'NH' THEN 'America/New_York'
        WHEN 'NJ' THEN 'America/New_York'
        WHEN 'NM' THEN 'America/Denver'
        WHEN 'NV' THEN 'America/Los_Angeles'
        WHEN 'NY' THEN 'America/New_York'
        WHEN 'OH' THEN 'America/New_York'
        WHEN 'OK' THEN 'America/Chicago'
        WHEN 'OR' THEN 'America/Los_Angeles'  -- Malheur County is Mountain
        WHEN 'PA' THEN 'America/New_York'
        WHEN 'RI' THEN 'America/New_York'
        WHEN 'SC' THEN 'America/New_York'
        WHEN 'SD' THEN 'America/Chicago'    -- west river is Mountain
        WHEN 'TN' THEN 'America/Chicago'    -- east Tennessee is Eastern
        WHEN 'TX' THEN 'America/Chicago'    -- far west Texas is Mountain
        WHEN 'UT' THEN 'America/Denver'
        WHEN 'VA' THEN 'America/New_York'
        WHEN 'VT' THEN 'America/New_York'
        WHEN 'WA' THEN 'America/Los_Angeles'
        WHEN 'WI' THEN 'America/Chicago'
        WHEN 'WV' THEN 'America/New_York'
        WHEN 'WY' THEN 'America/Denver'
        -- territories
        WHEN 'PR' THEN 'America/Puerto_Rico'
        WHEN 'VI' THEN 'America/St_Thomas'
        WHEN 'GU' THEN 'Pacific/Guam'
        WHEN 'MP' THEN 'Pacific/Saipan'
        WHEN 'AS' THEN 'Pacific/Pago_Pago'
        ELSE NULL
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ---------------------------------------------------------------------------
-- A tenant's own wall clock.
--
-- Returns NULL when the tenant has no timezone set, or has one Postgres does
-- not recognise — AT TIME ZONE raises on an unknown name, and a bad string
-- typed into a settings form must not take attendance down with it. Callers
-- treat NULL as "fall back to the value the client sent".
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tenant_local_now(p_tenant_id UUID)
RETURNS TIMESTAMP AS $$
DECLARE
    v_tz TEXT;
BEGIN
    SELECT timezone INTO v_tz FROM tenants WHERE id = p_tenant_id;

    IF v_tz IS NULL OR trim(v_tz) = '' THEN
        RETURN NULL;
    END IF;

    BEGIN
        RETURN now() AT TIME ZONE v_tz;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Tenant % has an unrecognised timezone: %', p_tenant_id, v_tz;
        RETURN NULL;
    END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- Backfill from the location tenants already have on file.
-- ---------------------------------------------------------------------------
UPDATE tenants t
SET timezone = state_to_timezone(t.settings->>'state')
WHERE t.timezone IS NULL
  AND state_to_timezone(t.settings->>'state') IS NOT NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'agency_settings'
    ) THEN
        UPDATE tenants t
        SET timezone = state_to_timezone(a.state_code)
        FROM agency_settings a
        WHERE a.tenant_id = t.id
          AND t.timezone IS NULL
          AND state_to_timezone(a.state_code) IS NOT NULL;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Prefer the tenant's timezone over the caller's clock.
--
-- The p_local_date / p_local_time arguments stay, but are now only used when
-- the tenant has no usable timezone. Dropping first because CREATE OR REPLACE
-- cannot change a function's argument defaults.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS auto_open_due_sessions(DATE, TIME, INT);

CREATE FUNCTION auto_open_due_sessions(
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
        -- No timezone on the tenant: trust what the client told us, and only if
        -- it told us nothing fall back to the server's own (UTC) clock.
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
          AND s.schedule_id IS NOT NULL
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

DROP FUNCTION IF EXISTS ensure_attendance_window(DATE, INT);

CREATE FUNCTION ensure_attendance_window(
    p_local_date DATE DEFAULT NULL,
    p_days INT DEFAULT 60
)
RETURNS INT AS $$
DECLARE
    v_tenant_id UUID;
    v_role TEXT;
    v_now TIMESTAMP;
    v_from DATE;
    v_program_id UUID;
    v_created INT := 0;
BEGIN
    v_tenant_id := get_user_tenant_id();
    v_role := get_user_role()::TEXT;

    IF v_tenant_id IS NULL OR v_role NOT IN ('admin', 'instructor') THEN
        RETURN 0;
    END IF;

    v_now := tenant_local_now(v_tenant_id);
    v_from := COALESCE(v_now::DATE, p_local_date, (now() AT TIME ZONE 'UTC')::DATE);

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
            v_from,
            v_from + p_days,
            auth.uid()
        );
    END LOOP;

    RETURN v_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP FUNCTION IF EXISTS get_todays_sessions(UUID, UUID, DATE);

CREATE FUNCTION get_todays_sessions(
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
    v_date DATE;
BEGIN
    v_date := COALESCE(
        tenant_local_now(p_tenant_id)::DATE,
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
    WHERE s.tenant_id = p_tenant_id
      AND s.scheduled_date = v_date
      AND (p_instructor_id IS NULL OR s.created_by = p_instructor_id OR c.id IN (
          SELECT DISTINCT co.id FROM cohorts co
          JOIN cohort_courses cc ON cc.cohort_id = co.id
          JOIN courses crs ON crs.id = cc.course_id
          WHERE crs.instructor_id = p_instructor_id
      ))
    ORDER BY s.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION auto_open_due_sessions(DATE, TIME, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION ensure_attendance_window(DATE, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auto_open_due_sessions(DATE, TIME, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_attendance_window(DATE, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_todays_sessions(UUID, UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION tenant_local_now(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION state_to_timezone(TEXT) TO authenticated;
