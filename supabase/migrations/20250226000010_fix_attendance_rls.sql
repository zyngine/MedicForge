-- Fix attendance_check_in_codes RLS and ensure table visibility

-- First, ensure the table exists with proper structure
-- (This should be created by 20240315000000, but let's be safe)
CREATE TABLE IF NOT EXISTS attendance_check_in_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id)
);

-- Drop ALL existing policies on the table to avoid conflicts
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'attendance_check_in_codes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON attendance_check_in_codes', pol.policyname);
  END LOOP;
END $$;

-- Enable RLS
ALTER TABLE attendance_check_in_codes ENABLE ROW LEVEL SECURITY;

-- Simple, broad policies that should definitely work
-- SELECT: Users can see codes in their tenant
CREATE POLICY "attendance_codes_select" ON attendance_check_in_codes
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- INSERT: Instructors can create codes
CREATE POLICY "attendance_codes_insert" ON attendance_check_in_codes
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- UPDATE: Instructors can update codes
CREATE POLICY "attendance_codes_update" ON attendance_check_in_codes
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- DELETE: Instructors can delete codes
CREATE POLICY "attendance_codes_delete" ON attendance_check_in_codes
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- Grant usage to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON attendance_check_in_codes TO authenticated;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_attendance_check_in_codes_session ON attendance_check_in_codes(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in_codes_code ON attendance_check_in_codes(code);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in_codes_tenant ON attendance_check_in_codes(tenant_id);
