-- Analytics Tables for Course and Student Engagement Tracking

-- Daily metrics aggregation table
CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  active_users INTEGER DEFAULT 0,
  new_enrollments INTEGER DEFAULT 0,
  submissions_count INTEGER DEFAULT 0,
  average_score DECIMAL(5,2),
  content_views INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, metric_date, course_id)
);

-- Student engagement tracking per week
CREATE TABLE IF NOT EXISTS student_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  logins INTEGER DEFAULT 0,
  content_views INTEGER DEFAULT 0,
  assignments_submitted INTEGER DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  discussion_posts INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, course_id, week_start)
);

-- Analytics events for detailed tracking
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL CHECK (event_category IN ('navigation', 'engagement', 'assessment', 'content', 'system')),
  event_data JSONB,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_metrics_tenant_date ON daily_metrics(tenant_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_course ON daily_metrics(course_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_student_engagement_student ON student_engagement(student_id);
CREATE INDEX IF NOT EXISTS idx_student_engagement_course ON student_engagement(course_id, week_start);
CREATE INDEX IF NOT EXISTS idx_student_engagement_week ON student_engagement(week_start);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_course ON analytics_events(course_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type, created_at);

-- Trigger for updated_at on student_engagement
CREATE OR REPLACE FUNCTION update_student_engagement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS student_engagement_updated_at ON student_engagement;
CREATE TRIGGER student_engagement_updated_at
  BEFORE UPDATE ON student_engagement
  FOR EACH ROW
  EXECUTE FUNCTION update_student_engagement_updated_at();

-- RLS Policies
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Daily metrics policies
CREATE POLICY "Users can view metrics in their tenant" ON daily_metrics
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "System can insert metrics" ON daily_metrics
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- Student engagement policies
CREATE POLICY "Students can view own engagement" ON student_engagement
  FOR SELECT USING (
    student_id = auth.uid() OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

CREATE POLICY "Admins and instructors can view all engagement" ON student_engagement
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

CREATE POLICY "System can manage engagement" ON student_engagement
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- Analytics events policies
CREATE POLICY "Users can insert own events" ON analytics_events
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "Users can view own events" ON analytics_events
  FOR SELECT USING (
    user_id = auth.uid()
  );

CREATE POLICY "Admins can view all events" ON analytics_events
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(
  p_student_id UUID,
  p_course_id UUID,
  p_week_start DATE
) RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_logins INTEGER;
  v_content_views INTEGER;
  v_assignments INTEGER;
  v_time_spent INTEGER;
  v_discussions INTEGER;
BEGIN
  -- Get current values or defaults
  SELECT
    COALESCE(logins, 0),
    COALESCE(content_views, 0),
    COALESCE(assignments_submitted, 0),
    COALESCE(time_spent_minutes, 0),
    COALESCE(discussion_posts, 0)
  INTO v_logins, v_content_views, v_assignments, v_time_spent, v_discussions
  FROM student_engagement
  WHERE student_id = p_student_id
    AND course_id = p_course_id
    AND week_start = p_week_start;

  -- If no record exists, return 0
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Calculate score (max 100)
  -- Logins: up to 20 points (1 point per login, max 20)
  v_score := v_score + LEAST(v_logins * 2, 20);

  -- Content views: up to 25 points
  v_score := v_score + LEAST(v_content_views, 25);

  -- Assignments: up to 25 points (5 per assignment)
  v_score := v_score + LEAST(v_assignments * 5, 25);

  -- Time spent: up to 20 points (1 point per 10 minutes, max 200 min)
  v_score := v_score + LEAST(v_time_spent / 10, 20);

  -- Discussions: up to 10 points (2 per post)
  v_score := v_score + LEAST(v_discussions * 2, 10);

  RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql;
