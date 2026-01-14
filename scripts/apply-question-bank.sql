-- =====================================================
-- CONSOLIDATED MIGRATION: Question Bank System
-- Run this in Supabase SQL Editor to create the missing tables
-- =====================================================

-- Step 1: Create enums (if they don't exist)
DO $$ BEGIN
    CREATE TYPE question_difficulty AS ENUM ('easy', 'medium', 'hard', 'expert');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE certification_level AS ENUM ('EMR', 'EMT', 'AEMT', 'Paramedic', 'All');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Question Bank Categories
CREATE TABLE IF NOT EXISTS question_bank_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    certification_level certification_level DEFAULT 'All',
    parent_category_id UUID REFERENCES question_bank_categories(id),
    nremt_category_code TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 3: Question Bank
CREATE TABLE IF NOT EXISTS question_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES question_bank_categories(id),
    question_text TEXT NOT NULL,
    question_type question_type DEFAULT 'multiple_choice',
    options JSONB,
    correct_answer JSONB NOT NULL,
    explanation TEXT,
    certification_level certification_level DEFAULT 'EMT',
    difficulty question_difficulty DEFAULT 'medium',
    points INTEGER DEFAULT 1,
    time_estimate_seconds INTEGER DEFAULT 60,
    source TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    is_validated BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    times_used INTEGER DEFAULT 0,
    times_correct INTEGER DEFAULT 0,
    avg_time_seconds DECIMAL(10,2),
    discrimination_index DECIMAL(5,4),
    "references" JSONB,
    tags TEXT[],
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Step 4: Question Bank Stats
CREATE TABLE IF NOT EXISTS question_bank_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
    student_answer JSONB,
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INTEGER,
    attempt_number INTEGER DEFAULT 1,
    certification_level certification_level,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 5: Assignment Questions Link Table
CREATE TABLE IF NOT EXISTS assignment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    points_override INTEGER,
    UNIQUE(assignment_id, question_id)
);

-- Step 6: Create Indexes
CREATE INDEX IF NOT EXISTS idx_qb_tenant ON question_bank(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qb_category ON question_bank(category_id);
CREATE INDEX IF NOT EXISTS idx_qb_certification ON question_bank(certification_level);
CREATE INDEX IF NOT EXISTS idx_qb_difficulty ON question_bank(difficulty);
CREATE INDEX IF NOT EXISTS idx_qb_validated ON question_bank(is_validated, is_active);
CREATE INDEX IF NOT EXISTS idx_qb_tags ON question_bank USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_qbs_question ON question_bank_stats(question_id);
CREATE INDEX IF NOT EXISTS idx_qbs_student ON question_bank_stats(student_id);
CREATE INDEX IF NOT EXISTS idx_qbs_created ON question_bank_stats(created_at);
CREATE INDEX IF NOT EXISTS idx_aq_assignment ON assignment_questions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_aq_question ON assignment_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_qbc_tenant ON question_bank_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qbc_certification ON question_bank_categories(certification_level);

-- Step 7: Enable RLS
ALTER TABLE question_bank_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_questions ENABLE ROW LEVEL SECURITY;

-- Step 8: RLS Policies (drop existing if any, then create)
DROP POLICY IF EXISTS "View question categories" ON question_bank_categories;
DROP POLICY IF EXISTS "Manage tenant categories" ON question_bank_categories;
DROP POLICY IF EXISTS "View questions" ON question_bank;
DROP POLICY IF EXISTS "Manage tenant questions" ON question_bank;
DROP POLICY IF EXISTS "View question stats" ON question_bank_stats;
DROP POLICY IF EXISTS "Insert question stats" ON question_bank_stats;
DROP POLICY IF EXISTS "View assignment questions" ON assignment_questions;
DROP POLICY IF EXISTS "Manage assignment questions" ON assignment_questions;

-- Categories policies
CREATE POLICY "View question categories" ON question_bank_categories
    FOR SELECT USING (
        tenant_id IS NULL OR
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Manage tenant categories" ON question_bank_categories
    FOR ALL USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    );

-- Question policies
CREATE POLICY "View questions" ON question_bank
    FOR SELECT USING (
        tenant_id IS NULL OR
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Manage tenant questions" ON question_bank
    FOR ALL USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    );

-- Stats policies
CREATE POLICY "View question stats" ON question_bank_stats
    FOR SELECT USING (
        student_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid()
            AND role IN ('admin', 'instructor')
            AND tenant_id = (SELECT tenant_id FROM users WHERE id = question_bank_stats.student_id)
        )
    );

CREATE POLICY "Insert question stats" ON question_bank_stats
    FOR INSERT WITH CHECK (student_id = auth.uid());

-- Assignment questions policies
CREATE POLICY "View assignment questions" ON assignment_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN modules m ON a.module_id = m.id
            JOIN courses c ON m.course_id = c.id
            WHERE a.id = assignment_questions.assignment_id
            AND c.tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Manage assignment questions" ON assignment_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN modules m ON a.module_id = m.id
            JOIN courses c ON m.course_id = c.id
            WHERE a.id = assignment_questions.assignment_id
            AND c.instructor_id = auth.uid()
        )
    );

-- Step 9: Trigger for updating stats
CREATE OR REPLACE FUNCTION update_question_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE question_bank
    SET
        times_used = times_used + 1,
        times_correct = times_correct + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
        avg_time_seconds = (
            SELECT AVG(time_spent_seconds)
            FROM question_bank_stats
            WHERE question_id = NEW.question_id
        ),
        updated_at = now()
    WHERE id = NEW.question_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_question_stats ON question_bank_stats;
CREATE TRIGGER trigger_update_question_stats
    AFTER INSERT ON question_bank_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_question_stats();

-- Step 10: Seed NREMT standard categories (if not already present)
INSERT INTO question_bank_categories (name, description, certification_level, nremt_category_code, order_index)
SELECT * FROM (VALUES
    ('Airway, Respiration & Ventilation', 'Assessment and management of airway, breathing, and ventilation', 'EMT'::certification_level, 'ARV', 1),
    ('Cardiology & Resuscitation', 'Cardiovascular assessment and resuscitation', 'EMT'::certification_level, 'CAR', 2),
    ('Trauma', 'Trauma assessment and management', 'EMT'::certification_level, 'TRA', 3),
    ('Medical/Obstetrics/Gynecology', 'Medical emergencies including OB/GYN', 'EMT'::certification_level, 'MOG', 4),
    ('EMS Operations', 'EMS system operations and safety', 'EMT'::certification_level, 'OPS', 5),
    ('Advanced Airway Management', 'Advanced airway techniques including RSI', 'Paramedic'::certification_level, 'AAM', 10),
    ('Pharmacology', 'Medication administration and drug knowledge', 'Paramedic'::certification_level, 'PHR', 11),
    ('12-Lead ECG Interpretation', 'Cardiac rhythm analysis and 12-lead interpretation', 'Paramedic'::certification_level, 'ECG', 12),
    ('Pediatric Emergencies', 'Pediatric assessment and treatment', 'Paramedic'::certification_level, 'PED', 13),
    ('Geriatric Emergencies', 'Geriatric patient considerations', 'Paramedic'::certification_level, 'GER', 14)
) AS v(name, description, certification_level, nremt_category_code, order_index)
WHERE NOT EXISTS (
    SELECT 1 FROM question_bank_categories WHERE nremt_category_code = v.nremt_category_code
);

-- Verification
SELECT 'question_bank_categories' as table_name, count(*) as row_count FROM question_bank_categories
UNION ALL
SELECT 'question_bank', count(*) FROM question_bank;
