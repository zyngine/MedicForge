-- Fix RLS auth performance: replace auth.uid() with (select auth.uid())
-- and mark helper functions as STABLE so they are evaluated once per query,
-- not once per row.
-- Ref: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ============================================
-- 1. FIX HELPER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID
STABLE
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (SELECT tenant_id FROM users WHERE id = (SELECT auth.uid()));
END;
$$;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role
STABLE
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (SELECT role FROM users WHERE id = (SELECT auth.uid()));
END;
$$;

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
STABLE
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM platform_admins WHERE user_id = (SELECT auth.uid()));
END;
$$;

-- ============================================
-- 2. ENROLLMENTS
-- ============================================

DROP POLICY IF EXISTS "Users can view enrollments" ON enrollments;
CREATE POLICY "Users can view enrollments"
    ON enrollments FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND (
            student_id = (SELECT auth.uid())
            OR get_user_role() IN ('admin', 'instructor')
        )
    );

DROP POLICY IF EXISTS "Students can enroll" ON enrollments;
CREATE POLICY "Students can enroll"
    ON enrollments FOR INSERT
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND student_id = (SELECT auth.uid())
    );

-- ============================================
-- 3. SUBMISSIONS
-- ============================================

DROP POLICY IF EXISTS "Students can view own submissions" ON submissions;
CREATE POLICY "Students can view own submissions"
    ON submissions FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND (
            student_id = (SELECT auth.uid())
            OR get_user_role() IN ('admin', 'instructor')
        )
    );

DROP POLICY IF EXISTS "Students can create submissions" ON submissions;
CREATE POLICY "Students can create submissions"
    ON submissions FOR INSERT
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND student_id = (SELECT auth.uid())
    );

DROP POLICY IF EXISTS "Students can update own submissions" ON submissions;
CREATE POLICY "Students can update own submissions"
    ON submissions FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND student_id = (SELECT auth.uid())
        AND status = 'in_progress'
    );

-- ============================================
-- 4. NOTIFICATIONS
-- ============================================

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND user_id = (SELECT auth.uid())
    );

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND user_id = (SELECT auth.uid())
    );

-- ============================================
-- 5. CLINICAL LOGS
-- ============================================

DROP POLICY IF EXISTS "Users can view clinical logs" ON clinical_logs;
CREATE POLICY "Users can view clinical logs"
    ON clinical_logs FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND (
            student_id = (SELECT auth.uid())
            OR get_user_role() IN ('admin', 'instructor')
        )
    );

DROP POLICY IF EXISTS "Students can create clinical logs" ON clinical_logs;
CREATE POLICY "Students can create clinical logs"
    ON clinical_logs FOR INSERT
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND student_id = (SELECT auth.uid())
    );

DROP POLICY IF EXISTS "Students can update pending logs" ON clinical_logs;
CREATE POLICY "Students can update pending logs"
    ON clinical_logs FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND student_id = (SELECT auth.uid())
        AND verification_status = 'pending'
    );

-- ============================================
-- 6. SKILL ATTEMPTS
-- ============================================

DROP POLICY IF EXISTS "Users can view skill attempts" ON skill_attempts;
CREATE POLICY "Users can view skill attempts"
    ON skill_attempts FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND (
            student_id = (SELECT auth.uid())
            OR get_user_role() IN ('admin', 'instructor')
        )
    );

-- ============================================
-- 7. DISCUSSION THREADS
-- ============================================

DROP POLICY IF EXISTS "Users can create discussion threads" ON discussion_threads;
CREATE POLICY "Users can create discussion threads"
    ON discussion_threads FOR INSERT
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND author_id = (SELECT auth.uid())
    );

DROP POLICY IF EXISTS "Authors can update own threads" ON discussion_threads;
CREATE POLICY "Authors can update own threads"
    ON discussion_threads FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND (
            author_id = (SELECT auth.uid())
            OR get_user_role() IN ('admin', 'instructor')
        )
    );

-- ============================================
-- 8. DISCUSSION POSTS
-- ============================================

DROP POLICY IF EXISTS "Users can create discussion posts" ON discussion_posts;
CREATE POLICY "Users can create discussion posts"
    ON discussion_posts FOR INSERT
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND author_id = (SELECT auth.uid())
    );

DROP POLICY IF EXISTS "Authors can update own posts" ON discussion_posts;
CREATE POLICY "Authors can update own posts"
    ON discussion_posts FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND (
            author_id = (SELECT auth.uid())
            OR get_user_role() IN ('admin', 'instructor')
        )
    );

-- ============================================
-- 9. ATTENDANCE
-- ============================================

DROP POLICY IF EXISTS "Users can view attendance" ON attendance;
CREATE POLICY "Users can view attendance"
    ON attendance FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND (
            student_id = (SELECT auth.uid())
            OR get_user_role() IN ('admin', 'instructor')
        )
    );

-- ============================================
-- 10. FILES
-- ============================================

DROP POLICY IF EXISTS "Users can upload files" ON files;
CREATE POLICY "Users can upload files"
    ON files FOR INSERT
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND uploaded_by = (SELECT auth.uid())
    );

DROP POLICY IF EXISTS "Users can delete own files" ON files;
CREATE POLICY "Users can delete own files"
    ON files FOR DELETE
    USING (
        tenant_id = get_user_tenant_id()
        AND (
            uploaded_by = (SELECT auth.uid())
            OR get_user_role() = 'admin'
        )
    );

-- ============================================
-- 11. CLINICAL SITES
--     (used inline subqueries; switch to STABLE helpers)
-- ============================================

DROP POLICY IF EXISTS "Users can view active clinical sites" ON clinical_sites;
CREATE POLICY "Users can view active clinical sites"
    ON clinical_sites FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND is_active = true
    );

DROP POLICY IF EXISTS "Admins and instructors can view all sites" ON clinical_sites;
CREATE POLICY "Admins and instructors can view all sites"
    ON clinical_sites FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    );

DROP POLICY IF EXISTS "Admins and instructors can insert sites" ON clinical_sites;
CREATE POLICY "Admins and instructors can insert sites"
    ON clinical_sites FOR INSERT
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    );

DROP POLICY IF EXISTS "Admins and instructors can update sites" ON clinical_sites;
CREATE POLICY "Admins and instructors can update sites"
    ON clinical_sites FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    )
    WITH CHECK (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Admins can delete sites" ON clinical_sites;
CREATE POLICY "Admins can delete sites"
    ON clinical_sites FOR DELETE
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() = 'admin'
    );

-- ============================================
-- 12. CLINICAL SHIFTS
-- ============================================

DROP POLICY IF EXISTS "Users can view active shifts" ON clinical_shifts;
CREATE POLICY "Users can view active shifts"
    ON clinical_shifts FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND is_active = true
    );

DROP POLICY IF EXISTS "Admins and instructors can view all shifts" ON clinical_shifts;
CREATE POLICY "Admins and instructors can view all shifts"
    ON clinical_shifts FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    );

DROP POLICY IF EXISTS "Admins and instructors can insert shifts" ON clinical_shifts;
CREATE POLICY "Admins and instructors can insert shifts"
    ON clinical_shifts FOR INSERT
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
        AND created_by = (SELECT auth.uid())
    );

DROP POLICY IF EXISTS "Admins and instructors can update shifts" ON clinical_shifts;
CREATE POLICY "Admins and instructors can update shifts"
    ON clinical_shifts FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    )
    WITH CHECK (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Admins and instructors can delete shifts" ON clinical_shifts;
CREATE POLICY "Admins and instructors can delete shifts"
    ON clinical_shifts FOR DELETE
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    );

-- ============================================
-- 13. CLINICAL SHIFT BOOKINGS
-- ============================================

DROP POLICY IF EXISTS "Students can view own bookings" ON clinical_shift_bookings;
CREATE POLICY "Students can view own bookings"
    ON clinical_shift_bookings FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND student_id = (SELECT auth.uid())
    );

DROP POLICY IF EXISTS "Admins and instructors can view all bookings" ON clinical_shift_bookings;
CREATE POLICY "Admins and instructors can view all bookings"
    ON clinical_shift_bookings FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    );

DROP POLICY IF EXISTS "Students can insert own bookings" ON clinical_shift_bookings;
CREATE POLICY "Students can insert own bookings"
    ON clinical_shift_bookings FOR INSERT
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND student_id = (SELECT auth.uid())
        AND get_user_role() = 'student'
    );

DROP POLICY IF EXISTS "Students can update own bookings" ON clinical_shift_bookings;
CREATE POLICY "Students can update own bookings"
    ON clinical_shift_bookings FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND student_id = (SELECT auth.uid())
    )
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND student_id = (SELECT auth.uid())
    );

DROP POLICY IF EXISTS "Admins and instructors can update bookings" ON clinical_shift_bookings;
CREATE POLICY "Admins and instructors can update bookings"
    ON clinical_shift_bookings FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    )
    WITH CHECK (tenant_id = get_user_tenant_id());

-- ============================================
-- 14. CLINICAL PATIENT CONTACTS
-- ============================================

DROP POLICY IF EXISTS "Students can view own patient contacts" ON clinical_patient_contacts;
CREATE POLICY "Students can view own patient contacts"
    ON clinical_patient_contacts FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND student_id = (SELECT auth.uid())
    );

DROP POLICY IF EXISTS "Admins and instructors can view all patient contacts" ON clinical_patient_contacts;
CREATE POLICY "Admins and instructors can view all patient contacts"
    ON clinical_patient_contacts FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    );

DROP POLICY IF EXISTS "Students can insert own patient contacts" ON clinical_patient_contacts;
CREATE POLICY "Students can insert own patient contacts"
    ON clinical_patient_contacts FOR INSERT
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND student_id = (SELECT auth.uid())
    );

DROP POLICY IF EXISTS "Students can update own unverified patient contacts" ON clinical_patient_contacts;
CREATE POLICY "Students can update own unverified patient contacts"
    ON clinical_patient_contacts FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND student_id = (SELECT auth.uid())
        AND verification_status = 'pending'
    )
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND student_id = (SELECT auth.uid())
    );

DROP POLICY IF EXISTS "Admins and instructors can update patient contacts" ON clinical_patient_contacts;
CREATE POLICY "Admins and instructors can update patient contacts"
    ON clinical_patient_contacts FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    )
    WITH CHECK (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Admins can delete patient contacts" ON clinical_patient_contacts;
CREATE POLICY "Admins can delete patient contacts"
    ON clinical_patient_contacts FOR DELETE
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() = 'admin'
    );

-- ============================================
-- 15. PUSH SUBSCRIPTIONS (skip if tables don't exist)
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_subscriptions' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view own push subscriptions" ON push_subscriptions;
        CREATE POLICY "Users can view own push subscriptions"
            ON push_subscriptions FOR SELECT
            USING (user_id = (SELECT auth.uid()));

        DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON push_subscriptions;
        CREATE POLICY "Users can insert own push subscriptions"
            ON push_subscriptions FOR INSERT
            WITH CHECK (user_id = (SELECT auth.uid()));

        DROP POLICY IF EXISTS "Users can update own push subscriptions" ON push_subscriptions;
        CREATE POLICY "Users can update own push subscriptions"
            ON push_subscriptions FOR UPDATE
            USING (user_id = (SELECT auth.uid()));

        DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON push_subscriptions;
        CREATE POLICY "Users can delete own push subscriptions"
            ON push_subscriptions FOR DELETE
            USING (user_id = (SELECT auth.uid()));
    END IF;
END $$;

-- Also fix push_notification_logs and notification_preferences while we're here
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_notification_logs' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view own push notification logs" ON push_notification_logs;
        CREATE POLICY "Users can view own push notification logs"
            ON push_notification_logs FOR SELECT
            USING (
                user_id = (SELECT auth.uid())
                OR EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id = (SELECT auth.uid())
                    AND u.tenant_id = push_notification_logs.tenant_id
                    AND u.role IN ('admin', 'instructor')
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view own notification preferences" ON notification_preferences;
        CREATE POLICY "Users can view own notification preferences"
            ON notification_preferences FOR SELECT
            USING (user_id = (SELECT auth.uid()));

        DROP POLICY IF EXISTS "Users can insert own notification preferences" ON notification_preferences;
        CREATE POLICY "Users can insert own notification preferences"
            ON notification_preferences FOR INSERT
            WITH CHECK (user_id = (SELECT auth.uid()));

        DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
        CREATE POLICY "Users can update own notification preferences"
            ON notification_preferences FOR UPDATE
            USING (user_id = (SELECT auth.uid()));
    END IF;
END $$;
