-- =============================================================================
-- Migration: 20260910000000_reconcile_attendance_sessions.sql
-- Description: Converge attendance_sessions on the shape production actually has.
--
-- Two migrations define a table called attendance_sessions, with completely
-- different columns:
--
--   20240305000000_qr_attendance.sql    an event-based QR check-in design:
--                                       event_id, session_code, expires_at,
--                                       location_lat/lng, location_radius_meters
--
--   20240315000000_attendance_tracking  the course/class design the app actually
--                                       uses: title, scheduled_date, start_time,
--                                       end_time, session_type, ...
--
-- The second one uses CREATE TABLE IF NOT EXISTS, so on a database that ran the
-- first it is silently skipped and every later reference to scheduled_date,
-- title or course_id fails. Production has the second (course-based) shape, so
-- that is the authoritative one; a database rebuilt from these migrations gets
-- the first and does not work.
--
-- Rather than rewrite history, this migration adds whatever is missing and
-- relaxes the constraints the abandoned design left behind. On production every
-- statement here is a no-op.
--
-- The QR design's own code is dead: components/attendance/QRCodeDisplay and
-- QRScanner are not rendered anywhere, and the attendance_checkins table they
-- query does not exist in production at all. Its columns are left in place
-- rather than dropped, so no data can be lost by applying this.
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'attendance_sessions'
    ) THEN
        RAISE NOTICE 'attendance_sessions does not exist; nothing to reconcile';
        RETURN;
    END IF;

    -- --- columns the app requires -------------------------------------------
    -- Added nullable: the table may already hold rows from the other design,
    -- and a NOT NULL column cannot be added to those. Production already has
    -- title/scheduled_date/start_time/end_time/session_type as NOT NULL and is
    -- unaffected.
    ALTER TABLE attendance_sessions
        ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS title TEXT,
        ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'lecture',
        ADD COLUMN IF NOT EXISTS scheduled_date DATE,
        ADD COLUMN IF NOT EXISTS start_time TIME,
        ADD COLUMN IF NOT EXISTS end_time TIME,
        ADD COLUMN IF NOT EXISTS location TEXT,
        ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS notes TEXT,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS session_status TEXT DEFAULT 'scheduled',
        ADD COLUMN IF NOT EXISTS tardy_window_minutes INTEGER DEFAULT 15,
        ADD COLUMN IF NOT EXISTS allow_late_checkin BOOLEAN DEFAULT true;

    -- Added by 20250227000003_program_schedules, which never ran on a database
    -- that failed earlier in the chain.
    ALTER TABLE attendance_sessions
        ADD COLUMN IF NOT EXISTS schedule_id UUID,
        ADD COLUMN IF NOT EXISTS is_generated BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS program_id UUID;

    -- --- relax what the abandoned design mandated ---------------------------
    -- event_id NOT NULL would reject every class-based session.
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'attendance_sessions'
          AND column_name = 'event_id' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE attendance_sessions ALTER COLUMN event_id DROP NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'attendance_sessions'
          AND column_name = 'session_code' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE attendance_sessions ALTER COLUMN session_code DROP NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'attendance_sessions'
          AND column_name = 'expires_at' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE attendance_sessions ALTER COLUMN expires_at DROP NOT NULL;
    END IF;

    -- UNIQUE(event_id, session_code) collapses every class-based session into a
    -- single (NULL, NULL) row conflict on some Postgres configurations.
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'attendance_sessions_event_id_session_code_key'
    ) THEN
        ALTER TABLE attendance_sessions
            DROP CONSTRAINT attendance_sessions_event_id_session_code_key;
    END IF;
END $$;

-- The trigger from 20240305 stamps session_code on insert. Harmless on
-- class-based rows, but it only exists on databases that ran that migration.

-- Foreign keys for the program-schedule columns, once the referenced tables
-- exist. Separate from the ADD COLUMN above so a missing table cannot abort it.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'program_schedules')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint
                       WHERE conname = 'attendance_sessions_schedule_id_fkey') THEN
        ALTER TABLE attendance_sessions
            ADD CONSTRAINT attendance_sessions_schedule_id_fkey
            FOREIGN KEY (schedule_id) REFERENCES program_schedules(id) ON DELETE SET NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'cohorts')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint
                       WHERE conname = 'attendance_sessions_program_id_fkey') THEN
        ALTER TABLE attendance_sessions
            ADD CONSTRAINT attendance_sessions_program_id_fkey
            FOREIGN KEY (program_id) REFERENCES cohorts(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- attendance_sessions.course_id must be nullable.
--
-- generate_attendance_sessions() (20250227000003_program_schedules.sql) inserts
-- NULL here on purpose — a pre-scheduled class belongs to a program (a cohort),
-- not to one course, and the function says so in a comment: "No specific course".
-- But 20240315000000 declares the column NOT NULL, and production has it NOT NULL
-- too, so that insert has always failed with a not-null violation. The
-- "Generate sessions" action never created anything, in any environment.
--
-- Attendance for a specific course still sets course_id; the ad-hoc "Start
-- Attendance" path always has one. Only program-level generated sessions leave it
-- empty, which is what program_id is for.
--
-- After this, attendance_sessions.course_id is nullable, so
-- src/types/database.types.ts should be regenerated — it currently types the
-- column as non-null.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'attendance_sessions'
          AND column_name = 'course_id'
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE attendance_sessions ALTER COLUMN course_id DROP NOT NULL;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Columns production stores as text where the migrations declare an enum.
--
-- Production has attendance_sessions.session_type, attendance_records.status and
-- plagiarism_checks.status as plain text — the session_type enum does not exist
-- there at all. A rebuild made them enums instead, which breaks real code:
--
--   * generate_attendance_sessions() copies program_schedules.session_type (text)
--     into attendance_sessions.session_type, which fails against an enum
--   * get_todays_sessions() declares session_type TEXT in its RETURNS TABLE, so
--     an enum column fails the result-type check
--   * the attendance UI offers statuses ("left_early", "virtual") that a strict
--     enum rejects
--
-- Widening an enum column to text never loses data, and it makes a rebuilt
-- database behave like production. The enum types themselves are left in place —
-- other tables still use them.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('attendance_sessions', 'session_type'),
            ('attendance_records',  'status'),
            ('plagiarism_checks',   'status')
        ) AS t(tbl, col)
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = r.tbl
              AND column_name = r.col
              AND data_type = 'USER-DEFINED'
        ) THEN
            -- Drop the default first: it is an enum literal and cannot survive
            -- the type change.
            EXECUTE format('ALTER TABLE %I ALTER COLUMN %I DROP DEFAULT', r.tbl, r.col);
            EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE TEXT USING %I::TEXT', r.tbl, r.col, r.col);
            RAISE NOTICE 'Widened %.% from enum to text to match production', r.tbl, r.col;
        END IF;
    END LOOP;
END $$;

-- Restore the defaults the original declarations intended, now as text.
DO $$
BEGIN
    ALTER TABLE attendance_sessions ALTER COLUMN session_type SET DEFAULT 'lecture';
    ALTER TABLE attendance_records ALTER COLUMN status SET DEFAULT 'absent';
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_tenant_date
    ON attendance_sessions (tenant_id, scheduled_date);
