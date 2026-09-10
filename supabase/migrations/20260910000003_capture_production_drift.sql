-- =============================================================================
-- Migration: 20260910000003_capture_production_drift.sql
-- Description: Add columns production has that no migration ever created.
--
-- With the migration set now applying cleanly from an empty database, a rebuild
-- produces every table production has. Twelve tables were still short some
-- columns: they were added straight to production — through the Supabase SQL
-- editor or one of the scripts/ helpers — and never written down here. Anything
-- reading them worked in production and failed on a rebuild, which is the kind of
-- difference that makes a staging environment lie to you.
--
-- Types are taken from src/types/database.types.ts, which is generated from the
-- live database, so these match what production actually has. Every statement is
-- ADD COLUMN IF NOT EXISTS: a no-op on production, and the missing piece
-- everywhere else. Nullability follows production — none of these are NOT NULL
-- there, and adding a NOT NULL column to a table with rows would fail anyway.
-- =============================================================================

-- Analytics event categorisation.
ALTER TABLE analytics_events
    ADD COLUMN IF NOT EXISTS event_category TEXT;

-- Limited-use check-in codes.
ALTER TABLE attendance_check_in_codes
    ADD COLUMN IF NOT EXISTS max_uses INTEGER,
    ADD COLUMN IF NOT EXISTS use_count INTEGER DEFAULT 0;

-- Clinical requirements per course, read by the clinical progress views.
ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS required_clinical_hours NUMERIC,
    ADD COLUMN IF NOT EXISTS required_patient_contacts INTEGER;

-- Daily rollup counters. src/lib/hooks/use-analytics.ts selects * from this and
-- charts these fields, so a rebuild rendered empty analytics.
ALTER TABLE daily_metrics
    ADD COLUMN IF NOT EXISTS active_users INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS average_score NUMERIC,
    ADD COLUMN IF NOT EXISTS content_views INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS new_enrollments INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS submissions_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS time_spent_minutes INTEGER DEFAULT 0;

-- Exam attempts against a standardized template.
ALTER TABLE exam_attempts
    ADD COLUMN IF NOT EXISTS questions_answered INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS template_id UUID;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'standardized_exam_templates')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint
                       WHERE conname = 'exam_attempts_template_id_fkey') THEN
        ALTER TABLE exam_attempts
            ADD CONSTRAINT exam_attempts_template_id_fkey
            FOREIGN KEY (template_id) REFERENCES standardized_exam_templates(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Gradebook export template configuration.
ALTER TABLE gradebook_export_templates
    ADD COLUMN IF NOT EXISTS columns JSONB,
    ADD COLUMN IF NOT EXISTS filters JSONB,
    ADD COLUMN IF NOT EXISTS format TEXT;

-- Learning outcome hierarchy and coding, used by the accreditation reports.
ALTER TABLE learning_outcomes
    ADD COLUMN IF NOT EXISTS category TEXT,
    ADD COLUMN IF NOT EXISTS code TEXT,
    ADD COLUMN IF NOT EXISTS level TEXT,
    ADD COLUMN IF NOT EXISTS parent_id UUID,
    ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                   WHERE conname = 'learning_outcomes_parent_id_fkey') THEN
        ALTER TABLE learning_outcomes
            ADD CONSTRAINT learning_outcomes_parent_id_fkey
            FOREIGN KEY (parent_id) REFERENCES learning_outcomes(id) ON DELETE CASCADE;
    END IF;
END $$;

-- NREMT category tree.
ALTER TABLE nremt_categories
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS parent_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                   WHERE conname = 'nremt_categories_parent_id_fkey') THEN
        ALTER TABLE nremt_categories
            ADD CONSTRAINT nremt_categories_parent_id_fkey
            FOREIGN KEY (parent_id) REFERENCES nremt_categories(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Weighting of an outcome against an assessment.
ALTER TABLE outcome_alignments
    ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 1;

-- Denormalised recipient address on a push subscription.
ALTER TABLE push_subscriptions
    ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Publication state of a scheduled standardized exam.
ALTER TABLE standardized_exams
    ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Weekly engagement counters behind the engagement score.
ALTER TABLE student_engagement
    ADD COLUMN IF NOT EXISTS content_views INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discussion_posts INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS logins INTEGER DEFAULT 0;
