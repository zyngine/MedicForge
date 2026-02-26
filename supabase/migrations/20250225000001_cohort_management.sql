-- Cohort Management System
-- Allows organizing students into cohorts (e.g., "Fall 2026 EMT Class")

-- Create cohorts table
CREATE TABLE IF NOT EXISTS cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  course_type TEXT, -- EMR, EMT, AEMT, Paramedic, Custom
  start_date DATE,
  expected_graduation DATE,
  is_active BOOLEAN DEFAULT true,
  max_students INTEGER,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Create cohort_members junction table
CREATE TABLE IF NOT EXISTS cohort_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active', -- active, graduated, withdrawn, transferred
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(cohort_id, student_id)
);

-- Create cohort_courses junction table (courses a cohort is enrolled in)
CREATE TABLE IF NOT EXISTS cohort_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  enrolled_by UUID REFERENCES users(id),
  UNIQUE(cohort_id, course_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_cohorts_tenant ON cohorts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cohorts_active ON cohorts(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_cohort_members_cohort ON cohort_members(cohort_id);
CREATE INDEX IF NOT EXISTS idx_cohort_members_student ON cohort_members(student_id);
CREATE INDEX IF NOT EXISTS idx_cohort_courses_cohort ON cohort_courses(cohort_id);
CREATE INDEX IF NOT EXISTS idx_cohort_courses_course ON cohort_courses(course_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_cohorts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cohorts_updated_at ON cohorts;
CREATE TRIGGER cohorts_updated_at
  BEFORE UPDATE ON cohorts
  FOR EACH ROW
  EXECUTE FUNCTION update_cohorts_updated_at();

-- RLS Policies
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohort_courses ENABLE ROW LEVEL SECURITY;

-- Cohorts policies
CREATE POLICY "Users can view cohorts in their tenant" ON cohorts
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins and instructors can manage cohorts" ON cohorts
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Cohort members policies
CREATE POLICY "Users can view cohort members in their tenant" ON cohort_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cohorts c
      WHERE c.id = cohort_members.cohort_id
      AND c.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins and instructors can manage cohort members" ON cohort_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cohorts c
      WHERE c.id = cohort_members.cohort_id
      AND c.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
      AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    )
  );

-- Cohort courses policies
CREATE POLICY "Users can view cohort courses in their tenant" ON cohort_courses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cohorts c
      WHERE c.id = cohort_courses.cohort_id
      AND c.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins and instructors can manage cohort courses" ON cohort_courses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM cohorts c
      WHERE c.id = cohort_courses.cohort_id
      AND c.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
      AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    )
  );
