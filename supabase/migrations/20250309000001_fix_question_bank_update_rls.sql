-- Fix question_bank RLS to allow admins/instructors to update global questions
-- (tenant_id IS NULL) imported by platform admin, and ensure platform admins
-- can manage all questions via the browser client as a fallback.

-- Drop and recreate the manage policy with correct conditions
DROP POLICY IF EXISTS "Manage tenant questions" ON question_bank;

CREATE POLICY "Manage tenant questions" ON question_bank
    FOR ALL USING (
        (
            (tenant_id IS NULL OR tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
            AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
        )
        OR EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
    );
