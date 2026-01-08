-- MedicForge Row Level Security Policies
-- Multi-tenant isolation and role-based access

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get current user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT tenant_id FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
BEGIN
    RETURN (SELECT role FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is platform admin
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TENANTS POLICIES
-- ============================================

-- Platform admins can see all tenants
CREATE POLICY "Platform admins can view all tenants"
    ON tenants FOR SELECT
    USING (is_platform_admin());

-- Users can view their own tenant
CREATE POLICY "Users can view own tenant"
    ON tenants FOR SELECT
    USING (id = get_user_tenant_id());

-- Platform admins can create tenants
CREATE POLICY "Platform admins can create tenants"
    ON tenants FOR INSERT
    WITH CHECK (is_platform_admin());

-- Tenant admins can update their tenant
CREATE POLICY "Tenant admins can update own tenant"
    ON tenants FOR UPDATE
    USING (id = get_user_tenant_id() AND get_user_role() = 'admin');

-- ============================================
-- USERS POLICIES
-- ============================================

-- Users can view users in their tenant
CREATE POLICY "Users can view users in tenant"
    ON users FOR SELECT
    USING (tenant_id = get_user_tenant_id());

-- Admins can insert users in their tenant
CREATE POLICY "Admins can create users"
    ON users FOR INSERT
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND get_user_role() = 'admin'
    );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (id = auth.uid());

-- Admins can update users in their tenant
CREATE POLICY "Admins can update users in tenant"
    ON users FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() = 'admin'
    );

-- ============================================
-- COURSES POLICIES
-- ============================================

-- Users can view courses in their tenant
CREATE POLICY "Users can view courses in tenant"
    ON courses FOR SELECT
    USING (tenant_id = get_user_tenant_id());

-- Instructors and admins can create courses
CREATE POLICY "Instructors can create courses"
    ON courses FOR INSERT
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    );

-- Course instructors and admins can update courses
CREATE POLICY "Instructors can update own courses"
    ON courses FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND (
            instructor_id = auth.uid()
            OR get_user_role() = 'admin'
        )
    );

-- ============================================
-- ENROLLMENTS POLICIES
-- ============================================

-- Users can view enrollments in their tenant
CREATE POLICY "Users can view enrollments"
    ON enrollments FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND (
            student_id = auth.uid()
            OR get_user_role() IN ('admin', 'instructor')
        )
    );

-- Students can enroll themselves
CREATE POLICY "Students can enroll"
    ON enrollments FOR INSERT
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND student_id = auth.uid()
    );

-- Admins and instructors can manage enrollments
CREATE POLICY "Admins can manage enrollments"
    ON enrollments FOR ALL
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    );

-- ============================================
-- MODULES POLICIES
-- ============================================

-- Users can view published modules in enrolled courses
CREATE POLICY "Users can view modules"
    ON modules FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND (
            is_published = true
            OR get_user_role() IN ('admin', 'instructor')
        )
    );

-- Instructors can manage modules
CREATE POLICY "Instructors can manage modules"
    ON modules FOR ALL
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    );

-- ============================================
-- LESSONS POLICIES
-- ============================================

-- Users can view published lessons
CREATE POLICY "Users can view lessons"
    ON lessons FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND (
            is_published = true
            OR get_user_role() IN ('admin', 'instructor')
        )
    );

-- Instructors can manage lessons
CREATE POLICY "Instructors can manage lessons"
    ON lessons FOR ALL
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    );

-- ============================================
-- ASSIGNMENTS POLICIES
-- ============================================

-- Users can view published assignments
CREATE POLICY "Users can view assignments"
    ON assignments FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND (
            is_published = true
            OR get_user_role() IN ('admin', 'instructor')
        )
    );

-- Instructors can manage assignments
CREATE POLICY "Instructors can manage assignments"
    ON assignments FOR ALL
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    );

-- ============================================
-- QUIZ QUESTIONS POLICIES
-- ============================================

-- Users can view quiz questions for assignments they can access
CREATE POLICY "Users can view quiz questions"
    ON quiz_questions FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
    );

-- Instructors can manage quiz questions
CREATE POLICY "Instructors can manage quiz questions"
    ON quiz_questions FOR ALL
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    );

-- ============================================
-- SUBMISSIONS POLICIES
-- ============================================

-- Students can view their own submissions
CREATE POLICY "Students can view own submissions"
    ON submissions FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND (
            student_id = auth.uid()
            OR get_user_role() IN ('admin', 'instructor')
        )
    );

-- Students can create submissions
CREATE POLICY "Students can create submissions"
    ON submissions FOR INSERT
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND student_id = auth.uid()
    );

-- Students can update their in-progress submissions
CREATE POLICY "Students can update own submissions"
    ON submissions FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND student_id = auth.uid()
        AND status = 'in_progress'
    );

-- Instructors can grade submissions
CREATE POLICY "Instructors can grade submissions"
    ON submissions FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    );

-- ============================================
-- CLINICAL LOGS POLICIES
-- ============================================

-- Users can view clinical logs appropriately
CREATE POLICY "Users can view clinical logs"
    ON clinical_logs FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND (
            student_id = auth.uid()
            OR get_user_role() IN ('admin', 'instructor')
        )
    );

-- Students can create their clinical logs
CREATE POLICY "Students can create clinical logs"
    ON clinical_logs FOR INSERT
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND student_id = auth.uid()
    );

-- Students can update pending logs
CREATE POLICY "Students can update pending logs"
    ON clinical_logs FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND student_id = auth.uid()
        AND verification_status = 'pending'
    );

-- Instructors can verify logs
CREATE POLICY "Instructors can verify logs"
    ON clinical_logs FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    );

-- ============================================
-- SKILL CATEGORIES, SKILLS, SKILL ATTEMPTS
-- ============================================

-- Skill Categories
CREATE POLICY "Users can view skill categories"
    ON skill_categories FOR SELECT
    USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage skill categories"
    ON skill_categories FOR ALL
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() = 'admin'
    );

-- Skills
CREATE POLICY "Users can view skills"
    ON skills FOR SELECT
    USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage skills"
    ON skills FOR ALL
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() = 'admin'
    );

-- Skill Attempts
CREATE POLICY "Users can view skill attempts"
    ON skill_attempts FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND (
            student_id = auth.uid()
            OR get_user_role() IN ('admin', 'instructor')
        )
    );

CREATE POLICY "Instructors can manage skill attempts"
    ON skill_attempts FOR ALL
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    );

-- ============================================
-- DISCUSSIONS POLICIES
-- ============================================

-- Discussion Threads
CREATE POLICY "Users can view discussion threads"
    ON discussion_threads FOR SELECT
    USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create discussion threads"
    ON discussion_threads FOR INSERT
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND author_id = auth.uid()
    );

CREATE POLICY "Authors can update own threads"
    ON discussion_threads FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND (
            author_id = auth.uid()
            OR get_user_role() IN ('admin', 'instructor')
        )
    );

-- Discussion Posts
CREATE POLICY "Users can view discussion posts"
    ON discussion_posts FOR SELECT
    USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can create discussion posts"
    ON discussion_posts FOR INSERT
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND author_id = auth.uid()
    );

CREATE POLICY "Authors can update own posts"
    ON discussion_posts FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND (
            author_id = auth.uid()
            OR get_user_role() IN ('admin', 'instructor')
        )
    );

-- ============================================
-- EVENTS & ATTENDANCE POLICIES
-- ============================================

-- Events
CREATE POLICY "Users can view events"
    ON events FOR SELECT
    USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Instructors can manage events"
    ON events FOR ALL
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    );

-- Attendance
CREATE POLICY "Users can view attendance"
    ON attendance FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND (
            student_id = auth.uid()
            OR get_user_role() IN ('admin', 'instructor')
        )
    );

CREATE POLICY "Instructors can manage attendance"
    ON attendance FOR ALL
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    );

-- ============================================
-- NOTIFICATIONS & ANNOUNCEMENTS POLICIES
-- ============================================

-- Notifications
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND user_id = auth.uid()
    );

CREATE POLICY "System can create notifications"
    ON notifications FOR INSERT
    WITH CHECK (tenant_id = get_user_tenant_id());

-- Announcements
CREATE POLICY "Users can view announcements"
    ON announcements FOR SELECT
    USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Instructors can manage announcements"
    ON announcements FOR ALL
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role() IN ('admin', 'instructor')
    );

-- ============================================
-- FILES POLICIES
-- ============================================

CREATE POLICY "Users can view files in tenant"
    ON files FOR SELECT
    USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can upload files"
    ON files FOR INSERT
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND uploaded_by = auth.uid()
    );

CREATE POLICY "Users can delete own files"
    ON files FOR DELETE
    USING (
        tenant_id = get_user_tenant_id()
        AND (
            uploaded_by = auth.uid()
            OR get_user_role() = 'admin'
        )
    );
