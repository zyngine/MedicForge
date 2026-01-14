-- Question Bank System Migration
-- Adds validated question bank with NREMT alignment, difficulty levels, and statistics

-- Difficulty level enum
CREATE TYPE question_difficulty AS ENUM ('easy', 'medium', 'hard', 'expert');

-- Certification level for questions
CREATE TYPE certification_level AS ENUM ('EMR', 'EMT', 'AEMT', 'Paramedic', 'All');

-- NREMT Topic Categories
CREATE TABLE question_bank_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = system-wide
    name TEXT NOT NULL,
    description TEXT,
    certification_level certification_level DEFAULT 'All',
    parent_category_id UUID REFERENCES question_bank_categories(id),
    nremt_category_code TEXT, -- Official NREMT category code if applicable
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Question Bank (validated questions)
CREATE TABLE question_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = system-wide
    category_id UUID REFERENCES question_bank_categories(id),

    -- Question content
    question_text TEXT NOT NULL,
    question_type question_type DEFAULT 'multiple_choice',
    options JSONB, -- For multiple choice: [{id, text, isCorrect}]
    correct_answer JSONB NOT NULL,
    explanation TEXT, -- Rationale for correct answer

    -- Metadata
    certification_level certification_level DEFAULT 'EMT',
    difficulty question_difficulty DEFAULT 'medium',
    points INTEGER DEFAULT 1,
    time_estimate_seconds INTEGER DEFAULT 60, -- Expected time to answer

    -- Source and validation
    source TEXT, -- e.g., "NREMT Practice", "Custom", "Textbook Ch.5"
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    is_validated BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Statistics (denormalized for performance)
    times_used INTEGER DEFAULT 0,
    times_correct INTEGER DEFAULT 0,
    avg_time_seconds DECIMAL(10,2),
    discrimination_index DECIMAL(5,4), -- Item Response Theory metric

    -- References
    references JSONB, -- [{title, url, page}]
    tags TEXT[], -- Flexible tagging

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Question usage statistics (detailed per-attempt tracking)
CREATE TABLE question_bank_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,

    -- Response data
    student_answer JSONB,
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INTEGER,
    attempt_number INTEGER DEFAULT 1,

    -- Context
    certification_level certification_level,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Link table: Questions used in assignments
CREATE TABLE assignment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    points_override INTEGER, -- Override default points if needed
    UNIQUE(assignment_id, question_id)
);

-- Seed NREMT standard categories
INSERT INTO question_bank_categories (name, description, certification_level, nremt_category_code, order_index) VALUES
-- EMT Categories (NREMT Content Areas)
('Airway, Respiration & Ventilation', 'Assessment and management of airway, breathing, and ventilation', 'EMT', 'ARV', 1),
('Cardiology & Resuscitation', 'Cardiovascular assessment and resuscitation', 'EMT', 'CAR', 2),
('Trauma', 'Trauma assessment and management', 'EMT', 'TRA', 3),
('Medical/Obstetrics/Gynecology', 'Medical emergencies including OB/GYN', 'EMT', 'MOG', 4),
('EMS Operations', 'EMS system operations and safety', 'EMT', 'OPS', 5),

-- Paramedic Additional Categories
('Advanced Airway Management', 'Advanced airway techniques including RSI', 'Paramedic', 'AAM', 10),
('Pharmacology', 'Medication administration and drug knowledge', 'Paramedic', 'PHR', 11),
('12-Lead ECG Interpretation', 'Cardiac rhythm analysis and 12-lead interpretation', 'Paramedic', 'ECG', 12),
('Pediatric Emergencies', 'Pediatric assessment and treatment', 'Paramedic', 'PED', 13),
('Geriatric Emergencies', 'Geriatric patient considerations', 'Paramedic', 'GER', 14),

-- Sub-categories for EMT Airway
('Oxygen Administration', 'Oxygen delivery devices and administration', 'EMT', 'ARV-O2', 20),
('Suctioning', 'Airway suctioning techniques', 'EMT', 'ARV-SUC', 21),
('Basic Airway Adjuncts', 'OPA and NPA insertion', 'EMT', 'ARV-ADJ', 22),
('Bag-Valve-Mask Ventilation', 'BVM ventilation techniques', 'EMT', 'ARV-BVM', 23),

-- Sub-categories for Cardiology
('CPR & AED', 'Cardiopulmonary resuscitation and AED use', 'EMT', 'CAR-CPR', 30),
('Vital Signs Assessment', 'Blood pressure, pulse, and respirations', 'EMT', 'CAR-VS', 31),
('Shock Recognition', 'Types and treatment of shock', 'EMT', 'CAR-SHK', 32),

-- Sub-categories for Trauma
('Bleeding Control', 'Hemorrhage control techniques', 'EMT', 'TRA-BLD', 40),
('Fracture Management', 'Splinting and immobilization', 'EMT', 'TRA-FX', 41),
('Spinal Motion Restriction', 'Spinal immobilization techniques', 'EMT', 'TRA-SMR', 42),
('Burns', 'Burn assessment and treatment', 'EMT', 'TRA-BRN', 43),

-- Sub-categories for Medical
('Respiratory Emergencies', 'Asthma, COPD, and other respiratory conditions', 'EMT', 'MOG-RSP', 50),
('Diabetic Emergencies', 'Hypoglycemia and hyperglycemia', 'EMT', 'MOG-DM', 51),
('Allergic Reactions', 'Anaphylaxis and allergic emergencies', 'EMT', 'MOG-ALG', 52),
('Stroke', 'Stroke recognition and management', 'EMT', 'MOG-CVA', 53),
('Seizures', 'Seizure management', 'EMT', 'MOG-SZR', 54),
('Poisoning & Overdose', 'Toxicological emergencies', 'EMT', 'MOG-TOX', 55),
('Obstetric Emergencies', 'Childbirth and pregnancy complications', 'EMT', 'MOG-OB', 56),
('Behavioral Emergencies', 'Psychiatric emergencies', 'EMT', 'MOG-BHV', 57),

-- EMS Operations sub-categories
('Scene Safety', 'Scene assessment and safety', 'EMT', 'OPS-SAF', 60),
('Patient Assessment', 'Primary and secondary assessment', 'EMT', 'OPS-ASS', 61),
('Documentation', 'Patient care reporting', 'EMT', 'OPS-DOC', 62),
('Medical-Legal', 'Consent, refusals, and legal issues', 'EMT', 'OPS-LEG', 63),
('Lifting & Moving', 'Patient movement and transport', 'EMT', 'OPS-LFT', 64);

-- Indexes
CREATE INDEX idx_qb_tenant ON question_bank(tenant_id);
CREATE INDEX idx_qb_category ON question_bank(category_id);
CREATE INDEX idx_qb_certification ON question_bank(certification_level);
CREATE INDEX idx_qb_difficulty ON question_bank(difficulty);
CREATE INDEX idx_qb_validated ON question_bank(is_validated, is_active);
CREATE INDEX idx_qb_tags ON question_bank USING GIN(tags);

CREATE INDEX idx_qbs_question ON question_bank_stats(question_id);
CREATE INDEX idx_qbs_student ON question_bank_stats(student_id);
CREATE INDEX idx_qbs_created ON question_bank_stats(created_at);

CREATE INDEX idx_aq_assignment ON assignment_questions(assignment_id);
CREATE INDEX idx_aq_question ON assignment_questions(question_id);

CREATE INDEX idx_qbc_tenant ON question_bank_categories(tenant_id);
CREATE INDEX idx_qbc_certification ON question_bank_categories(certification_level);

-- RLS Policies
ALTER TABLE question_bank_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_questions ENABLE ROW LEVEL SECURITY;

-- Categories: Everyone can view system categories, tenant users can view their own
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

-- Questions: Similar pattern
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

-- Stats: Students see own, instructors see all in tenant
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

-- Assignment questions: Based on assignment access
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

-- Function to update question statistics after an attempt
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

CREATE TRIGGER trigger_update_question_stats
    AFTER INSERT ON question_bank_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_question_stats();
