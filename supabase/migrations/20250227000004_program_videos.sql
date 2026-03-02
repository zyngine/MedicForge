-- Program Videos Feature
-- Allows uploading/linking videos to programs with progress tracking and virtual attendance

-- Add 'virtual' to attendance_status enum if not exists (may already exist from tardy migration)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'virtual' AND enumtypid = 'attendance_status'::regtype) THEN
    ALTER TYPE attendance_status ADD VALUE 'virtual';
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Program videos table
CREATE TABLE IF NOT EXISTS program_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  video_source TEXT DEFAULT 'upload', -- upload, youtube, vimeo, external
  duration_seconds INT,
  thumbnail_url TEXT,
  session_id UUID REFERENCES attendance_sessions(id) ON DELETE SET NULL, -- links to attendance
  requires_coursework BOOLEAN DEFAULT false,
  coursework_assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  minimum_watch_percentage INT DEFAULT 90,
  grants_virtual_attendance BOOLEAN DEFAULT true,
  prevent_skipping BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video progress tracking table
CREATE TABLE IF NOT EXISTS video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES program_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  watch_time_seconds INT DEFAULT 0,
  last_position_seconds INT DEFAULT 0,
  watch_percentage INT DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  virtual_attendance_granted BOOLEAN DEFAULT false,
  virtual_attendance_granted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_program_videos_program ON program_videos(program_id);
CREATE INDEX IF NOT EXISTS idx_program_videos_tenant ON program_videos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_program_videos_session ON program_videos(session_id);
CREATE INDEX IF NOT EXISTS idx_program_videos_active ON program_videos(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_video_progress_video ON video_progress(video_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_user ON video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_tenant ON video_progress(tenant_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_completed ON video_progress(completed) WHERE completed = true;

-- RLS Policies for program_videos
ALTER TABLE program_videos ENABLE ROW LEVEL SECURITY;

-- Admins and instructors can manage videos
CREATE POLICY "Admins can manage program videos" ON program_videos
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'instructor')
    )
  );

-- Students can view active videos for their programs
CREATE POLICY "Students can view program videos" ON program_videos
  FOR SELECT
  USING (
    is_active = true
    AND program_id IN (
      SELECT cohort_id FROM cohort_members
      WHERE student_id = auth.uid()
    )
  );

-- RLS Policies for video_progress
ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;

-- Users can manage their own progress
CREATE POLICY "Users can manage own video progress" ON video_progress
  FOR ALL
  USING (user_id = auth.uid());

-- Admins and instructors can view all progress in their tenant
CREATE POLICY "Admins can view all video progress" ON video_progress
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'instructor')
    )
  );

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON program_videos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON video_progress TO authenticated;

-- Function to update video progress and potentially grant virtual attendance
CREATE OR REPLACE FUNCTION update_video_progress(
  p_video_id UUID,
  p_user_id UUID,
  p_tenant_id UUID,
  p_watch_time_seconds INT,
  p_last_position_seconds INT,
  p_duration_seconds INT
) RETURNS JSONB AS $$
DECLARE
  v_video RECORD;
  v_progress RECORD;
  v_watch_percentage INT;
  v_completed BOOLEAN;
  v_grant_attendance BOOLEAN := false;
  v_session_id UUID;
  v_attendance_record_id UUID;
BEGIN
  -- Get video details
  SELECT * INTO v_video FROM program_videos WHERE id = p_video_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Video not found');
  END IF;

  -- Calculate watch percentage
  IF p_duration_seconds > 0 THEN
    v_watch_percentage := LEAST(100, (p_watch_time_seconds * 100) / p_duration_seconds);
  ELSE
    v_watch_percentage := 0;
  END IF;

  -- Check if completed
  v_completed := v_watch_percentage >= v_video.minimum_watch_percentage;

  -- Upsert progress record
  INSERT INTO video_progress (
    video_id, user_id, tenant_id, watch_time_seconds, last_position_seconds,
    watch_percentage, completed, completed_at, updated_at
  ) VALUES (
    p_video_id, p_user_id, p_tenant_id, p_watch_time_seconds, p_last_position_seconds,
    v_watch_percentage, v_completed, CASE WHEN v_completed THEN NOW() ELSE NULL END, NOW()
  )
  ON CONFLICT (video_id, user_id) DO UPDATE SET
    watch_time_seconds = GREATEST(video_progress.watch_time_seconds, EXCLUDED.watch_time_seconds),
    last_position_seconds = EXCLUDED.last_position_seconds,
    watch_percentage = GREATEST(video_progress.watch_percentage, EXCLUDED.watch_percentage),
    completed = video_progress.completed OR EXCLUDED.completed,
    completed_at = COALESCE(video_progress.completed_at, EXCLUDED.completed_at),
    updated_at = NOW()
  RETURNING * INTO v_progress;

  -- Check if we should grant virtual attendance
  IF v_completed
     AND v_video.grants_virtual_attendance
     AND v_video.session_id IS NOT NULL
     AND NOT v_progress.virtual_attendance_granted
  THEN
    -- Check if coursework is required and completed
    IF v_video.requires_coursework AND v_video.coursework_assignment_id IS NOT NULL THEN
      -- Check if assignment is submitted
      IF NOT EXISTS (
        SELECT 1 FROM submissions
        WHERE assignment_id = v_video.coursework_assignment_id
        AND student_id = p_user_id
        AND status IN ('submitted', 'graded')
      ) THEN
        -- Coursework not complete, don't grant attendance
        RETURN jsonb_build_object(
          'success', true,
          'watch_percentage', v_watch_percentage,
          'completed', v_completed,
          'virtual_attendance_granted', false,
          'message', 'Complete required coursework to receive virtual attendance'
        );
      END IF;
    END IF;

    -- Check if student was absent for this session
    SELECT id INTO v_attendance_record_id
    FROM attendance_records
    WHERE session_id = v_video.session_id
    AND student_id = p_user_id
    AND status = 'absent';

    IF FOUND THEN
      -- Update attendance to virtual
      UPDATE attendance_records
      SET status = 'virtual', updated_at = NOW()
      WHERE id = v_attendance_record_id;

      v_grant_attendance := true;
    ELSE
      -- No absent record, check if they have any record
      IF NOT EXISTS (
        SELECT 1 FROM attendance_records
        WHERE session_id = v_video.session_id
        AND student_id = p_user_id
      ) THEN
        -- Create virtual attendance record
        INSERT INTO attendance_records (
          session_id, student_id, tenant_id, status, recorded_at
        ) VALUES (
          v_video.session_id, p_user_id, p_tenant_id, 'virtual', NOW()
        );
        v_grant_attendance := true;
      END IF;
    END IF;

    -- Mark attendance as granted
    IF v_grant_attendance THEN
      UPDATE video_progress
      SET virtual_attendance_granted = true,
          virtual_attendance_granted_at = NOW()
      WHERE id = v_progress.id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'watch_percentage', v_watch_percentage,
    'completed', v_completed,
    'virtual_attendance_granted', v_grant_attendance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION update_video_progress(UUID, UUID, UUID, INT, INT, INT) TO authenticated;

-- Function to get student videos with progress
CREATE OR REPLACE FUNCTION get_student_videos(
  p_student_id UUID,
  p_tenant_id UUID
) RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  video_url TEXT,
  video_source TEXT,
  duration_seconds INT,
  thumbnail_url TEXT,
  session_id UUID,
  grants_virtual_attendance BOOLEAN,
  minimum_watch_percentage INT,
  requires_coursework BOOLEAN,
  program_id UUID,
  program_name TEXT,
  watch_percentage INT,
  completed BOOLEAN,
  completed_at TIMESTAMPTZ,
  virtual_attendance_granted BOOLEAN,
  last_position_seconds INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.title,
    v.description,
    v.video_url,
    v.video_source,
    v.duration_seconds,
    v.thumbnail_url,
    v.session_id,
    v.grants_virtual_attendance,
    v.minimum_watch_percentage,
    v.requires_coursework,
    v.program_id,
    c.name as program_name,
    COALESCE(vp.watch_percentage, 0) as watch_percentage,
    COALESCE(vp.completed, false) as completed,
    vp.completed_at,
    COALESCE(vp.virtual_attendance_granted, false) as virtual_attendance_granted,
    COALESCE(vp.last_position_seconds, 0) as last_position_seconds
  FROM program_videos v
  LEFT JOIN cohorts c ON c.id = v.program_id
  LEFT JOIN video_progress vp ON vp.video_id = v.id AND vp.user_id = p_student_id
  WHERE v.tenant_id = p_tenant_id
    AND v.is_active = true
    AND v.program_id IN (
      SELECT cohort_id FROM cohort_members WHERE student_id = p_student_id
    )
  ORDER BY v.sort_order, v.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION get_student_videos(UUID, UUID) TO authenticated;

-- Function to get video watch statistics for instructors
CREATE OR REPLACE FUNCTION get_video_statistics(
  p_video_id UUID,
  p_tenant_id UUID
) RETURNS TABLE (
  total_viewers INT,
  completed_count INT,
  average_watch_percentage NUMERIC,
  virtual_attendance_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT vp.user_id)::INT as total_viewers,
    COUNT(DISTINCT CASE WHEN vp.completed THEN vp.user_id END)::INT as completed_count,
    COALESCE(AVG(vp.watch_percentage), 0)::NUMERIC as average_watch_percentage,
    COUNT(DISTINCT CASE WHEN vp.virtual_attendance_granted THEN vp.user_id END)::INT as virtual_attendance_count
  FROM video_progress vp
  WHERE vp.video_id = p_video_id
    AND vp.tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION get_video_statistics(UUID, UUID) TO authenticated;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_program_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS program_videos_updated_at ON program_videos;
CREATE TRIGGER program_videos_updated_at
  BEFORE UPDATE ON program_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_program_videos_updated_at();

DROP TRIGGER IF EXISTS video_progress_updated_at ON video_progress;
CREATE TRIGGER video_progress_updated_at
  BEFORE UPDATE ON video_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_program_videos_updated_at();
