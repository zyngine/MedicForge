-- ============================================================
-- Agency Platform Audit Fixes
-- Date: 2025-03-24
-- Fixes: overly permissive RLS, missing tenant_id checks,
--        audit log immutability, missing index
-- ============================================================

-- 1. Fix overly permissive SELECT on medical_director_invitations
-- Old policy "Anyone can check invite codes" uses USING (true), allowing enumeration
-- Replace with: only allow lookup of unexpired, unaccepted invitations
DROP POLICY IF EXISTS "Anyone can check invite codes" ON medical_director_invitations;

CREATE POLICY "Anyone can check valid invite codes"
    ON medical_director_invitations FOR SELECT
    USING (
        expires_at > NOW()
        AND accepted_at IS NULL
    );

-- 2. Fix MD verification INSERT — add explicit tenant_id check
-- Ensures MD can only create verifications for their own tenant
DROP POLICY IF EXISTS "MDs can create verifications" ON competency_verifications;

CREATE POLICY "MDs can create verifications"
    ON competency_verifications FOR INSERT
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM medical_director_assignments
            WHERE user_id = auth.uid()
            AND tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
            AND is_active = true
        )
    );

-- 3. Make audit log immutable — prevent UPDATE and DELETE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'agency_audit_log'
          AND policyname = 'Audit log is immutable'
    ) THEN
        CREATE POLICY "Audit log is immutable"
            ON agency_audit_log FOR UPDATE
            USING (false);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'agency_audit_log'
          AND policyname = 'Audit log cannot be deleted'
    ) THEN
        CREATE POLICY "Audit log cannot be deleted"
            ON agency_audit_log FOR DELETE
            USING (false);
    END IF;
END $$;

-- 4. Missing index for competency tenant+status queries
CREATE INDEX IF NOT EXISTS idx_employee_competencies_tenant_status
    ON employee_competencies(tenant_id, status);
