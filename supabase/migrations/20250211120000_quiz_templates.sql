-- Quiz Templates: Allow instructors to save and reuse quizzes across courses
-- Templates are tenant-scoped and can be cloned into any course assignment

-- Create quiz_templates table
CREATE TABLE IF NOT EXISTS quiz_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  -- Quiz settings (copied when cloning)
  time_limit_minutes INTEGER,
  max_attempts INTEGER DEFAULT 1,
  shuffle_questions BOOLEAN DEFAULT false,
  shuffle_options BOOLEAN DEFAULT false,
  show_correct_answers BOOLEAN DEFAULT true,
  passing_score INTEGER DEFAULT 70,
  -- Questions stored as JSONB array (preserves order and structure)
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Metadata (calculated by trigger)
  total_points INTEGER DEFAULT 0,
  question_count INTEGER DEFAULT 0,
  -- Categorization
  tags TEXT[] DEFAULT '{}',
  certification_level VARCHAR(50), -- EMR, EMT, AEMT, Paramedic
  -- Lifecycle
  is_active BOOLEAN DEFAULT true,
  times_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_templates_tenant ON quiz_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quiz_templates_created_by ON quiz_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_quiz_templates_tags ON quiz_templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_quiz_templates_cert_level ON quiz_templates(certification_level);

-- Enable RLS
ALTER TABLE quiz_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- View: Users can see templates from their tenant
CREATE POLICY "View tenant quiz templates"
  ON quiz_templates FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- Create: Instructors and admins can create templates
CREATE POLICY "Instructors create quiz templates"
  ON quiz_templates FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('instructor', 'admin')
  );

-- Update: Creator or admin can update
CREATE POLICY "Update own quiz templates"
  ON quiz_templates FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (
      created_by = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    )
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- Delete: Creator or admin can delete (soft delete via is_active)
CREATE POLICY "Delete own quiz templates"
  ON quiz_templates FOR DELETE
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (
      created_by = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    )
  );

-- Function to increment times_used counter
CREATE OR REPLACE FUNCTION increment_quiz_template_usage(template_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE quiz_templates
  SET times_used = times_used + 1,
      updated_at = NOW()
  WHERE id = template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate total_points and question_count from questions JSONB
CREATE OR REPLACE FUNCTION calculate_quiz_template_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate question count
  NEW.question_count := jsonb_array_length(COALESCE(NEW.questions, '[]'::jsonb));

  -- Calculate total points
  SELECT COALESCE(SUM((q->>'points')::integer), 0)
  INTO NEW.total_points
  FROM jsonb_array_elements(COALESCE(NEW.questions, '[]'::jsonb)) AS q;

  -- Update timestamp
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quiz_templates_calculate_stats
  BEFORE INSERT OR UPDATE ON quiz_templates
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quiz_template_stats();

COMMENT ON TABLE quiz_templates IS 'Reusable quiz templates that can be cloned into course assignments';
COMMENT ON COLUMN quiz_templates.questions IS 'JSONB array of questions with structure: {id, question_text, question_type, options, correct_answer, points, explanation}';
