-- Course Sharing Library Feature
-- Allows tenants to share courses publicly and clone courses from other tenants

-- Add sharing fields to courses table
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS is_shareable BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS share_description TEXT,
  ADD COLUMN IF NOT EXISTS share_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS share_preview_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS clone_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_course_id UUID,
  ADD COLUMN IF NOT EXISTS original_tenant_id UUID,
  ADD COLUMN IF NOT EXISTS original_tenant_name TEXT,
  ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT false; -- MedicForge official courses

-- Course clones tracking table
CREATE TABLE IF NOT EXISTS course_clones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_course_id UUID NOT NULL REFERENCES courses(id) ON DELETE SET NULL,
  cloned_course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  original_tenant_id UUID NOT NULL,
  cloned_by_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cloned_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  cloned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(original_course_id, cloned_course_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_shareable ON courses(is_shareable) WHERE is_shareable = true;
CREATE INDEX IF NOT EXISTS idx_courses_shared_at ON courses(shared_at) WHERE is_shareable = true;
CREATE INDEX IF NOT EXISTS idx_courses_official ON courses(is_official) WHERE is_official = true;
CREATE INDEX IF NOT EXISTS idx_courses_original ON courses(original_course_id) WHERE original_course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_courses_share_tags ON courses USING GIN(share_tags) WHERE is_shareable = true;

CREATE INDEX IF NOT EXISTS idx_course_clones_original ON course_clones(original_course_id);
CREATE INDEX IF NOT EXISTS idx_course_clones_cloned ON course_clones(cloned_course_id);
CREATE INDEX IF NOT EXISTS idx_course_clones_tenant ON course_clones(cloned_by_tenant_id);

-- RLS for course_clones
ALTER TABLE course_clones ENABLE ROW LEVEL SECURITY;

-- Users can view clones for their tenant
CREATE POLICY "Users can view own tenant clones" ON course_clones
  FOR SELECT
  USING (
    cloned_by_tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Admins can insert clones
CREATE POLICY "Admins can create clones" ON course_clones
  FOR INSERT
  WITH CHECK (
    cloned_by_tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'instructor')
    )
  );

-- Grant access
GRANT SELECT, INSERT ON course_clones TO authenticated;

-- Update RLS on courses to allow viewing shared courses
-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "Shared courses are viewable" ON courses;

CREATE POLICY "Shared courses are viewable" ON courses
  FOR SELECT
  USING (
    -- Own tenant courses
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
    OR
    -- Shared courses (viewable by all authenticated users)
    is_shareable = true
  );

-- Function to get shared courses for the library
CREATE OR REPLACE FUNCTION get_shared_courses(
  p_search TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_certification_level TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'recent', -- recent, popular, alphabetical
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
) RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  course_code TEXT,
  course_type TEXT,
  share_description TEXT,
  share_tags TEXT[],
  clone_count INT,
  is_official BOOLEAN,
  shared_at TIMESTAMPTZ,
  tenant_id UUID,
  tenant_name TEXT,
  module_count BIGINT,
  lesson_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.description,
    c.course_code,
    c.course_type,
    c.share_description,
    c.share_tags,
    c.clone_count,
    c.is_official,
    c.shared_at,
    c.tenant_id,
    t.name as tenant_name,
    (SELECT COUNT(*) FROM modules m WHERE m.course_id = c.id) as module_count,
    (SELECT COUNT(*) FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = c.id) as lesson_count
  FROM courses c
  LEFT JOIN tenants t ON t.id = c.tenant_id
  WHERE c.is_shareable = true
    AND (p_search IS NULL OR (
      c.title ILIKE '%' || p_search || '%'
      OR c.description ILIKE '%' || p_search || '%'
      OR c.share_description ILIKE '%' || p_search || '%'
    ))
    AND (p_tags IS NULL OR c.share_tags && p_tags)
    AND (p_certification_level IS NULL OR c.course_type = p_certification_level)
  ORDER BY
    CASE WHEN p_sort_by = 'recent' THEN c.shared_at END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'popular' THEN c.clone_count END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'alphabetical' THEN c.title END ASC,
    c.is_official DESC,
    c.shared_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION get_shared_courses(TEXT, TEXT[], TEXT, TEXT, INT, INT) TO authenticated;

-- Function to get course preview (modules and lesson titles only, no content)
CREATE OR REPLACE FUNCTION get_course_preview(
  p_course_id UUID
) RETURNS TABLE (
  course_id UUID,
  course_title TEXT,
  course_description TEXT,
  share_description TEXT,
  share_tags TEXT[],
  clone_count INT,
  is_official BOOLEAN,
  tenant_name TEXT,
  module_id UUID,
  module_title TEXT,
  module_description TEXT,
  module_order INT,
  lesson_id UUID,
  lesson_title TEXT,
  lesson_type TEXT,
  lesson_order INT
) AS $$
BEGIN
  -- Check if course is shareable
  IF NOT EXISTS (SELECT 1 FROM courses WHERE id = p_course_id AND is_shareable = true) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id as course_id,
    c.title as course_title,
    c.description as course_description,
    c.share_description,
    c.share_tags,
    c.clone_count,
    c.is_official,
    t.name as tenant_name,
    m.id as module_id,
    m.title as module_title,
    m.description as module_description,
    m.sort_order as module_order,
    l.id as lesson_id,
    l.title as lesson_title,
    l.lesson_type,
    l.sort_order as lesson_order
  FROM courses c
  LEFT JOIN tenants t ON t.id = c.tenant_id
  LEFT JOIN modules m ON m.course_id = c.id
  LEFT JOIN lessons l ON l.module_id = m.id
  WHERE c.id = p_course_id
    AND c.is_shareable = true
  ORDER BY m.sort_order, l.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION get_course_preview(UUID) TO authenticated;

-- Function to clone a course
CREATE OR REPLACE FUNCTION clone_course(
  p_source_course_id UUID,
  p_target_tenant_id UUID,
  p_cloned_by_user_id UUID,
  p_new_title TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_source_course RECORD;
  v_new_course_id UUID;
  v_module_map JSONB := '{}';
  v_source_module RECORD;
  v_new_module_id UUID;
  v_source_lesson RECORD;
  v_new_lesson_id UUID;
BEGIN
  -- Get source course
  SELECT * INTO v_source_course
  FROM courses
  WHERE id = p_source_course_id
    AND is_shareable = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Course not found or not shareable';
  END IF;

  -- Create new course
  INSERT INTO courses (
    tenant_id,
    instructor_id,
    title,
    description,
    course_code,
    course_type,
    original_course_id,
    original_tenant_id,
    original_tenant_name,
    status,
    created_at
  )
  SELECT
    p_target_tenant_id,
    p_cloned_by_user_id,
    COALESCE(p_new_title, v_source_course.title || ' (Copy)'),
    v_source_course.description,
    v_source_course.course_code || '-COPY',
    v_source_course.course_type,
    p_source_course_id,
    v_source_course.tenant_id,
    (SELECT name FROM tenants WHERE id = v_source_course.tenant_id),
    'draft',
    NOW()
  RETURNING id INTO v_new_course_id;

  -- Clone modules
  FOR v_source_module IN
    SELECT * FROM modules WHERE course_id = p_source_course_id ORDER BY sort_order
  LOOP
    INSERT INTO modules (
      course_id,
      title,
      description,
      sort_order,
      is_published
    ) VALUES (
      v_new_course_id,
      v_source_module.title,
      v_source_module.description,
      v_source_module.sort_order,
      false
    ) RETURNING id INTO v_new_module_id;

    -- Store module mapping
    v_module_map := v_module_map || jsonb_build_object(v_source_module.id::text, v_new_module_id);

    -- Clone lessons for this module
    FOR v_source_lesson IN
      SELECT * FROM lessons WHERE module_id = v_source_module.id ORDER BY sort_order
    LOOP
      INSERT INTO lessons (
        module_id,
        title,
        lesson_type,
        content,
        video_url,
        duration_minutes,
        sort_order,
        is_published
      ) VALUES (
        v_new_module_id,
        v_source_lesson.title,
        v_source_lesson.lesson_type,
        v_source_lesson.content,
        v_source_lesson.video_url,
        v_source_lesson.duration_minutes,
        v_source_lesson.sort_order,
        false
      );
    END LOOP;
  END LOOP;

  -- Record the clone
  INSERT INTO course_clones (
    original_course_id,
    cloned_course_id,
    original_tenant_id,
    cloned_by_tenant_id,
    cloned_by_user_id
  ) VALUES (
    p_source_course_id,
    v_new_course_id,
    v_source_course.tenant_id,
    p_target_tenant_id,
    p_cloned_by_user_id
  );

  -- Increment clone count on original
  UPDATE courses
  SET clone_count = clone_count + 1
  WHERE id = p_source_course_id;

  RETURN v_new_course_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION clone_course(UUID, UUID, UUID, TEXT) TO authenticated;

-- Function to share/unshare a course
CREATE OR REPLACE FUNCTION toggle_course_sharing(
  p_course_id UUID,
  p_share BOOLEAN,
  p_share_description TEXT DEFAULT NULL,
  p_share_tags TEXT[] DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Verify ownership
  SELECT tenant_id INTO v_tenant_id
  FROM courses
  WHERE id = p_course_id;

  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND tenant_id = v_tenant_id
    AND role IN ('admin', 'instructor')
  ) THEN
    RAISE EXCEPTION 'Not authorized to modify this course';
  END IF;

  -- Update sharing status
  UPDATE courses
  SET is_shareable = p_share,
      shared_at = CASE WHEN p_share THEN NOW() ELSE NULL END,
      share_description = CASE WHEN p_share THEN COALESCE(p_share_description, description) ELSE NULL END,
      share_tags = CASE WHEN p_share THEN COALESCE(p_share_tags, '{}') ELSE '{}' END
  WHERE id = p_course_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION toggle_course_sharing(UUID, BOOLEAN, TEXT, TEXT[]) TO authenticated;
