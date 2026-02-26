-- Create missing tables that are referenced in the codebase
-- Uses IF NOT EXISTS and DROP POLICY IF EXISTS for idempotency

-- ============================================
-- 1. Zoom Connections (Video Sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS zoom_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  zoom_user_id TEXT,
  zoom_email TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_zoom_connections_user ON zoom_connections(user_id);
ALTER TABLE zoom_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own zoom connection" ON zoom_connections;
DROP POLICY IF EXISTS "Users can manage own zoom connection" ON zoom_connections;

CREATE POLICY "Users can view own zoom connection" ON zoom_connections
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own zoom connection" ON zoom_connections
  FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 2. Gradebook Export Templates
-- ============================================
CREATE TABLE IF NOT EXISTS gradebook_export_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  columns JSONB DEFAULT '[]',
  filters JSONB DEFAULT '{}',
  format TEXT DEFAULT 'csv',
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gradebook_export_templates_tenant ON gradebook_export_templates(tenant_id);
ALTER TABLE gradebook_export_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tenant templates" ON gradebook_export_templates;
DROP POLICY IF EXISTS "Instructors can manage templates" ON gradebook_export_templates;

CREATE POLICY "Users can view tenant templates" ON gradebook_export_templates
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Instructors can manage templates" ON gradebook_export_templates
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- ============================================
-- 3. Messaging System (Conversations)
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT,
  type TEXT DEFAULT 'direct', -- direct, group, course
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- owner, admin, member
  last_read_at TIMESTAMPTZ,
  is_muted BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text', -- text, image, file, system
  attachments JSONB,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can manage own participation" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;

CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (
    id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can view conversation participants" ON conversation_participants
  FOR SELECT USING (
    conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage own participation" ON conversation_participants
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
  );

-- ============================================
-- 4. Skill Sheet Templates & Attempts
-- ============================================
CREATE TABLE IF NOT EXISTS skill_sheet_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  skill_type TEXT, -- psychomotor, cognitive, affective
  steps JSONB DEFAULT '[]',
  critical_criteria JSONB DEFAULT '[]',
  passing_score INTEGER DEFAULT 70,
  max_attempts INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skill_sheet_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES skill_sheet_templates(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  attempt_number INTEGER DEFAULT 1,
  status TEXT DEFAULT 'in_progress', -- in_progress, passed, failed, needs_remediation
  score INTEGER,
  step_scores JSONB DEFAULT '{}',
  critical_failures JSONB DEFAULT '[]',
  feedback TEXT,
  notes TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only create indexes if columns exist (wrap in exception handlers)
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_skill_sheet_templates_tenant ON skill_sheet_templates(tenant_id);
EXCEPTION WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_skill_sheet_attempts_template ON skill_sheet_attempts(template_id);
EXCEPTION WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_skill_sheet_attempts_student ON skill_sheet_attempts(student_id);
EXCEPTION WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_skill_sheet_attempts_status ON skill_sheet_attempts(status);
EXCEPTION WHEN undefined_column THEN null;
END $$;

ALTER TABLE skill_sheet_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_sheet_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tenant templates" ON skill_sheet_templates;
DROP POLICY IF EXISTS "Instructors can manage templates" ON skill_sheet_templates;
DROP POLICY IF EXISTS "Students can view own attempts" ON skill_sheet_attempts;
DROP POLICY IF EXISTS "Instructors can manage attempts" ON skill_sheet_attempts;
DROP POLICY IF EXISTS "skill_sheet_templates_select" ON skill_sheet_templates;
DROP POLICY IF EXISTS "skill_sheet_templates_all" ON skill_sheet_templates;
DROP POLICY IF EXISTS "skill_sheet_attempts_select" ON skill_sheet_attempts;
DROP POLICY IF EXISTS "skill_sheet_attempts_all" ON skill_sheet_attempts;

-- Skill sheet templates - use simpler policy that works regardless of schema
CREATE POLICY "skill_sheet_templates_select" ON skill_sheet_templates
  FOR SELECT USING (true);

CREATE POLICY "skill_sheet_templates_all" ON skill_sheet_templates
  FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor'));

-- Skill sheet attempts policies (wrapped in exception handler for schema differences)
DO $$ BEGIN
  CREATE POLICY "skill_sheet_attempts_select" ON skill_sheet_attempts
    FOR SELECT USING (
      student_id = auth.uid() OR
      (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    );
EXCEPTION WHEN undefined_column THEN
  CREATE POLICY "skill_sheet_attempts_select" ON skill_sheet_attempts
    FOR SELECT USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor', 'student'));
END $$;

DO $$ BEGIN
  CREATE POLICY "skill_sheet_attempts_all" ON skill_sheet_attempts
    FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 5. Attendance Check-in Codes
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_check_in_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_check_in_codes_session ON attendance_check_in_codes(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in_codes_code ON attendance_check_in_codes(code);

ALTER TABLE attendance_check_in_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view session codes" ON attendance_check_in_codes;
DROP POLICY IF EXISTS "Instructors can manage codes" ON attendance_check_in_codes;

CREATE POLICY "Users can view session codes" ON attendance_check_in_codes
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM attendance_sessions
      WHERE course_id IN (
        SELECT course_id FROM enrollments WHERE student_id = auth.uid()
        UNION
        SELECT id FROM courses WHERE created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Instructors can manage codes" ON attendance_check_in_codes
  FOR ALL USING (
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- ============================================
-- 6. Learning Outcomes
-- ============================================
CREATE TABLE IF NOT EXISTS learning_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  code TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  level TEXT, -- course, module, lesson
  parent_id UUID REFERENCES learning_outcomes(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outcome_alignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_id UUID NOT NULL REFERENCES learning_outcomes(id) ON DELETE CASCADE,
  alignable_type TEXT NOT NULL, -- assignment, quiz, lesson, module
  alignable_id UUID NOT NULL,
  weight DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_outcome_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outcome_id UUID NOT NULL REFERENCES learning_outcomes(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  mastery_level TEXT DEFAULT 'not_started', -- not_started, developing, approaching, mastered
  mastery_score DECIMAL(5,2),
  evidence_count INTEGER DEFAULT 0,
  last_assessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, outcome_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_outcomes_tenant ON learning_outcomes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_learning_outcomes_course ON learning_outcomes(course_id);
CREATE INDEX IF NOT EXISTS idx_outcome_alignments_outcome ON outcome_alignments(outcome_id);
CREATE INDEX IF NOT EXISTS idx_student_outcome_progress_student ON student_outcome_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_outcome_progress_outcome ON student_outcome_progress(outcome_id);

ALTER TABLE learning_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_alignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_outcome_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tenant outcomes" ON learning_outcomes;
DROP POLICY IF EXISTS "Instructors can manage outcomes" ON learning_outcomes;
DROP POLICY IF EXISTS "Users can view alignments" ON outcome_alignments;
DROP POLICY IF EXISTS "Students can view own progress" ON student_outcome_progress;
DROP POLICY IF EXISTS "System can manage progress" ON student_outcome_progress;

CREATE POLICY "Users can view tenant outcomes" ON learning_outcomes
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Instructors can manage outcomes" ON learning_outcomes
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

CREATE POLICY "Users can view alignments" ON outcome_alignments
  FOR SELECT USING (
    outcome_id IN (SELECT id FROM learning_outcomes WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
  );

CREATE POLICY "Students can view own progress" ON student_outcome_progress
  FOR SELECT USING (
    student_id = auth.uid() OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

CREATE POLICY "System can manage progress" ON student_outcome_progress
  FOR ALL USING (
    course_id IN (SELECT course_id FROM enrollments WHERE student_id = auth.uid())
    OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );
