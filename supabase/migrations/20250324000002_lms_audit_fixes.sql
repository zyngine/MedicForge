-- =============================================================================
-- Migration: 20250324000002_lms_audit_fixes.sql
-- Description: LMS Production Audit Fixes
--
-- Addresses critical issues found during production audit:
--   1. Missing anonymous SELECT policy on tenants (blocks middleware slug lookup)
--   2. Missing DELETE policy on courses (silent deletion failure)
--   3. Missing DELETE policy on notifications (users can't clear notifications)
--   4. Missing composite indexes for common query patterns
--   5. Missing updated_at column + auto-update trigger on courses
--   6. Missing CHECK constraint on tenants.tenant_type
--
-- All statements use IF NOT EXISTS / DO blocks where possible for idempotency.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Anonymous tenant lookup RLS policy
--    The middleware uses the anon key to query tenants by slug or custom_domain.
--    Without this, unauthenticated users on subdomains can't reach the login page.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'tenants'
          AND policyname = 'Anyone can view tenant basics'
    ) THEN
        CREATE POLICY "Anyone can view tenant basics"
            ON tenants FOR SELECT
            USING (true);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. DELETE policy on courses
--    The existing RLS (00002_rls_policies.sql) has INSERT/UPDATE/SELECT but no
--    DELETE, so course deletion silently fails for tenant admins.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'courses'
          AND policyname = 'Tenant admins can delete courses'
    ) THEN
        CREATE POLICY "Tenant admins can delete courses"
            ON courses FOR DELETE
            USING (
                tenant_id = get_user_tenant_id()
                AND get_user_role() = 'admin'
            );
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. DELETE policy on notifications
--    Users currently cannot clear their own notifications.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'notifications'
          AND policyname = 'Users can delete own notifications'
    ) THEN
        CREATE POLICY "Users can delete own notifications"
            ON notifications FOR DELETE
            USING (user_id = (SELECT auth.uid()));
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Composite indexes for common query patterns
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_student
    ON submissions(assignment_id, student_id);

CREATE INDEX IF NOT EXISTS idx_clinical_logs_student_course
    ON clinical_logs(student_id, course_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_tenant_status
    ON enrollments(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_courses_tenant_published
    ON courses(tenant_id, is_published);

-- ---------------------------------------------------------------------------
-- 5. Add updated_at column to courses with auto-update trigger
-- ---------------------------------------------------------------------------
ALTER TABLE courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS courses_updated_at ON courses;
CREATE TRIGGER courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_courses_updated_at();

-- ---------------------------------------------------------------------------
-- 6. CHECK constraint on tenants.tenant_type
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'tenants_tenant_type_check'
    ) THEN
        ALTER TABLE tenants ADD CONSTRAINT tenants_tenant_type_check
            CHECK (tenant_type IN ('education', 'agency', 'combined'));
    END IF;
END $$;
