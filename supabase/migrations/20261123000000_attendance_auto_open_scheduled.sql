-- =============================================================================
-- Migration: 20261123000000_attendance_auto_open_scheduled.sql
-- Description: Open class nights on a schedule, not when somebody looks.
--
-- auto_open_due_sessions() works. Checked against production: for New Holland's
-- Monday/Thursday 18:00-22:00 class, every condition it tests passes for the
-- session sitting on today's date. It has simply never been called at the right
-- moment, because the only caller is the instructor attendance page and it runs
-- once when that page mounts.
--
-- The result, across ten class nights from 22 October: zero codes on scheduled
-- sessions, zero check-ins, every one still 'scheduled'. Meanwhile nine codes
-- exist on ad-hoc sessions, because instructors pressed "Start Attendance" —
-- the button they already knew — which creates a *separate* session and leaves
-- the scheduled one untouched. The feature was asked for as "without any input
-- from adjunct instructors"; depending on one of them to open a particular page
-- inside the class window is input.
--
-- So this adds the thing the request actually needs: a job that opens class
-- nights whether or not anyone is logged in.
--
-- auto_open_due_sessions() cannot be reused as it stands. It derives the tenant
-- from auth.uid() and refuses a caller who is not an admin or instructor, which
-- is right for a browser and useless for a cron job with no session. The work
-- moves into a tenant-scoped function that takes the tenant as an argument;
-- the existing one is left exactly as it is so the page keeps working.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Open every due session for ONE tenant. No auth: the caller is trusted.
--
-- Not granted to authenticated — only the cron job and the service role run it,
-- so a signed-in user cannot pass someone else's tenant id. The browser keeps
-- using auto_open_due_sessions(), which checks the caller.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION open_due_sessions_for_tenant(
    p_tenant_id UUID,
    p_lead_minutes INT DEFAULT 15
)
RETURNS INT AS $$
DECLARE
    v_now TIMESTAMP;
    v_date DATE;
    v_time TIME;
    v_opened INT := 0;
BEGIN
    -- A tenant with no timezone has no answer to "is it tonight" that does not
    -- come from a browser, so it is skipped rather than guessed at in UTC.
    v_now := tenant_local_now(p_tenant_id);
    IF v_now IS NULL THEN
        RETURN 0;
    END IF;

    v_date := v_now::DATE;
    v_time := v_now::TIME;
    p_lead_minutes := LEAST(GREATEST(COALESCE(p_lead_minutes, 15), 0), 120);

    WITH due AS (
        SELECT s.id, s.end_time
        FROM attendance_sessions s
        WHERE s.tenant_id = p_tenant_id
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
        SELECT d.id, p_tenant_id, generate_check_in_code(),
               now() + (d.end_time - v_time),
               -- No one pressed anything, so there is nobody to credit.
               NULL
        FROM due d
        ON CONFLICT (session_id) DO NOTHING
        RETURNING attendance_check_in_codes.session_id
    ),
    marked AS (
        UPDATE attendance_sessions s
        SET session_status = 'in_progress'
        WHERE s.id IN (SELECT o.session_id FROM opened o)
        RETURNING s.id
    )
    SELECT count(*) INTO v_opened FROM marked;

    RETURN v_opened;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- Every tenant that has a timezone set. Returns how many were opened in total.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION open_due_sessions_all_tenants(
    p_lead_minutes INT DEFAULT 15
)
RETURNS INT AS $$
DECLARE
    v_tenant RECORD;
    v_total INT := 0;
BEGIN
    FOR v_tenant IN
        SELECT id FROM tenants
        WHERE timezone IS NOT NULL AND btrim(timezone) <> ''
    LOOP
        v_total := v_total + open_due_sessions_for_tenant(v_tenant.id, p_lead_minutes);
    END LOOP;

    RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION open_due_sessions_for_tenant(UUID, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION open_due_sessions_all_tenants(INT) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- Keep the rolling window of generated sessions topped up too, for the same
-- reason: ensure_attendance_window() is also only called from that one page.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_sessions_all_tenants(p_days INT DEFAULT 60)
RETURNS INT AS $$
DECLARE
    v_row RECORD;
    v_total INT := 0;
    v_from DATE;
BEGIN
    p_days := LEAST(GREATEST(COALESCE(p_days, 60), 1), 365);

    -- attendance_sessions.created_by is NOT NULL, and a cron run has no user, so
    -- the rows are attributed to whoever set the schedule up — falling back to
    -- an admin of that tenant if that account has since been removed. A schedule
    -- with neither is skipped rather than failing the whole run.
    FOR v_row IN
        SELECT DISTINCT ps.program_id, ps.tenant_id,
               COALESCE(
                 ps.created_by,
                 (SELECT u.id FROM users u
                   WHERE u.tenant_id = ps.tenant_id AND u.role = 'admin'
                   ORDER BY u.created_at LIMIT 1)
               ) AS attribute_to
        FROM program_schedules ps
        JOIN tenants t ON t.id = ps.tenant_id
        WHERE ps.is_active = true
          AND t.timezone IS NOT NULL AND btrim(t.timezone) <> ''
    LOOP
        CONTINUE WHEN v_row.attribute_to IS NULL;

        v_from := COALESCE(tenant_local_now(v_row.tenant_id)::DATE, current_date);
        v_total := v_total + generate_attendance_sessions(
            v_row.program_id, v_row.tenant_id, v_from, v_from + p_days,
            v_row.attribute_to
        );
    END LOOP;

    RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION generate_sessions_all_tenants(INT) FROM PUBLIC;
