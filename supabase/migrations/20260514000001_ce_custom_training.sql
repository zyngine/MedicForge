-- ============================================
-- CE CUSTOM TRAINING (agency-uploaded materials)
-- ============================================

-- Materials
CREATE TABLE IF NOT EXISTS ce_custom_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES ce_agencies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  content_type text NOT NULL CHECK (content_type IN ('pdf','video_upload','video_url','scorm')),
  content_url text NOT NULL,
  content_metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES ce_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ce_custom_materials_agency ON ce_custom_materials(agency_id);
ALTER TABLE ce_custom_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CE admins manage all custom materials" ON ce_custom_materials;
CREATE POLICY "CE admins manage all custom materials"
  ON ce_custom_materials FOR ALL
  USING (get_ce_user_role() = 'admin');

DROP POLICY IF EXISTS "Agency admins manage own custom materials" ON ce_custom_materials;
CREATE POLICY "Agency admins manage own custom materials"
  ON ce_custom_materials FOR ALL
  USING (
    get_ce_user_role() = 'agency_admin'
    AND agency_id = get_ce_user_agency_id()
  );

DROP POLICY IF EXISTS "Agency users view assigned custom materials" ON ce_custom_materials;
CREATE POLICY "Agency users view assigned custom materials"
  ON ce_custom_materials FOR SELECT
  USING (
    agency_id = get_ce_user_agency_id()
    AND EXISTS (
      SELECT 1 FROM ce_custom_assignments a
      WHERE a.material_id = ce_custom_materials.id
        AND (
          (a.target_type = 'all_agency')
          OR (a.target_type = 'user' AND a.target_value = (SELECT auth.uid())::text)
          OR (a.target_type = 'certification' AND a.target_value = (SELECT certification_level FROM ce_users WHERE id = (SELECT auth.uid())))
        )
    )
  );

-- Quizzes
CREATE TABLE IF NOT EXISTS ce_custom_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL UNIQUE REFERENCES ce_custom_materials(id) ON DELETE CASCADE,
  pass_threshold int NOT NULL DEFAULT 80 CHECK (pass_threshold BETWEEN 0 AND 100),
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ce_custom_quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CE admins manage all custom quizzes" ON ce_custom_quizzes;
CREATE POLICY "CE admins manage all custom quizzes"
  ON ce_custom_quizzes FOR ALL
  USING (get_ce_user_role() = 'admin');

DROP POLICY IF EXISTS "Agency admins manage own quizzes" ON ce_custom_quizzes;
CREATE POLICY "Agency admins manage own quizzes"
  ON ce_custom_quizzes FOR ALL
  USING (
    get_ce_user_role() = 'agency_admin'
    AND EXISTS (
      SELECT 1 FROM ce_custom_materials m
      WHERE m.id = ce_custom_quizzes.material_id
        AND m.agency_id = get_ce_user_agency_id()
    )
  );

DROP POLICY IF EXISTS "Agency users view quizzes for assigned materials" ON ce_custom_quizzes;
CREATE POLICY "Agency users view quizzes for assigned materials"
  ON ce_custom_quizzes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ce_custom_materials m
      WHERE m.id = ce_custom_quizzes.material_id
        AND m.agency_id = get_ce_user_agency_id()
    )
  );

-- Assignments
CREATE TABLE IF NOT EXISTS ce_custom_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES ce_custom_materials(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('user','certification','all_agency')),
  target_value text,
  assigned_by uuid REFERENCES ce_users(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  due_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_ce_custom_assignments_material ON ce_custom_assignments(material_id);
CREATE INDEX IF NOT EXISTS idx_ce_custom_assignments_target ON ce_custom_assignments(target_type, target_value);
ALTER TABLE ce_custom_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CE admins manage all assignments" ON ce_custom_assignments;
CREATE POLICY "CE admins manage all assignments"
  ON ce_custom_assignments FOR ALL
  USING (get_ce_user_role() = 'admin');

DROP POLICY IF EXISTS "Agency admins manage own agency assignments" ON ce_custom_assignments;
CREATE POLICY "Agency admins manage own agency assignments"
  ON ce_custom_assignments FOR ALL
  USING (
    get_ce_user_role() = 'agency_admin'
    AND EXISTS (
      SELECT 1 FROM ce_custom_materials m
      WHERE m.id = ce_custom_assignments.material_id
        AND m.agency_id = get_ce_user_agency_id()
    )
  );

DROP POLICY IF EXISTS "Users view own assignments" ON ce_custom_assignments;
CREATE POLICY "Users view own assignments"
  ON ce_custom_assignments FOR SELECT
  USING (
    (target_type = 'user' AND target_value = (SELECT auth.uid())::text)
    OR (target_type = 'certification' AND target_value = (SELECT certification_level FROM ce_users WHERE id = (SELECT auth.uid())))
    OR (target_type = 'all_agency' AND EXISTS (
      SELECT 1 FROM ce_custom_materials m
      WHERE m.id = ce_custom_assignments.material_id
        AND m.agency_id = get_ce_user_agency_id()
    ))
  );

-- Completions
CREATE TABLE IF NOT EXISTS ce_custom_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES ce_custom_materials(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES ce_users(id) ON DELETE CASCADE,
  viewed_at timestamptz,
  quiz_score int CHECK (quiz_score BETWEEN 0 AND 100),
  quiz_passed_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (material_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_ce_custom_completions_user ON ce_custom_completions(user_id);
ALTER TABLE ce_custom_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CE admins view all completions" ON ce_custom_completions;
CREATE POLICY "CE admins view all completions"
  ON ce_custom_completions FOR ALL
  USING (get_ce_user_role() = 'admin');

DROP POLICY IF EXISTS "Agency admins view own agency completions" ON ce_custom_completions;
CREATE POLICY "Agency admins view own agency completions"
  ON ce_custom_completions FOR SELECT
  USING (
    get_ce_user_role() = 'agency_admin'
    AND EXISTS (
      SELECT 1 FROM ce_custom_materials m
      WHERE m.id = ce_custom_completions.material_id
        AND m.agency_id = get_ce_user_agency_id()
    )
  );

DROP POLICY IF EXISTS "Users read own completions" ON ce_custom_completions;
CREATE POLICY "Users read own completions"
  ON ce_custom_completions FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users insert own completions" ON ce_custom_completions;
CREATE POLICY "Users insert own completions"
  ON ce_custom_completions FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users update own completions" ON ce_custom_completions;
CREATE POLICY "Users update own completions"
  ON ce_custom_completions FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ce-custom-materials', 'ce-custom-materials', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Agency members read own custom materials storage" ON storage.objects;
CREATE POLICY "Agency members read own custom materials storage"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ce-custom-materials'
    AND (storage.foldername(name))[1] = get_ce_user_agency_id()::text
  );

DROP POLICY IF EXISTS "Agency admins write own custom materials storage" ON storage.objects;
CREATE POLICY "Agency admins write own custom materials storage"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ce-custom-materials'
    AND (storage.foldername(name))[1] = get_ce_user_agency_id()::text
    AND get_ce_user_role() = 'agency_admin'
  );

DROP POLICY IF EXISTS "Agency admins delete own custom materials storage" ON storage.objects;
CREATE POLICY "Agency admins delete own custom materials storage"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'ce-custom-materials'
    AND (storage.foldername(name))[1] = get_ce_user_agency_id()::text
    AND get_ce_user_role() = 'agency_admin'
  );
