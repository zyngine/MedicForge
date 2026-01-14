-- Question Bank System for NREMT Questions
-- Run this in Supabase Dashboard > SQL Editor

-- Check if difficulty type exists, create if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_difficulty') THEN
        CREATE TYPE question_difficulty AS ENUM ('easy', 'medium', 'hard', 'expert');
    END IF;
END $$;

-- Question Bank Categories
CREATE TABLE IF NOT EXISTS question_bank_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    certification_level TEXT DEFAULT 'All',
    parent_category_id UUID REFERENCES question_bank_categories(id),
    nremt_category_code TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Question Bank (validated questions)
CREATE TABLE IF NOT EXISTS question_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES question_bank_categories(id),
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'multiple_choice',
    options JSONB,
    correct_answer JSONB NOT NULL,
    explanation TEXT,
    certification_level TEXT DEFAULT 'EMT',
    difficulty TEXT DEFAULT 'medium',
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qb_tenant ON question_bank(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qb_category ON question_bank(category_id);
CREATE INDEX IF NOT EXISTS idx_qb_certification ON question_bank(certification_level);
CREATE INDEX IF NOT EXISTS idx_qb_difficulty ON question_bank(difficulty);
CREATE INDEX IF NOT EXISTS idx_qb_validated ON question_bank(is_validated, is_active);
CREATE INDEX IF NOT EXISTS idx_qb_tags ON question_bank USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_qbc_tenant ON question_bank_categories(tenant_id);

-- Enable RLS
ALTER TABLE question_bank_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Categories
DROP POLICY IF EXISTS "View question categories" ON question_bank_categories;
CREATE POLICY "View question categories" ON question_bank_categories
    FOR SELECT USING (
        tenant_id IS NULL OR
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Manage tenant categories" ON question_bank_categories;
CREATE POLICY "Manage tenant categories" ON question_bank_categories
    FOR ALL USING (
        tenant_id IS NULL OR
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

-- RLS Policies for Questions
DROP POLICY IF EXISTS "View questions" ON question_bank;
CREATE POLICY "View questions" ON question_bank
    FOR SELECT USING (
        tenant_id IS NULL OR
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Manage tenant questions" ON question_bank;
CREATE POLICY "Manage tenant questions" ON question_bank
    FOR ALL USING (
        tenant_id IS NULL OR
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

-- Seed NREMT standard categories
INSERT INTO question_bank_categories (name, description, certification_level, nremt_category_code, order_index) VALUES
('Airway, Respiration & Ventilation', 'Assessment and management of airway, breathing, and ventilation', 'EMT', 'ARV', 1),
('Cardiology & Resuscitation', 'Cardiovascular assessment and resuscitation', 'EMT', 'CAR', 2),
('Trauma', 'Trauma assessment and management', 'EMT', 'TRA', 3),
('Medical/Obstetrics/Gynecology', 'Medical emergencies including OB/GYN', 'EMT', 'MOG', 4),
('EMS Operations', 'EMS system operations and safety', 'EMT', 'OPS', 5)
ON CONFLICT DO NOTHING;

SELECT 'Question bank tables created successfully!' as status;
