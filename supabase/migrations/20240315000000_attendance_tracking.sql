-- Attendance Tracking System
-- Migration: 20240315000000_attendance_tracking.sql

-- Session types
CREATE TYPE session_type AS ENUM (
  'lecture',
  'lab',
  'clinical',
  'exam',
  'simulation',
  'other'
);

-- Attendance status
CREATE TYPE attendance_status AS ENUM (
  'present',
  'absent',
  'late',
  'excused',
  'left_early'
);

-- Attendance sessions table
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  session_type session_type NOT NULL DEFAULT 'lecture',
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id),
  status attendance_status NOT NULL DEFAULT 'absent',
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  minutes_present INTEGER,
  notes TEXT,
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_tenant ON attendance_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_course ON attendance_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON attendance_sessions(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON attendance_records(student_id);

-- Enable RLS
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendance_sessions
CREATE POLICY "Users can view sessions in their tenant"
  ON attendance_sessions FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Instructors can create sessions"
  ON attendance_sessions FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

CREATE POLICY "Instructors can update sessions"
  ON attendance_sessions FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

CREATE POLICY "Instructors can delete sessions"
  ON attendance_sessions FOR DELETE
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- RLS Policies for attendance_records
CREATE POLICY "Users can view attendance in their tenant"
  ON attendance_records FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (
      student_id = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    )
  );

CREATE POLICY "Instructors can create attendance records"
  ON attendance_records FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

CREATE POLICY "Instructors can update attendance records"
  ON attendance_records FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Function to get course attendance summary
CREATE OR REPLACE FUNCTION get_course_attendance_summary(
  p_course_id UUID,
  p_tenant_id UUID
) RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  total_sessions BIGINT,
  sessions_present BIGINT,
  sessions_absent BIGINT,
  sessions_late BIGINT,
  sessions_excused BIGINT,
  attendance_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as student_id,
    u.full_name as student_name,
    COUNT(DISTINCT s.id) as total_sessions,
    COUNT(DISTINCT CASE WHEN r.status = 'present' OR r.status = 'left_early' THEN s.id END) as sessions_present,
    COUNT(DISTINCT CASE WHEN r.status = 'absent' OR r.status IS NULL THEN s.id END) as sessions_absent,
    COUNT(DISTINCT CASE WHEN r.status = 'late' THEN s.id END) as sessions_late,
    COUNT(DISTINCT CASE WHEN r.status = 'excused' THEN s.id END) as sessions_excused,
    CASE
      WHEN COUNT(DISTINCT s.id) > 0 THEN
        ROUND(
          (COUNT(DISTINCT CASE WHEN r.status IN ('present', 'late', 'excused', 'left_early') THEN s.id END)::DECIMAL /
           COUNT(DISTINCT s.id)::DECIMAL) * 100,
          2
        )
      ELSE 0
    END as attendance_rate
  FROM users u
  JOIN enrollments e ON u.id = e.student_id AND e.course_id = p_course_id
  CROSS JOIN attendance_sessions s
  LEFT JOIN attendance_records r ON r.session_id = s.id AND r.student_id = u.id
  WHERE s.course_id = p_course_id
    AND s.tenant_id = p_tenant_id
    AND e.status = 'active'
  GROUP BY u.id, u.full_name
  ORDER BY u.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get session attendance details
CREATE OR REPLACE FUNCTION get_session_attendance(
  p_session_id UUID,
  p_tenant_id UUID
) RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  student_email TEXT,
  status attendance_status,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  minutes_present INTEGER,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as student_id,
    u.full_name as student_name,
    u.email as student_email,
    COALESCE(r.status, 'absent'::attendance_status) as status,
    r.check_in_time,
    r.check_out_time,
    r.minutes_present,
    r.notes
  FROM attendance_sessions s
  JOIN courses c ON s.course_id = c.id
  JOIN enrollments e ON e.course_id = c.id AND e.status = 'active'
  JOIN users u ON e.student_id = u.id
  LEFT JOIN attendance_records r ON r.session_id = s.id AND r.student_id = u.id
  WHERE s.id = p_session_id
    AND s.tenant_id = p_tenant_id
  ORDER BY u.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk record attendance
CREATE OR REPLACE FUNCTION bulk_record_attendance(
  p_session_id UUID,
  p_tenant_id UUID,
  p_recorded_by UUID,
  p_records JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  v_record JSONB;
BEGIN
  FOR v_record IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    INSERT INTO attendance_records (
      tenant_id, session_id, student_id, status, recorded_by
    ) VALUES (
      p_tenant_id,
      p_session_id,
      (v_record->>'student_id')::UUID,
      (v_record->>'status')::attendance_status,
      p_recorded_by
    )
    ON CONFLICT (session_id, student_id)
    DO UPDATE SET
      status = EXCLUDED.status,
      recorded_by = EXCLUDED.recorded_by,
      recorded_at = NOW();
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- QR Code check-in codes table
CREATE TABLE IF NOT EXISTS attendance_check_in_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id)
);

CREATE INDEX IF NOT EXISTS idx_check_in_codes_code ON attendance_check_in_codes(code);
CREATE INDEX IF NOT EXISTS idx_check_in_codes_session ON attendance_check_in_codes(session_id);

-- RLS for check-in codes
ALTER TABLE attendance_check_in_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view check-in codes in their tenant"
  ON attendance_check_in_codes FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Instructors can manage check-in codes"
  ON attendance_check_in_codes FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Function for QR code check-in
CREATE OR REPLACE FUNCTION qr_check_in(
  p_code TEXT,
  p_student_id UUID,
  p_tenant_id UUID
) RETURNS attendance_records AS $$
DECLARE
  v_code_record attendance_check_in_codes;
  v_record attendance_records;
BEGIN
  -- Get the code record
  SELECT * INTO v_code_record
  FROM attendance_check_in_codes
  WHERE code = p_code
    AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid check-in code';
  END IF;

  IF v_code_record.expires_at < NOW() THEN
    RAISE EXCEPTION 'Check-in code has expired';
  END IF;

  -- Create or update attendance record
  INSERT INTO attendance_records (
    tenant_id, session_id, student_id, status, check_in_time, recorded_by
  ) VALUES (
    p_tenant_id, v_code_record.session_id, p_student_id, 'present', NOW(), p_student_id
  )
  ON CONFLICT (session_id, student_id)
  DO UPDATE SET
    status = 'present',
    check_in_time = NOW()
  RETURNING * INTO v_record;

  RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE attendance_sessions IS 'Tracks scheduled class sessions for attendance';
COMMENT ON TABLE attendance_records IS 'Individual student attendance records per session';
COMMENT ON TABLE attendance_check_in_codes IS 'QR code check-in codes for sessions';
COMMENT ON FUNCTION get_course_attendance_summary IS 'Returns attendance summary for all students in a course';
COMMENT ON FUNCTION get_session_attendance IS 'Returns attendance details for a specific session';
COMMENT ON FUNCTION bulk_record_attendance IS 'Records attendance for multiple students at once';
COMMENT ON FUNCTION qr_check_in IS 'Processes QR code check-in for a student';
