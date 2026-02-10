-- Fix RLS policies for question_bank to allow:
-- 1. Platform admins to manage ALL questions
-- 2. Admins/instructors to manage global questions (tenant_id IS NULL)

-- Drop existing policies
DROP POLICY IF EXISTS "Manage tenant questions" ON question_bank;
DROP POLICY IF EXISTS "View questions" ON question_bank;

-- View policy: Users can see global questions and their tenant's questions
CREATE POLICY "View questions" ON question_bank
    FOR SELECT USING (
        tenant_id IS NULL
        OR tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
    );

-- Manage policy for tenant admins/instructors:
-- Can manage their tenant's questions AND global questions
CREATE POLICY "Manage tenant questions" ON question_bank
    FOR ALL USING (
        (
            (tenant_id IS NULL OR tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
            AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
        )
        OR EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
    );

-- Also fix question_bank_categories policies
DROP POLICY IF EXISTS "Manage tenant categories" ON question_bank_categories;
DROP POLICY IF EXISTS "View question categories" ON question_bank_categories;

CREATE POLICY "View question categories" ON question_bank_categories
    FOR SELECT USING (
        tenant_id IS NULL
        OR tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
    );

CREATE POLICY "Manage tenant categories" ON question_bank_categories
    FOR ALL USING (
        (
            (tenant_id IS NULL OR tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
            AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
        )
        OR EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
    );
