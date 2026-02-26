-- Fix missing qr_check_in function for student attendance check-in

-- Drop and recreate to ensure it exists with correct signature
DROP FUNCTION IF EXISTS qr_check_in(TEXT, UUID, UUID);

-- Function for QR/code check-in
CREATE OR REPLACE FUNCTION qr_check_in(
  p_code TEXT,
  p_student_id UUID,
  p_tenant_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_code_record RECORD;
  v_record RECORD;
  v_session_title TEXT;
BEGIN
  -- Get the code record
  SELECT c.*, s.title as session_title
  INTO v_code_record
  FROM attendance_check_in_codes c
  JOIN attendance_sessions s ON s.id = c.session_id
  WHERE c.code = p_code
    AND c.tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid check-in code';
  END IF;

  IF v_code_record.expires_at < NOW() THEN
    RAISE EXCEPTION 'Check-in code has expired';
  END IF;

  -- Create or update attendance record
  INSERT INTO attendance_records (
    tenant_id, session_id, student_id, status, check_in_time, recorded_by, recorded_at
  ) VALUES (
    p_tenant_id, v_code_record.session_id, p_student_id, 'present', NOW(), p_student_id, NOW()
  )
  ON CONFLICT (session_id, student_id)
  DO UPDATE SET
    status = 'present',
    check_in_time = NOW(),
    recorded_at = NOW()
  RETURNING * INTO v_record;

  -- Return success with session info
  RETURN jsonb_build_object(
    'success', true,
    'record_id', v_record.id,
    'session_title', v_code_record.session_title,
    'check_in_time', v_record.check_in_time
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION qr_check_in(TEXT, UUID, UUID) TO authenticated;

-- Also ensure attendance_records allows students to insert their own check-in
DROP POLICY IF EXISTS "Students can check in themselves" ON attendance_records;
CREATE POLICY "Students can check in themselves" ON attendance_records
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- Allow students to update their own check-in (for the ON CONFLICT update)
DROP POLICY IF EXISTS "Students can update their own check-in" ON attendance_records;
CREATE POLICY "Students can update their own check-in" ON attendance_records
  FOR UPDATE
  USING (
    student_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );
