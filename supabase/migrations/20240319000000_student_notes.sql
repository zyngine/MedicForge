-- Student Note-Taking System
-- Migration: 20240319000000_student_notes.sql

-- Notes table
CREATE TABLE IF NOT EXISTS student_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  color TEXT DEFAULT 'yellow',
  is_pinned BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note highlights/annotations (for in-lesson highlighting)
CREATE TABLE IF NOT EXISTS note_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES student_notes(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  highlighted_text TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  color TEXT DEFAULT 'yellow',
  annotation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note attachments
CREATE TABLE IF NOT EXISTS note_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES student_notes(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notes_student ON student_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_notes_course ON student_notes(course_id);
CREATE INDEX IF NOT EXISTS idx_notes_lesson ON student_notes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_notes_module ON student_notes(module_id);
CREATE INDEX IF NOT EXISTS idx_highlights_lesson ON note_highlights(lesson_id);

-- Enable RLS
ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notes
CREATE POLICY "Students can manage their own notes"
  ON student_notes FOR ALL
  USING (student_id = auth.uid());

CREATE POLICY "Instructors can view student notes in their courses"
  ON student_notes FOR SELECT
  USING (
    NOT is_private
    AND EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = student_notes.course_id
      AND c.instructor_id = auth.uid()
    )
  );

-- RLS Policies for highlights
CREATE POLICY "Students can manage their highlights"
  ON note_highlights FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM student_notes n
      WHERE n.id = note_highlights.note_id
      AND n.student_id = auth.uid()
    )
  );

-- RLS Policies for attachments
CREATE POLICY "Students can manage their attachments"
  ON note_attachments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM student_notes n
      WHERE n.id = note_attachments.note_id
      AND n.student_id = auth.uid()
    )
  );

-- Function to search notes
CREATE OR REPLACE FUNCTION search_student_notes(
  p_student_id UUID,
  p_query TEXT,
  p_course_id UUID DEFAULT NULL
) RETURNS SETOF student_notes AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM student_notes
  WHERE student_id = p_student_id
    AND (p_course_id IS NULL OR course_id = p_course_id)
    AND (
      title ILIKE '%' || p_query || '%'
      OR content ILIKE '%' || p_query || '%'
      OR p_query = ANY(tags)
    )
  ORDER BY
    is_pinned DESC,
    updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get notes summary by course
CREATE OR REPLACE FUNCTION get_notes_summary(p_student_id UUID)
RETURNS TABLE (
  course_id UUID,
  course_title TEXT,
  notes_count BIGINT,
  last_note_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as course_id,
    c.title as course_title,
    COUNT(n.id) as notes_count,
    MAX(n.updated_at) as last_note_at
  FROM courses c
  LEFT JOIN student_notes n ON n.course_id = c.id AND n.student_id = p_student_id
  JOIN enrollments e ON e.course_id = c.id AND e.student_id = p_student_id
  WHERE e.status = 'active'
  GROUP BY c.id, c.title
  ORDER BY last_note_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE student_notes IS 'Student notes for courses and lessons';
COMMENT ON TABLE note_highlights IS 'Text highlights and annotations within lessons';
COMMENT ON TABLE note_attachments IS 'File attachments for notes';
COMMENT ON FUNCTION search_student_notes IS 'Full-text search for student notes';
COMMENT ON FUNCTION get_notes_summary IS 'Summary of notes by course for a student';
