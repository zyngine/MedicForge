-- Enhanced Attendance System with Tardy Support
-- This migration adds tardy window configuration and tracking

-- Add tardy configuration to attendance_sessions
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS tardy_window_minutes INT DEFAULT 15;
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS allow_late_checkin BOOLEAN DEFAULT true;
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS session_status TEXT DEFAULT 'scheduled';
-- session_status: 'scheduled', 'in_progress', 'completed', 'cancelled'

-- Add was_late flag to attendance_records for quick filtering
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS was_late BOOLEAN DEFAULT false;

-- Add 'virtual' to the attendance status enum if not exists
DO $$
BEGIN
  -- Check if 'virtual' value exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'virtual'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'attendance_status')
  ) THEN
    ALTER TYPE attendance_status ADD VALUE 'virtual';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update qr_check_in function with tardy logic
CREATE OR REPLACE FUNCTION qr_check_in(
  p_code TEXT,
  p_student_id UUID,
  p_tenant_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_code_record RECORD;
  v_session RECORD;
  v_record RECORD;
  v_status attendance_status;
  v_was_late BOOLEAN := false;
  v_current_time TIMESTAMPTZ := NOW();
  v_session_end TIMESTAMPTZ;
  v_tardy_deadline TIMESTAMPTZ;
BEGIN
  -- Get the code record with session info
  SELECT c.*, s.title as session_title, s.scheduled_date, s.start_time, s.end_time,
         s.tardy_window_minutes, s.allow_late_checkin
  INTO v_code_record
  FROM attendance_check_in_codes c
  JOIN attendance_sessions s ON s.id = c.session_id
  WHERE c.code = p_code
    AND c.tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid check-in code';
  END IF;

  -- Calculate session end time and tardy deadline
  v_session_end := (v_code_record.scheduled_date::DATE + v_code_record.end_time)::TIMESTAMPTZ;
  v_tardy_deadline := v_session_end + (COALESCE(v_code_record.tardy_window_minutes, 15) * INTERVAL '1 minute');

  -- Determine status based on timing
  IF v_code_record.expires_at >= v_current_time THEN
    -- Within normal check-in window -> PRESENT
    v_status := 'present';
    v_was_late := false;
  ELSIF v_current_time <= v_tardy_deadline THEN
    -- Within tardy window -> TARDY (late)
    v_status := 'late';
    v_was_late := true;
  ELSIF v_code_record.allow_late_checkin THEN
    -- After tardy window but late check-in allowed -> TARDY
    v_status := 'late';
    v_was_late := true;
  ELSE
    -- After tardy window and late check-in not allowed
    RAISE EXCEPTION 'Check-in window has closed for this session';
  END IF;

  -- Create or update attendance record
  INSERT INTO attendance_records (
    tenant_id, session_id, student_id, status, check_in_time, was_late, recorded_by, recorded_at
  ) VALUES (
    p_tenant_id, v_code_record.session_id, p_student_id, v_status, v_current_time, v_was_late, p_student_id, v_current_time
  )
  ON CONFLICT (session_id, student_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    check_in_time = EXCLUDED.check_in_time,
    was_late = EXCLUDED.was_late,
    recorded_at = EXCLUDED.recorded_at
  RETURNING * INTO v_record;

  -- Return success with session info and status
  RETURN jsonb_build_object(
    'success', true,
    'record_id', v_record.id,
    'session_title', v_code_record.session_title,
    'check_in_time', v_record.check_in_time,
    'status', v_status::TEXT,
    'was_late', v_was_late
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION qr_check_in(TEXT, UUID, UUID) TO authenticated;

-- Create index for fast tardy queries
CREATE INDEX IF NOT EXISTS idx_attendance_records_was_late
  ON attendance_records(was_late) WHERE was_late = true;

-- Create index for session status
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_status
  ON attendance_sessions(session_status);
