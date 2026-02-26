-- Ensure attendance_check_in_codes is fully accessible

-- Make sure RLS is enabled
ALTER TABLE attendance_check_in_codes ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to be sure they exist
DROP POLICY IF EXISTS "attendance_codes_select" ON attendance_check_in_codes;
DROP POLICY IF EXISTS "attendance_codes_insert" ON attendance_check_in_codes;
DROP POLICY IF EXISTS "attendance_codes_update" ON attendance_check_in_codes;
DROP POLICY IF EXISTS "attendance_codes_delete" ON attendance_check_in_codes;

-- Recreate with simpler conditions
CREATE POLICY "attendance_codes_select" ON attendance_check_in_codes
  FOR SELECT TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "attendance_codes_insert" ON attendance_check_in_codes
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "attendance_codes_update" ON attendance_check_in_codes
  FOR UPDATE TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "attendance_codes_delete" ON attendance_check_in_codes
  FOR DELETE TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- Grant all permissions to authenticated role
GRANT ALL ON attendance_check_in_codes TO authenticated;

-- Also grant to anon for public read of non-expired codes (for check-in validation)
GRANT SELECT ON attendance_check_in_codes TO anon;
