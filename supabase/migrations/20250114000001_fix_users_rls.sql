-- Fix RLS policy for users table
-- Allow users to read their own profile regardless of tenant
-- This is needed because the existing policy requires knowing tenant_id first,
-- but to get tenant_id you need to read the users table - circular dependency!

-- Allow users to always view their own profile
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    USING (id = auth.uid());
