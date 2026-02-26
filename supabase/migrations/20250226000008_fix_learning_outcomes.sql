-- Fix learning_outcomes table - add missing columns

-- Add outcome_code column if it doesn't exist
ALTER TABLE learning_outcomes ADD COLUMN IF NOT EXISTS outcome_code TEXT;

-- Add parent_outcome_id column if it doesn't exist
ALTER TABLE learning_outcomes ADD COLUMN IF NOT EXISTS parent_outcome_id UUID REFERENCES learning_outcomes(id);

-- Add mastery_threshold column if it doesn't exist
ALTER TABLE learning_outcomes ADD COLUMN IF NOT EXISTS mastery_threshold NUMERIC(5,2) DEFAULT 70.0;

-- Add outcome_type column if it doesn't exist
DO $$ BEGIN
  CREATE TYPE outcome_type AS ENUM ('course', 'program', 'institutional');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE learning_outcomes ADD COLUMN IF NOT EXISTS outcome_type outcome_type DEFAULT 'course';

-- Create index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_learning_outcomes_outcome_code ON learning_outcomes(outcome_code);
CREATE INDEX IF NOT EXISTS idx_learning_outcomes_parent ON learning_outcomes(parent_outcome_id);
