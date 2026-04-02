-- =============================================================================
-- Fix CE RLS Infinite Recursion
--
-- The get_ce_user_role() and get_ce_user_agency_id() helper functions query
-- ce_users to check the caller's role. Without SECURITY DEFINER, these inner
-- queries go through RLS, which evaluates the "Agency admins can view own
-- agency users" policy, which calls get_ce_user_agency_id() again — causing
-- infinite recursion and a "stack depth limit exceeded" error.
--
-- Fix: make both functions SECURITY DEFINER so they bypass RLS when looking
-- up the caller's own role/agency_id. SET search_path = public for safety.
-- =============================================================================

CREATE OR REPLACE FUNCTION get_ce_user_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM ce_users WHERE id = (SELECT auth.uid())
$$;

CREATE OR REPLACE FUNCTION get_ce_user_agency_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agency_id FROM ce_users WHERE id = (SELECT auth.uid())
$$;