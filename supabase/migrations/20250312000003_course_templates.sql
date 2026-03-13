-- ============================================================
-- Course Templates & Blueprint Courses
-- ============================================================

CREATE TABLE IF NOT EXISTS course_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  course_type   text,
  template_data jsonb,
  is_shared     boolean NOT NULL DEFAULT false,
  created_by    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE course_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instructors and admins can view templates in their tenant or shared"
  ON course_templates FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = (SELECT auth.uid()))
    OR is_shared = true
  );

CREATE POLICY "Instructors and admins can create templates"
  ON course_templates FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = (SELECT auth.uid()))
    AND created_by = (SELECT auth.uid())
  );

CREATE POLICY "Owners and admins can update templates"
  ON course_templates FOR UPDATE
  USING (
    created_by = (SELECT auth.uid())
    OR (SELECT role FROM users WHERE id = (SELECT auth.uid())) = 'admin'
  );

CREATE POLICY "Owners and admins can delete templates"
  ON course_templates FOR DELETE
  USING (
    created_by = (SELECT auth.uid())
    OR (SELECT role FROM users WHERE id = (SELECT auth.uid())) = 'admin'
  );

CREATE INDEX IF NOT EXISTS idx_course_templates_tenant_id ON course_templates (tenant_id);

-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS blueprint_courses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id     uuid NOT NULL REFERENCES course_templates(id) ON DELETE CASCADE,
  course_id       uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  sync_enabled    boolean NOT NULL DEFAULT true,
  sync_settings   jsonb,
  last_synced_at  timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, course_id)
);

ALTER TABLE blueprint_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view blueprints in their tenant"
  ON blueprint_courses FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = (SELECT auth.uid())));

CREATE POLICY "Admins and instructors can manage blueprints"
  ON blueprint_courses FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = (SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS idx_blueprint_courses_template_id ON blueprint_courses (template_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_courses_course_id ON blueprint_courses (course_id);

-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS blueprint_sync_history (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id     uuid NOT NULL REFERENCES blueprint_courses(id) ON DELETE CASCADE,
  sync_type        text NOT NULL CHECK (sync_type IN ('full', 'partial', 'manual')),
  changes_applied  jsonb,
  synced_by        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  synced_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE blueprint_sync_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sync history in their tenant"
  ON blueprint_sync_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blueprint_courses bc
      JOIN users u ON u.id = (SELECT auth.uid())
      WHERE bc.id = blueprint_sync_history.blueprint_id
        AND bc.tenant_id = u.tenant_id
    )
  );

CREATE POLICY "Users can insert sync history"
  ON blueprint_sync_history FOR INSERT
  WITH CHECK (synced_by = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_blueprint_sync_history_blueprint_id ON blueprint_sync_history (blueprint_id);
