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

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_tenant_date
    ON attendance_sessions (tenant_id, scheduled_date);
