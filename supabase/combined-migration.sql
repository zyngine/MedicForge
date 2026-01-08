
-- 00001_initial_schema.sql
-- MedicForge Database Schema
-- Multi-tenant EMS Learning Management System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_role AS ENUM ('admin', 'instructor', 'student');
CREATE TYPE course_type AS ENUM ('EMR', 'EMT', 'AEMT', 'Paramedic', 'Custom');
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'institution', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing');
CREATE TYPE assignment_type AS ENUM ('quiz', 'written', 'skill_checklist', 'discussion');
CREATE TYPE submission_status AS ENUM ('in_progress', 'submitted', 'graded', 'returned');
CREATE TYPE question_type AS ENUM ('multiple_choice', 'true_false', 'matching', 'short_answer');
CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'dropped');
CREATE TYPE skill_status AS ENUM ('passed', 'failed', 'needs_practice');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE content_type AS ENUM ('video', 'document', 'text', 'embed');
CREATE TYPE event_type AS ENUM ('class', 'lab', 'clinical', 'exam', 'other');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE notification_type AS ENUM ('assignment', 'grade', 'announcement', 'reminder');
CREATE TYPE file_context AS ENUM ('course', 'assignment', 'submission', 'profile');
CREATE TYPE log_type AS ENUM ('hours', 'patient_contact');

-- ============================================
-- PLATFORM-LEVEL TABLES
-- ============================================

-- Tenants (Organizations/Institutions)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    custom_domain VARCHAR(255) UNIQUE,
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#1e40af',
    settings JSONB DEFAULT '{}',
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    subscription_tier subscription_tier DEFAULT 'free',
    subscription_status subscription_status DEFAULT 'trialing',
    trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform Admins (MedicForge staff)
CREATE TABLE platform_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription History
CREATE TABLE subscription_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tier subscription_tier NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    stripe_invoice_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TENANT-SCOPED TABLES
-- ============================================

-- Users (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role user_role DEFAULT 'student',
    phone VARCHAR(50),
    emergency_contact JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- Courses
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    course_code VARCHAR(50),
    course_type course_type DEFAULT 'Custom',
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    enrollment_code VARCHAR(10) NOT NULL,
    start_date DATE,
    end_date DATE,
    max_students INTEGER,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, enrollment_code)
);

-- Enrollments
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    status enrollment_status DEFAULT 'active',
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    final_grade DECIMAL(5,2),
    UNIQUE(course_id, student_id)
);

-- Modules
CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    unlock_date TIMESTAMPTZ,
    is_published BOOLEAN DEFAULT false
);

-- Lessons
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content_type content_type DEFAULT 'text',
    content JSONB,
    video_url TEXT,
    document_url TEXT,
    duration_minutes INTEGER,
    order_index INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT false
);

-- Assignments
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    type assignment_type DEFAULT 'quiz',
    due_date TIMESTAMPTZ,
    available_from TIMESTAMPTZ,
    points_possible INTEGER DEFAULT 100,
    time_limit_minutes INTEGER,
    attempts_allowed INTEGER DEFAULT 1,
    settings JSONB DEFAULT '{}',
    rubric JSONB,
    is_published BOOLEAN DEFAULT false
);

-- Quiz Questions
CREATE TABLE quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type question_type DEFAULT 'multiple_choice',
    options JSONB,
    correct_answer JSONB NOT NULL,
    points INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    explanation TEXT
);

-- Submissions
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt_number INTEGER DEFAULT 1,
    content JSONB,
    file_urls JSONB,
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    status submission_status DEFAULT 'in_progress',
    raw_score DECIMAL(5,2),
    curved_score DECIMAL(5,2),
    final_score DECIMAL(5,2),
    graded_by UUID REFERENCES users(id),
    graded_at TIMESTAMPTZ,
    feedback JSONB
);

-- ============================================
-- NREMT COMPETENCY TRACKING
-- ============================================

-- Skill Categories
CREATE TABLE skill_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_type course_type NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    required_count INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true
);

-- Skills
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES skill_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    steps JSONB,
    passing_criteria TEXT
);

-- Skill Attempts
CREATE TABLE skill_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    evaluator_id UUID REFERENCES users(id),
    attempt_number INTEGER DEFAULT 1,
    status skill_status DEFAULT 'needs_practice',
    step_results JSONB,
    notes TEXT,
    feedback TEXT,
    evaluated_at TIMESTAMPTZ
);

-- Clinical Logs
CREATE TABLE clinical_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    log_type log_type NOT NULL,
    date DATE NOT NULL,
    hours DECIMAL(4,2),
    site_name VARCHAR(255),
    site_type VARCHAR(100),
    supervisor_name VARCHAR(255),
    supervisor_credentials VARCHAR(100),
    activities JSONB,
    patient_info JSONB,
    skills_performed JSONB,
    was_team_lead BOOLEAN DEFAULT false,
    notes TEXT,
    verification_status verification_status DEFAULT 'pending',
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ
);

-- ============================================
-- DISCUSSIONS
-- ============================================

-- Discussion Threads
CREATE TABLE discussion_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_pinned BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    is_anonymous_allowed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discussion Posts
CREATE TABLE discussion_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES discussion_posts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_anonymous BOOLEAN DEFAULT false,
    upvotes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    edited_at TIMESTAMPTZ
);

-- ============================================
-- CALENDAR & ATTENDANCE
-- ============================================

-- Events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type event_type DEFAULT 'class',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location VARCHAR(255),
    virtual_link TEXT,
    is_mandatory BOOLEAN DEFAULT false,
    recurrence_rule VARCHAR(255)
);

-- Attendance
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status attendance_status DEFAULT 'absent',
    check_in_time TIMESTAMPTZ,
    notes TEXT,
    recorded_by UUID REFERENCES users(id),
    UNIQUE(event_id, student_id)
);

-- ============================================
-- NOTIFICATIONS & ANNOUNCEMENTS
-- ============================================

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_pinned BOOLEAN DEFAULT false,
    publish_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FILES
-- ============================================

-- Files
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    context file_context NOT NULL,
    context_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Tenants
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_custom_domain ON tenants(custom_domain);

-- Users
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(tenant_id, role);

-- Courses
CREATE INDEX idx_courses_tenant ON courses(tenant_id);
CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_courses_enrollment_code ON courses(enrollment_code);

-- Enrollments
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_tenant ON enrollments(tenant_id);

-- Modules
CREATE INDEX idx_modules_course ON modules(course_id);
CREATE INDEX idx_modules_tenant ON modules(tenant_id);

-- Lessons
CREATE INDEX idx_lessons_module ON lessons(module_id);
CREATE INDEX idx_lessons_tenant ON lessons(tenant_id);

-- Assignments
CREATE INDEX idx_assignments_module ON assignments(module_id);
CREATE INDEX idx_assignments_tenant ON assignments(tenant_id);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);

-- Quiz Questions
CREATE INDEX idx_quiz_questions_assignment ON quiz_questions(assignment_id);

-- Submissions
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_submissions_tenant ON submissions(tenant_id);
CREATE INDEX idx_submissions_status ON submissions(status);

-- Clinical Logs
CREATE INDEX idx_clinical_logs_student ON clinical_logs(student_id);
CREATE INDEX idx_clinical_logs_course ON clinical_logs(course_id);
CREATE INDEX idx_clinical_logs_verification ON clinical_logs(verification_status);

-- Discussion Threads
CREATE INDEX idx_discussion_threads_course ON discussion_threads(course_id);

-- Events
CREATE INDEX idx_events_course ON events(course_id);
CREATE INDEX idx_events_start ON events(start_time);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discussion_threads_updated_at
    BEFORE UPDATE ON discussion_threads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- 00002_rls_policies.sql
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

