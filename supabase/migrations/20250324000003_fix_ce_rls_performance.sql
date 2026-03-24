-- =============================================================================
-- Fix CE RLS Performance: Replace inline subqueries with helper functions
--
-- The original ce_users policies (lines 61-74 of initial schema) used inline
-- subqueries like (SELECT role FROM ce_users u WHERE u.id = (SELECT auth.uid()))
-- instead of the helper functions get_ce_user_role() and get_ce_user_agency_id().
-- This causes N+1 evaluation per row. This migration replaces them.
-- =============================================================================

-- Ensure helper functions exist (idempotent)
CREATE OR REPLACE FUNCTION get_ce_user_role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT role FROM ce_users WHERE id = (SELECT auth.uid())
$$;

CREATE OR REPLACE FUNCTION get_ce_user_agency_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT agency_id FROM ce_users WHERE id = (SELECT auth.uid())
$$;

-- Drop the offending policies on ce_users
DROP POLICY IF EXISTS "CE admins can view all CE users" ON ce_users;
DROP POLICY IF EXISTS "CE admins can manage CE users" ON ce_users;
DROP POLICY IF EXISTS "Agency admins can view own agency users" ON ce_users;

-- Recreate using helper functions
CREATE POLICY "CE admins can view all CE users"
  ON ce_users FOR SELECT
  USING (get_ce_user_role() = 'admin');

CREATE POLICY "CE admins can manage CE users"
  ON ce_users FOR ALL
  USING (get_ce_user_role() = 'admin');

CREATE POLICY "Agency admins can view own agency users"
  ON ce_users FOR SELECT
  USING (
    get_ce_user_role() = 'agency_admin'
    AND agency_id = get_ce_user_agency_id()
  );
