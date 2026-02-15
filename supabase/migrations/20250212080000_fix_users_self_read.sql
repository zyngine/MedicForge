-- Fix: Allow users to always read their own profile
-- This prevents RLS circular dependency issues for new users

-- Drop existing policies if they exist before recreating
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can view tenant by id" ON tenants;

-- Add policy for users to read their own row
CREATE POLICY "Users can read own profile"
    ON users FOR SELECT
    USING (id = auth.uid());

-- Also add policy for tenants - users should be able to read their tenant
-- even before the get_user_tenant_id() lookup works
CREATE POLICY "Users can view tenant by id"
    ON tenants FOR SELECT
    USING (
        id IN (
            SELECT tenant_id FROM users WHERE id = auth.uid()
        )
    );
