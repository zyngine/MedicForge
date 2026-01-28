-- Zoom Integration Tables
-- Enables video class scheduling via Zoom API

-- Store instructor Zoom OAuth connections
CREATE TABLE IF NOT EXISTS zoom_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    zoom_user_id TEXT NOT NULL,
    zoom_email TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    scopes TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tenant_id, user_id)
);

-- Video sessions (scheduled video classes)
CREATE TABLE IF NOT EXISTS video_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Session details
    title TEXT NOT NULL,
    description TEXT,
    session_type TEXT NOT NULL DEFAULT 'class', -- class, office_hours, tutoring, meeting

    -- Scheduling
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    timezone TEXT DEFAULT 'America/New_York',
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule TEXT, -- iCal RRULE format

    -- Zoom meeting details (null if manual link)
    zoom_meeting_id TEXT,
    zoom_meeting_uuid TEXT,
    join_url TEXT,
    start_url TEXT, -- Host URL (encrypted or not stored for security)
    password TEXT,

    -- Manual link option (if not using Zoom API)
    manual_link TEXT,
    video_platform TEXT, -- zoom, google_meet, teams, other

    -- Recording
    recording_url TEXT,
    recording_password TEXT,
    is_recording_available BOOLEAN DEFAULT false,

    -- Status
    status TEXT DEFAULT 'scheduled', -- scheduled, live, completed, cancelled
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    attendee_count INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track attendance for video sessions
CREATE TABLE IF NOT EXISTS video_session_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES video_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    join_count INTEGER DEFAULT 1, -- Times they joined/rejoined

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(session_id, user_id)
);

-- Indexes (use IF NOT EXISTS pattern)
CREATE INDEX IF NOT EXISTS idx_zoom_connections_user ON zoom_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_zoom_connections_tenant ON zoom_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_course ON video_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_creator ON video_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_video_sessions_scheduled ON video_sessions(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_video_sessions_status ON video_sessions(status);
CREATE INDEX IF NOT EXISTS idx_video_attendance_session ON video_session_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_video_attendance_user ON video_session_attendance(user_id);

-- Updated_at triggers (drop and recreate to be idempotent)
DROP TRIGGER IF EXISTS update_zoom_connections_updated_at ON zoom_connections;
CREATE TRIGGER update_zoom_connections_updated_at
    BEFORE UPDATE ON zoom_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_video_sessions_updated_at ON video_sessions;
CREATE TRIGGER update_video_sessions_updated_at
    BEFORE UPDATE ON video_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE zoom_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_session_attendance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view own zoom connection" ON zoom_connections;
CREATE POLICY "Users can view own zoom connection"
    ON zoom_connections FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own zoom connection" ON zoom_connections;
CREATE POLICY "Users can insert own zoom connection"
    ON zoom_connections FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own zoom connection" ON zoom_connections;
CREATE POLICY "Users can update own zoom connection"
    ON zoom_connections FOR UPDATE
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own zoom connection" ON zoom_connections;
CREATE POLICY "Users can delete own zoom connection"
    ON zoom_connections FOR DELETE
    USING (user_id = auth.uid());

-- Video sessions: Instructors manage, students view their course sessions
DROP POLICY IF EXISTS "Users can view video sessions in tenant" ON video_sessions;
CREATE POLICY "Users can view video sessions in tenant"
    ON video_sessions FOR SELECT
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Instructors can create video sessions" ON video_sessions;
CREATE POLICY "Instructors can create video sessions"
    ON video_sessions FOR INSERT
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    );

DROP POLICY IF EXISTS "Creators can update own video sessions" ON video_sessions;
CREATE POLICY "Creators can update own video sessions"
    ON video_sessions FOR UPDATE
    USING (
        created_by = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    );

DROP POLICY IF EXISTS "Creators can delete own video sessions" ON video_sessions;
CREATE POLICY "Creators can delete own video sessions"
    ON video_sessions FOR DELETE
    USING (
        created_by = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    );

-- Video attendance: Users see own, instructors see all for their sessions
DROP POLICY IF EXISTS "Users can view own attendance" ON video_session_attendance;
CREATE POLICY "Users can view own attendance"
    ON video_session_attendance FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM video_sessions vs
            WHERE vs.id = video_session_attendance.session_id
            AND vs.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "System can insert attendance" ON video_session_attendance;
CREATE POLICY "System can insert attendance"
    ON video_session_attendance FOR INSERT
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );
