-- Program-Specific Links Feature
-- This migration adds tables for managing program and tenant-wide links/resources

-- Program-specific links (per cohort/program)
CREATE TABLE IF NOT EXISTS program_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'other', -- certification, clinical, uniforms, resources, other
  icon TEXT, -- lucide icon name
  sort_order INT DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant-wide links (visible to all students in the tenant)
CREATE TABLE IF NOT EXISTS tenant_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'other', -- certification, clinical, uniforms, resources, other
  icon TEXT, -- lucide icon name
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_program_links_program_id ON program_links(program_id);
CREATE INDEX IF NOT EXISTS idx_program_links_tenant_id ON program_links(tenant_id);
CREATE INDEX IF NOT EXISTS idx_program_links_category ON program_links(category);
CREATE INDEX IF NOT EXISTS idx_program_links_active ON program_links(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tenant_links_tenant_id ON tenant_links(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_links_category ON tenant_links(category);
CREATE INDEX IF NOT EXISTS idx_tenant_links_active ON tenant_links(is_active) WHERE is_active = true;

-- RLS Policies for program_links
ALTER TABLE program_links ENABLE ROW LEVEL SECURITY;

-- Admin/Instructors can manage program links
CREATE POLICY "Admin can manage program links" ON program_links
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'instructor')
    )
  );

-- Students can view active program links for their enrolled programs
CREATE POLICY "Students can view active program links" ON program_links
  FOR SELECT
  USING (
    is_active = true
    AND program_id IN (
      SELECT cohort_id FROM cohort_members
      WHERE student_id = auth.uid()
    )
  );

-- RLS Policies for tenant_links
ALTER TABLE tenant_links ENABLE ROW LEVEL SECURITY;

-- Admin can manage tenant links
CREATE POLICY "Admin can manage tenant links" ON tenant_links
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- All authenticated users in tenant can view active tenant links
CREATE POLICY "Users can view active tenant links" ON tenant_links
  FOR SELECT
  USING (
    is_active = true
    AND tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON program_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_links TO authenticated;

-- Function to get all links for a student (both program and tenant links)
CREATE OR REPLACE FUNCTION get_student_links(p_student_id UUID, p_tenant_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  url TEXT,
  description TEXT,
  category TEXT,
  icon TEXT,
  sort_order INT,
  is_required BOOLEAN,
  link_type TEXT, -- 'program' or 'tenant'
  program_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Program links for enrolled programs
  SELECT
    pl.id,
    pl.title,
    pl.url,
    pl.description,
    pl.category,
    pl.icon,
    pl.sort_order,
    pl.is_required,
    'program'::TEXT as link_type,
    c.name as program_name
  FROM program_links pl
  JOIN cohorts c ON c.id = pl.program_id
  JOIN cohort_members cm ON cm.cohort_id = pl.program_id
  WHERE cm.student_id = p_student_id
    AND pl.tenant_id = p_tenant_id
    AND pl.is_active = true

  UNION ALL

  -- Tenant-wide links
  SELECT
    tl.id,
    tl.title,
    tl.url,
    tl.description,
    tl.category,
    tl.icon,
    tl.sort_order,
    false as is_required,
    'tenant'::TEXT as link_type,
    NULL::TEXT as program_name
  FROM tenant_links tl
  WHERE tl.tenant_id = p_tenant_id
    AND tl.is_active = true

  ORDER BY sort_order, title;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION get_student_links(UUID, UUID) TO authenticated;
