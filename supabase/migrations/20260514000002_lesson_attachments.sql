-- ============================================
-- LESSON ATTACHMENTS (LMS instructor uploads)
-- ============================================

CREATE TABLE IF NOT EXISTS lesson_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('pdf','powerpoint','word','excel','video_upload','video_url','other')),
  file_url text NOT NULL,
  mime_type text,
  file_size bigint,
  bunny_video_id text,
  storage_path text,
  order_index int DEFAULT 0,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lesson_attachments_lesson ON lesson_attachments(lesson_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lesson_attachments_tenant ON lesson_attachments(tenant_id);

ALTER TABLE lesson_attachments ENABLE ROW LEVEL SECURITY;

-- Anyone in the tenant can read attachments for lessons they can see.
DROP POLICY IF EXISTS "Tenant members read lesson attachments" ON lesson_attachments;
CREATE POLICY "Tenant members read lesson attachments"
  ON lesson_attachments FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = (SELECT auth.uid()))
  );

-- Only instructors/admins of the tenant can write.
DROP POLICY IF EXISTS "Instructors write lesson attachments" ON lesson_attachments;
CREATE POLICY "Instructors write lesson attachments"
  ON lesson_attachments FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = (SELECT auth.uid()))
    AND (SELECT role FROM users WHERE id = (SELECT auth.uid()))::text IN ('admin','instructor')
  );

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-materials', 'lesson-materials', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Tenant members read lesson materials" ON storage.objects;
CREATE POLICY "Tenant members read lesson materials"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'lesson-materials'
    AND (storage.foldername(name))[1] = (
      SELECT tenant_id::text FROM users WHERE id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Instructors write lesson materials" ON storage.objects;
CREATE POLICY "Instructors write lesson materials"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lesson-materials'
    AND (storage.foldername(name))[1] = (
      SELECT tenant_id::text FROM users WHERE id = (SELECT auth.uid())
    )
    AND (SELECT role FROM users WHERE id = (SELECT auth.uid()))::text IN ('admin','instructor')
  );

DROP POLICY IF EXISTS "Instructors delete lesson materials" ON storage.objects;
CREATE POLICY "Instructors delete lesson materials"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'lesson-materials'
    AND (storage.foldername(name))[1] = (
      SELECT tenant_id::text FROM users WHERE id = (SELECT auth.uid())
    )
    AND (SELECT role FROM users WHERE id = (SELECT auth.uid()))::text IN ('admin','instructor')
  );
