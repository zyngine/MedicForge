-- Fix missing columns and tables for skill sheets and attendance

-- =====================================================
-- SKILL SHEET ATTEMPTS - Add missing status column
-- =====================================================

-- Add status column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'skill_sheet_attempts' AND column_name = 'status'
  ) THEN
    ALTER TABLE skill_sheet_attempts
    ADD COLUMN status TEXT DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'passed', 'failed', 'needs_remediation'));

    -- Migrate existing data: if passed=true set status='passed', else 'failed'
    UPDATE skill_sheet_attempts
    SET status = CASE WHEN passed = true THEN 'passed' ELSE 'failed' END
    WHERE passed IS NOT NULL;
  END IF;
END $$;

-- Add started_at column if it doesn't exist (maps to attempt_date)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'skill_sheet_attempts' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE skill_sheet_attempts ADD COLUMN started_at TIMESTAMPTZ;
    UPDATE skill_sheet_attempts SET started_at = attempt_date WHERE started_at IS NULL;
  END IF;
END $$;

-- Add completed_at column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'skill_sheet_attempts' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE skill_sheet_attempts ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add verified_at column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'skill_sheet_attempts' AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE skill_sheet_attempts ADD COLUMN verified_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add student_notes column if it doesn't exist (different from student_reflection)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'skill_sheet_attempts' AND column_name = 'student_notes'
  ) THEN
    ALTER TABLE skill_sheet_attempts ADD COLUMN student_notes TEXT;
  END IF;
END $$;

-- Add tenant_id to templates FIRST (for custom templates)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'skill_sheet_templates' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE skill_sheet_templates ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add is_nremt_official to templates if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'skill_sheet_templates' AND column_name = 'is_nremt_official'
  ) THEN
    ALTER TABLE skill_sheet_templates ADD COLUMN is_nremt_official BOOLEAN DEFAULT false;
    -- Mark existing templates as official (those without tenant_id)
    UPDATE skill_sheet_templates SET is_nremt_official = true WHERE tenant_id IS NULL;
  END IF;
END $$;

-- Add version column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'skill_sheet_templates' AND column_name = 'version'
  ) THEN
    ALTER TABLE skill_sheet_templates ADD COLUMN version INTEGER DEFAULT 1;
  END IF;
END $$;

-- =====================================================
-- ATTENDANCE CHECK-IN CODES - Create or fix table
-- =====================================================

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS attendance_check_in_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id)
);

-- Add missing columns if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance_check_in_codes' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE attendance_check_in_codes ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance_check_in_codes' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE attendance_check_in_codes ADD COLUMN created_by UUID REFERENCES users(id);
  END IF;
END $$;

-- Create index for code lookups
CREATE INDEX IF NOT EXISTS idx_attendance_codes_code ON attendance_check_in_codes(code);
CREATE INDEX IF NOT EXISTS idx_attendance_codes_session ON attendance_check_in_codes(session_id);

-- Enable RLS
ALTER TABLE attendance_check_in_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies - use simpler policies that work with nullable tenant_id
DROP POLICY IF EXISTS "Instructors can manage check-in codes" ON attendance_check_in_codes;
CREATE POLICY "Instructors can manage check-in codes" ON attendance_check_in_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'instructor')
    )
  );

DROP POLICY IF EXISTS "Anyone can read valid codes" ON attendance_check_in_codes;
CREATE POLICY "Anyone can read valid codes" ON attendance_check_in_codes
  FOR SELECT USING (expires_at > NOW());

-- =====================================================
-- Create index for skill sheet status queries
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_ssa_status ON skill_sheet_attempts(status);
