-- =============================================================================
-- Migration: 20260911000000_enable_rls_on_users.sql
-- Description: Enable row level security on public.users.
--
-- Found by running Supabase's own security advisor against the live database
-- after applying the rest of this branch. It reported
-- policy_exists_rls_disabled and rls_disabled_in_public on public.users:
-- the table had seven policies but RLS was never enabled, so every policy was
-- inert, and both anon and authenticated held
-- SELECT/INSERT/UPDATE/DELETE/TRUNCATE on it.
--
-- In practice that meant anyone holding the public anon key — which ships in the
-- JavaScript bundle of every page — could read all user rows (email, full_name,
-- phone, emergency_contact, role, tenant_id, agency_role), set their own role to
-- admin, move themselves into another tenant, or truncate the table. Registering
-- an ordinary account was enough, since authenticated had the same grants.
--
-- RLS could not simply be switched on. "Users can view tenant members" selects
-- from users inside a policy on users:
--     tenant_id IN (SELECT users_1.tenant_id FROM users users_1
--                   WHERE users_1.id = auth.uid())
-- With RLS enabled Postgres raises "infinite recursion detected in policy for
-- relation users" and every read of the table fails. That is the most likely
-- reason RLS was turned off here and never turned back on.
--
-- The policy is redundant. "Users can view users in tenant" expresses the same
-- rule as tenant_id = get_user_tenant_id(), and get_user_tenant_id() is SECURITY
-- DEFINER, so it does not re-enter the policy. Drop the recursive one, keep that.
--
-- Verified on the live database immediately after applying, acting as the
-- authenticated role with a real admin's uid: they still read their own row, see
-- 4 rows (their own tenant) rather than 48, and 0 rows from other tenants. As
-- anon: 0 rows, down from all 48.
-- =============================================================================

DROP POLICY IF EXISTS "Users can view tenant members" ON users;

-- "Users can read own profile" duplicates "Users can view own profile". Harmless,
-- and left alone rather than changing more than necessary in one step.

-- Deletes run through /api/admin/delete-user with the service role, which bypasses
-- RLS. The matching policy is added anyway so a tenant admin working through the
-- normal client is not silently blocked, and so nobody else can delete a user.
DROP POLICY IF EXISTS "Admins can delete users in tenant" ON users;
CREATE POLICY "Admins can delete users in tenant"
    ON users FOR DELETE
    USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'admin'::user_role);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- anon has no business writing to the user table. Signup and invitation flows go
-- through the service role, which bypasses both grants and RLS.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON users FROM anon;
