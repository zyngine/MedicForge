-- Pre-Scheduled Attendance Feature
-- Allows setting up recurring class schedules and bulk generating attendance sessions

-- Program schedules table (recurring class times)
CREATE TABLE IF NOT EXISTS program_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Class',
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  session_type TEXT DEFAULT 'lecture', -- lecture, lab, clinical, skills, exam
  location TEXT,
  instructor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add schedule reference and generation flag to attendance_sessions
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES program_schedules(id) ON DELETE SET NULL;
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS is_generated BOOLEAN DEFAULT false;
ALTER TABLE attendance_sessions ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES cohorts(id) ON DELETE CASCADE;

-- Excluded dates table (holidays, breaks, etc.)
CREATE TABLE IF NOT EXISTS program_excluded_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  excluded_date DATE NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(program_id, excluded_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_program_schedules_program ON program_schedules(program_id);
CREATE INDEX IF NOT EXISTS idx_program_schedules_tenant ON program_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_program_schedules_day ON program_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_program_schedules_active ON program_schedules(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_schedule ON attendance_sessions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_program ON attendance_sessions(program_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_generated ON attendance_sessions(is_generated) WHERE is_generated = true;

CREATE INDEX IF NOT EXISTS idx_program_excluded_dates_program ON program_excluded_dates(program_id);
CREATE INDEX IF NOT EXISTS idx_program_excluded_dates_date ON program_excluded_dates(excluded_date);

-- RLS Policies for program_schedules
ALTER TABLE program_schedules ENABLE ROW LEVEL SECURITY;

-- Admins and instructors can manage schedules
CREATE POLICY "Admins can manage program schedules" ON program_schedules
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'instructor')
    )
  );

-- Students can view schedules for their programs
CREATE POLICY "Students can view program schedules" ON program_schedules
  FOR SELECT
  USING (
    is_active = true
    AND program_id IN (
      SELECT cohort_id FROM cohort_members
      WHERE student_id = auth.uid()
    )
  );

-- RLS Policies for program_excluded_dates
ALTER TABLE program_excluded_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage excluded dates" ON program_excluded_dates
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'instructor')
    )
  );

CREATE POLICY "Users can view excluded dates" ON program_excluded_dates
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON program_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON program_excluded_dates TO authenticated;

-- Function to generate attendance sessions for a date range
CREATE OR REPLACE FUNCTION generate_attendance_sessions(
  p_program_id UUID,
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_created_by UUID
) RETURNS INT AS $$
DECLARE
  v_schedule RECORD;
  v_current_date DATE;
  v_day_of_week INT;
  v_sessions_created INT := 0;
  v_excluded_dates DATE[];
BEGIN
  -- Get list of excluded dates
  SELECT ARRAY_AGG(excluded_date) INTO v_excluded_dates
  FROM program_excluded_dates
  WHERE program_id = p_program_id
    AND excluded_date BETWEEN p_start_date AND p_end_date;

  -- Loop through each active schedule for this program
  FOR v_schedule IN
    SELECT * FROM program_schedules
    WHERE program_id = p_program_id
      AND tenant_id = p_tenant_id
      AND is_active = true
  LOOP
    -- Loop through each date in the range
    v_current_date := p_start_date;
    WHILE v_current_date <= p_end_date LOOP
      -- Get day of week (0=Sunday in PostgreSQL EXTRACT)
      v_day_of_week := EXTRACT(DOW FROM v_current_date)::INT;

      -- Check if this day matches the schedule and is not excluded
      IF v_day_of_week = v_schedule.day_of_week
         AND (v_excluded_dates IS NULL OR NOT v_current_date = ANY(v_excluded_dates))
      THEN
        -- Check if session already exists for this date/schedule
        IF NOT EXISTS (
          SELECT 1 FROM attendance_sessions
          WHERE schedule_id = v_schedule.id
            AND scheduled_date = v_current_date
        ) THEN
          -- Create the session
          INSERT INTO attendance_sessions (
            tenant_id,
            program_id,
            course_id,
            schedule_id,
            title,
            session_type,
            location,
            scheduled_date,
            start_time,
            end_time,
            is_generated,
            session_status,
            tardy_window_minutes,
            allow_late_checkin,
            created_by
          ) VALUES (
            p_tenant_id,
            p_program_id,
            NULL, -- No specific course
            v_schedule.id,
            v_schedule.title,
            v_schedule.session_type,
            v_schedule.location,
            v_current_date,
            v_schedule.start_time,
            v_schedule.end_time,
            true,
            'scheduled',
            15, -- Default tardy window
            true, -- Allow late check-in by default
            p_created_by
          );
          v_sessions_created := v_sessions_created + 1;
        END IF;
      END IF;

      v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
  END LOOP;

  RETURN v_sessions_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION generate_attendance_sessions(UUID, UUID, DATE, DATE, UUID) TO authenticated;

-- Function to get today's scheduled sessions for an instructor
CREATE OR REPLACE FUNCTION get_todays_sessions(
  p_tenant_id UUID,
  p_instructor_id UUID DEFAULT NULL
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
    AND s.scheduled_date = CURRENT_DATE
    AND (p_instructor_id IS NULL OR s.created_by = p_instructor_id OR c.id IN (
      -- Include sessions for programs where instructor teaches courses
      SELECT DISTINCT co.id FROM cohorts co
      JOIN cohort_courses cc ON cc.cohort_id = co.id
      JOIN courses crs ON crs.id = cc.course_id
      WHERE crs.instructor_id = p_instructor_id
    ))
  ORDER BY s.start_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION get_todays_sessions(UUID, UUID) TO authenticated;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_program_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS program_schedules_updated_at ON program_schedules;
CREATE TRIGGER program_schedules_updated_at
  BEFORE UPDATE ON program_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_program_schedules_updated_at();
