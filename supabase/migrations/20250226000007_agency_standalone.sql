-- Agency Standalone Product Migration
-- Separates Agency Portal from LMS into its own product

-- 1. Add agency_role to users table for agency-specific roles
DO $$ BEGIN
  CREATE TYPE agency_role AS ENUM ('agency_admin', 'medical_director');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS agency_role agency_role DEFAULT NULL;

-- 2. Create medical director invitations table
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

-- 3. Create index for faster invite code lookups
CREATE INDEX IF NOT EXISTS idx_md_invitations_invite_code ON medical_director_invitations(invite_code);
CREATE INDEX IF NOT EXISTS idx_md_invitations_tenant ON medical_director_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_md_invitations_email ON medical_director_invitations(email);

-- 4. Enable RLS on medical_director_invitations
ALTER TABLE medical_director_invitations ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for medical_director_invitations
-- Agency admins can manage their tenant's invitations
CREATE POLICY "Agency admins can view invitations" ON medical_director_invitations
FOR SELECT USING (
  tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "Agency admins can create invitations" ON medical_director_invitations
FOR INSERT WITH CHECK (
  tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND agency_role = 'agency_admin'
  )
);

CREATE POLICY "Agency admins can update invitations" ON medical_director_invitations
FOR UPDATE USING (
  tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND agency_role = 'agency_admin'
  )
);

CREATE POLICY "Agency admins can delete invitations" ON medical_director_invitations
FOR DELETE USING (
  tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND agency_role = 'agency_admin'
  )
);

-- 6. Public policy to check invite codes (for registration flow)
CREATE POLICY "Anyone can check invite codes" ON medical_director_invitations
FOR SELECT USING (
  -- Allow checking if invite code exists and is valid
  expires_at > NOW() AND accepted_at IS NULL
);

-- 7. Function to create an MD invitation
CREATE OR REPLACE FUNCTION create_md_invitation(
  p_tenant_id UUID,
  p_email TEXT,
  p_md_name TEXT,
  p_md_credentials TEXT DEFAULT NULL,
  p_md_license_number TEXT DEFAULT NULL,
  p_is_primary BOOLEAN DEFAULT false
) RETURNS medical_director_invitations AS $$
DECLARE
  v_invite_code TEXT;
  v_result medical_director_invitations;
BEGIN
  -- Generate a unique invite code
  v_invite_code := encode(gen_random_bytes(16), 'hex');

  INSERT INTO medical_director_invitations (
    tenant_id,
    email,
    invite_code,
    md_name,
    md_credentials,
    md_license_number,
    invited_by,
    is_primary
  ) VALUES (
    p_tenant_id,
    p_email,
    v_invite_code,
    p_md_name,
    p_md_credentials,
    p_md_license_number,
    auth.uid(),
    p_is_primary
  ) RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to accept an MD invitation
CREATE OR REPLACE FUNCTION accept_md_invitation(
  p_invite_code TEXT,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_invitation medical_director_invitations;
BEGIN
  -- Get the invitation
  SELECT * INTO v_invitation
  FROM medical_director_invitations
  WHERE invite_code = p_invite_code
    AND expires_at > NOW()
    AND accepted_at IS NULL;

  IF v_invitation IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation code';
  END IF;

  -- Update the user's agency_role and tenant_id
  UPDATE users
  SET
    agency_role = 'medical_director',
    tenant_id = v_invitation.tenant_id
  WHERE id = p_user_id;

  -- Mark invitation as accepted
  UPDATE medical_director_invitations
  SET
    accepted_at = NOW(),
    accepted_by = p_user_id
  WHERE id = v_invitation.id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to validate an invite code (for registration page)
CREATE OR REPLACE FUNCTION validate_md_invite_code(p_invite_code TEXT)
RETURNS TABLE (
  valid BOOLEAN,
  tenant_name TEXT,
  md_name TEXT,
  email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    true as valid,
    t.name as tenant_name,
    mdi.md_name,
    mdi.email
  FROM medical_director_invitations mdi
  JOIN tenants t ON t.id = mdi.tenant_id
  WHERE mdi.invite_code = p_invite_code
    AND mdi.expires_at > NOW()
    AND mdi.accepted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Grant execute permissions
GRANT EXECUTE ON FUNCTION create_md_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION accept_md_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION validate_md_invite_code TO anon, authenticated;

-- 11. Add comment for documentation
COMMENT ON TABLE medical_director_invitations IS 'Stores invitations for Medical Directors to join agency tenants';
COMMENT ON COLUMN users.agency_role IS 'Role within agency tenant: agency_admin or medical_director';
