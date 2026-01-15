-- Fix RLS policy for platform_admins table
-- Run this in Supabase SQL Editor

-- Allow platform admins to read their own record
CREATE POLICY "Platform admins can view own record"
    ON platform_admins FOR SELECT
    USING (user_id = auth.uid());

-- Also allow platform admins full access to platform_admins table
CREATE POLICY "Platform admins can manage platform_admins"
    ON platform_admins FOR ALL
    USING (is_platform_admin());
