-- Accreditation Document Management
-- Migration: 20240314000000_accreditation_documents.sql

-- Document categories
CREATE TYPE accreditation_doc_category AS ENUM (
  'program_information',
  'personnel',
  'curriculum',
  'clinical_affiliations',
  'equipment',
  'policies',
  'assessment',
  'outcomes',
  'meeting_minutes',
  'other'
);

-- Document status
CREATE TYPE accreditation_doc_status AS ENUM (
  'draft',
  'pending_review',
  'approved',
  'expired',
  'archived'
);

-- Accreditation documents table
CREATE TABLE IF NOT EXISTS accreditation_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category accreditation_doc_category NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status accreditation_doc_status NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  effective_date DATE,
  expiration_date DATE,
  tags TEXT[] DEFAULT '{}',
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document versions table (for tracking history)
CREATE TABLE IF NOT EXISTS accreditation_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES accreditation_documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  change_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accred_docs_tenant ON accreditation_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accred_docs_category ON accreditation_documents(category);
CREATE INDEX IF NOT EXISTS idx_accred_docs_status ON accreditation_documents(status);
CREATE INDEX IF NOT EXISTS idx_accred_docs_expiration ON accreditation_documents(expiration_date);

-- Enable RLS
ALTER TABLE accreditation_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE accreditation_document_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view documents in their tenant"
  ON accreditation_documents FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins and instructors can insert documents"
  ON accreditation_documents FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

CREATE POLICY "Admins and instructors can update documents"
  ON accreditation_documents FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

CREATE POLICY "Admins can delete documents"
  ON accreditation_documents FOR DELETE
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Version history policies
CREATE POLICY "Users can view version history"
  ON accreditation_document_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM accreditation_documents d
      WHERE d.id = accreditation_document_versions.document_id
      AND d.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    )
  );

-- Function to check for expiring documents
CREATE OR REPLACE FUNCTION get_expiring_accreditation_documents(
  p_tenant_id UUID,
  p_days_ahead INTEGER DEFAULT 30
) RETURNS SETOF accreditation_documents AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM accreditation_documents
  WHERE tenant_id = p_tenant_id
    AND status = 'approved'
    AND expiration_date IS NOT NULL
    AND expiration_date <= CURRENT_DATE + (p_days_ahead || ' days')::INTERVAL
    AND expiration_date >= CURRENT_DATE
  ORDER BY expiration_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get compliance summary
CREATE OR REPLACE FUNCTION get_accreditation_compliance_summary(p_tenant_id UUID)
RETURNS TABLE (
  category accreditation_doc_category,
  total_documents BIGINT,
  approved_documents BIGINT,
  pending_documents BIGINT,
  expiring_soon BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.category,
    COUNT(*) as total_documents,
    COUNT(*) FILTER (WHERE d.status = 'approved') as approved_documents,
    COUNT(*) FILTER (WHERE d.status IN ('draft', 'pending_review')) as pending_documents,
    COUNT(*) FILTER (
      WHERE d.expiration_date IS NOT NULL
      AND d.expiration_date <= CURRENT_DATE + INTERVAL '30 days'
      AND d.expiration_date >= CURRENT_DATE
    ) as expiring_soon
  FROM accreditation_documents d
  WHERE d.tenant_id = p_tenant_id
    AND d.status != 'archived'
  GROUP BY d.category
  ORDER BY d.category;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE accreditation_documents IS 'Stores accreditation-related documents for program compliance';
COMMENT ON FUNCTION get_expiring_accreditation_documents IS 'Returns documents expiring within specified days';
COMMENT ON FUNCTION get_accreditation_compliance_summary IS 'Returns compliance summary by category';
