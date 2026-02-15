-- Agency Portal Standalone Features
-- Adds agency_role to users and medical_director_invitations table

-- ============================================
-- 1. Add agency_role to users table
-- ============================================

-- Create the enum type
DO $$ BEGIN
  CREATE TYPE agency_role AS ENUM ('agency_admin', 'medical_director');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add agency_role column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS agency_role agency_role DEFAULT NULL;

-- ============================================
-- 2. Create Medical Director Invitations table
-- ============================================

CREATE TABLE IF NOT EXISTS medical_director_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  md_name TEXT NOT NULL,
  md_credentials TEXT,
  md_license_number TEXT,
  invited_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES users(id),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_md_invitations_tenant ON medical_director_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_md_invitations_email ON medical_director_invitations(email);
CREATE INDEX IF NOT EXISTS idx_md_invitations_code ON medical_director_invitations(invite_code);

-- ============================================
-- 3. RLS for Medical Director Invitations
-- ============================================

ALTER TABLE medical_director_invitations ENABLE ROW LEVEL SECURITY;

-- Agency admins can manage invitations for their tenant
DROP POLICY IF EXISTS "Agency admins can manage invitations" ON medical_director_invitations;
CREATE POLICY "Agency admins can manage invitations" ON medical_director_invitations
FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  AND (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR (SELECT agency_role FROM users WHERE id = auth.uid()) = 'agency_admin'
  )
);

-- Anyone can read by invite code (for registration flow)
DROP POLICY IF EXISTS "Public can read by invite code" ON medical_director_invitations;
CREATE POLICY "Public can read by invite code" ON medical_director_invitations
FOR SELECT USING (true);

-- ============================================
-- 4. Helper function to check agency role
-- ============================================

CREATE OR REPLACE FUNCTION is_agency_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT agency_role = 'agency_admin'
    FROM users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_agency_role()
RETURNS agency_role AS $$
BEGIN
  RETURN (
    SELECT agency_role
    FROM users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Function to generate invite code
-- ============================================

CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;
