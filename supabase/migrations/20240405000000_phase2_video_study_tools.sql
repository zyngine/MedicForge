-- Phase 2: Video Conferencing, Breakout Rooms, and Study Tools
-- MedicForge LMS

-- =====================================================
-- VIDEO CONFERENCING SYSTEM
-- =====================================================

-- Video meeting status enum
CREATE TYPE video_meeting_status AS ENUM (
  'scheduled',
  'live',
  'ended',
  'cancelled'
);

-- Video meetings table
CREATE TABLE video_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  meeting_type TEXT NOT NULL DEFAULT 'class', -- class, office_hours, lab, study_group
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end TIMESTAMPTZ NOT NULL,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  status video_meeting_status NOT NULL DEFAULT 'scheduled',
  room_id TEXT, -- External room ID from video provider
  join_url TEXT,
  host_url TEXT,
  recording_enabled BOOLEAN DEFAULT false,
  recording_url TEXT,
  waiting_room_enabled BOOLEAN DEFAULT true,
  max_participants INTEGER DEFAULT 100,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meeting participants
CREATE TABLE video_meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES video_meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  is_presenter BOOLEAN DEFAULT false,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meeting_id, user_id)
);

-- =====================================================
-- BREAKOUT ROOMS
-- =====================================================

-- Breakout room status
CREATE TYPE breakout_room_status AS ENUM (
  'pending',
  'active',
  'closed'
);

-- Breakout rooms
CREATE TABLE breakout_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES video_meetings(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  room_number INTEGER NOT NULL,
  status breakout_room_status DEFAULT 'pending',
  external_room_id TEXT,
  join_url TEXT,
  duration_minutes INTEGER,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Breakout room assignments
CREATE TABLE breakout_room_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  breakout_room_id UUID NOT NULL REFERENCES breakout_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  UNIQUE(breakout_room_id, user_id)
);

-- =====================================================
-- STUDY TOOLS - FLASHCARDS
-- =====================================================

-- Flashcard decks
CREATE TABLE flashcard_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- anatomy, pharmacology, protocols, etc.
  is_public BOOLEAN DEFAULT false, -- Shared with course
  is_official BOOLEAN DEFAULT false, -- Created by instructor
  card_count INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  average_difficulty DECIMAL(3,2),
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flashcards
CREATE TABLE flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  front_content TEXT NOT NULL, -- Question/term
  back_content TEXT NOT NULL, -- Answer/definition
  front_image_url TEXT,
  back_image_url TEXT,
  audio_url TEXT,
  hints TEXT[],
  tags TEXT[],
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spaced repetition data (SM-2 algorithm)
CREATE TABLE flashcard_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  card_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  ease_factor DECIMAL(4,2) DEFAULT 2.5, -- SM-2 ease factor
  interval_days INTEGER DEFAULT 1,
  repetitions INTEGER DEFAULT 0,
  next_review_date DATE,
  last_reviewed_at TIMESTAMPTZ,
  quality_history INTEGER[], -- Array of quality ratings (0-5)
  total_reviews INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

-- =====================================================
-- STUDY TOOLS - PRACTICE EXAMS
-- =====================================================

-- Practice exam mode enum
CREATE TYPE practice_exam_mode AS ENUM (
  'study', -- Show answers immediately
  'practice', -- Show answers at end
  'timed', -- Timed with no feedback until end
  'adaptive' -- Adjust difficulty based on performance
);

-- Practice exam sessions
CREATE TABLE practice_exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  title TEXT NOT NULL,
  mode practice_exam_mode NOT NULL DEFAULT 'practice',
  question_source TEXT NOT NULL, -- 'course', 'nremt_category', 'custom', 'weak_areas'
  source_filters JSONB, -- Category IDs, difficulty range, etc.
  question_count INTEGER NOT NULL,
  time_limit_minutes INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  current_question_index INTEGER DEFAULT 0,
  score INTEGER,
  total_correct INTEGER DEFAULT 0,
  total_answered INTEGER DEFAULT 0,
  performance_by_category JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Practice exam questions (selected for session)
CREATE TABLE practice_exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES practice_exam_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL, -- References quiz_questions or standardized_questions
  question_type TEXT NOT NULL, -- 'quiz' or 'standardized'
  order_index INTEGER NOT NULL,
  user_answer JSONB,
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,
  flagged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weak areas tracking
CREATE TABLE student_weak_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  category TEXT NOT NULL, -- NREMT category or topic
  subcategory TEXT,
  total_questions INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2),
  last_assessed TIMESTAMPTZ,
  is_weak_area BOOLEAN DEFAULT false, -- Below 70% accuracy
  improvement_trend TEXT, -- 'improving', 'declining', 'stable'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category, subcategory)
);

-- =====================================================
-- STUDY TOOLS - PODCASTS/AUDIO
-- =====================================================

-- Podcast series
CREATE TABLE podcast_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  category TEXT,
  is_published BOOLEAN DEFAULT false,
  episode_count INTEGER DEFAULT 0,
  total_duration_minutes INTEGER DEFAULT 0,
  subscriber_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Podcast episodes
CREATE TABLE podcast_episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  series_id UUID NOT NULL REFERENCES podcast_series(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  transcript TEXT,
  show_notes TEXT,
  episode_number INTEGER NOT NULL,
  published_at TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT false,
  play_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User podcast progress
CREATE TABLE podcast_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  episode_id UUID NOT NULL REFERENCES podcast_episodes(id) ON DELETE CASCADE,
  current_position_seconds INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  playback_speed DECIMAL(2,1) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, episode_id)
);

-- =====================================================
-- SPEEDGRADER
-- =====================================================

-- SpeedGrader sessions (for tracking grading workflow)
CREATE TABLE speedgrader_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  grader_id UUID NOT NULL REFERENCES users(id),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  current_submission_id UUID,
  submissions_graded INTEGER DEFAULT 0,
  submissions_total INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  filters JSONB DEFAULT '{}', -- status, section, student filters
  sort_order TEXT DEFAULT 'name_asc',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grading comments library
CREATE TABLE grading_comment_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  category TEXT, -- 'positive', 'improvement', 'common_error'
  points_adjustment DECIMAL(5,2), -- Optional point deduction/addition
  usage_count INTEGER DEFAULT 0,
  is_shared BOOLEAN DEFAULT false,
  shortcut TEXT, -- Quick access shortcut like '/gc1'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inline annotations for document grading
CREATE TABLE submission_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  grader_id UUID NOT NULL REFERENCES users(id),
  annotation_type TEXT NOT NULL, -- 'highlight', 'comment', 'strikethrough', 'drawing'
  page_number INTEGER,
  position_data JSONB NOT NULL, -- x, y, width, height or path data
  content TEXT,
  color TEXT DEFAULT '#FFFF00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- GEOLOCATION CHECK-IN
-- =====================================================

-- Location-based check-in zones
CREATE TABLE checkin_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  zone_type TEXT NOT NULL, -- 'classroom', 'clinical_site', 'lab', 'event'
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  radius_meters INTEGER NOT NULL DEFAULT 100,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Check-in events
CREATE TABLE checkin_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES checkin_zones(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id),
  event_id UUID REFERENCES events(id),
  title TEXT NOT NULL,
  checkin_window_start TIMESTAMPTZ NOT NULL,
  checkin_window_end TIMESTAMPTZ NOT NULL,
  require_checkout BOOLEAN DEFAULT false,
  checkout_window_end TIMESTAMPTZ,
  late_threshold_minutes INTEGER DEFAULT 15,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User check-ins
CREATE TABLE user_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  checkin_event_id UUID NOT NULL REFERENCES checkin_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  checkin_latitude DECIMAL(10,8),
  checkin_longitude DECIMAL(11,8),
  checkin_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checkin_distance_meters INTEGER,
  checkout_latitude DECIMAL(10,8),
  checkout_longitude DECIMAL(11,8),
  checkout_time TIMESTAMPTZ,
  checkout_distance_meters INTEGER,
  status TEXT NOT NULL DEFAULT 'on_time', -- 'on_time', 'late', 'absent', 'excused'
  device_info JSONB,
  ip_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(checkin_event_id, user_id)
);

-- =====================================================
-- MODERATED GRADING
-- =====================================================

-- Moderated grading assignments
CREATE TABLE moderated_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  moderator_id UUID NOT NULL REFERENCES users(id),
  graders UUID[] NOT NULL, -- Array of grader user IDs
  grader_count_required INTEGER DEFAULT 2, -- How many graders per submission
  anonymize_graders BOOLEAN DEFAULT true,
  final_grade_method TEXT DEFAULT 'average', -- 'average', 'highest', 'lowest', 'moderator_choice'
  discrepancy_threshold DECIMAL(5,2) DEFAULT 10.0, -- % difference that triggers review
  status TEXT DEFAULT 'setup', -- 'setup', 'grading', 'review', 'finalized'
  grades_released BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id)
);

-- Individual grader grades
CREATE TABLE moderated_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  moderated_assignment_id UUID NOT NULL REFERENCES moderated_assignments(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  grader_id UUID NOT NULL REFERENCES users(id),
  score DECIMAL(5,2),
  feedback TEXT,
  rubric_scores JSONB,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(moderated_assignment_id, submission_id, grader_id)
);

-- Final moderated grade decisions
CREATE TABLE moderated_final_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  moderated_assignment_id UUID NOT NULL REFERENCES moderated_assignments(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  final_score DECIMAL(5,2),
  selected_grader_id UUID, -- If moderator chose one grader's grade
  moderator_notes TEXT,
  requires_review BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(moderated_assignment_id, submission_id)
);

-- =====================================================
-- LTI INTEGRATION
-- =====================================================

-- LTI tool configurations
CREATE TABLE lti_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tool_url TEXT NOT NULL,
  consumer_key TEXT NOT NULL,
  shared_secret TEXT NOT NULL,
  custom_params JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  launch_in_new_window BOOLEAN DEFAULT false,
  icon_url TEXT,
  lti_version TEXT DEFAULT '1.1', -- '1.1' or '1.3'
  -- LTI 1.3 specific
  client_id TEXT,
  deployment_id TEXT,
  public_keyset_url TEXT,
  auth_login_url TEXT,
  auth_token_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LTI placements (where tools appear)
CREATE TABLE lti_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES lti_tools(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE, -- NULL = all courses
  placement_type TEXT NOT NULL, -- 'course_navigation', 'assignment', 'editor_button', 'resource_selection'
  position INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LTI launches (for tracking and grade passback)
CREATE TABLE lti_launches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES lti_tools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  assignment_id UUID REFERENCES assignments(id),
  launch_time TIMESTAMPTZ DEFAULT NOW(),
  return_url TEXT,
  outcome_service_url TEXT, -- For grade passback
  result_sourcedid TEXT, -- For grade passback
  session_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LTI grade passback
CREATE TABLE lti_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  launch_id UUID NOT NULL REFERENCES lti_launches(id) ON DELETE CASCADE,
  score DECIMAL(5,4), -- 0.0 to 1.0
  passed_back_at TIMESTAMPTZ,
  passback_status TEXT, -- 'pending', 'success', 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Video meetings
CREATE INDEX idx_video_meetings_tenant ON video_meetings(tenant_id);
CREATE INDEX idx_video_meetings_course ON video_meetings(course_id);
CREATE INDEX idx_video_meetings_status ON video_meetings(status);
CREATE INDEX idx_video_meetings_scheduled ON video_meetings(scheduled_start);

-- Breakout rooms
CREATE INDEX idx_breakout_rooms_meeting ON breakout_rooms(meeting_id);
CREATE INDEX idx_breakout_assignments_room ON breakout_room_assignments(breakout_room_id);

-- Flashcards
CREATE INDEX idx_flashcard_decks_tenant ON flashcard_decks(tenant_id);
CREATE INDEX idx_flashcard_decks_course ON flashcard_decks(course_id);
CREATE INDEX idx_flashcards_deck ON flashcards(deck_id);
CREATE INDEX idx_flashcard_progress_user ON flashcard_progress(user_id);
CREATE INDEX idx_flashcard_progress_next_review ON flashcard_progress(next_review_date);

-- Practice exams
CREATE INDEX idx_practice_sessions_user ON practice_exam_sessions(user_id);
CREATE INDEX idx_practice_questions_session ON practice_exam_questions(session_id);
CREATE INDEX idx_weak_areas_user ON student_weak_areas(user_id);

-- Podcasts
CREATE INDEX idx_podcast_series_tenant ON podcast_series(tenant_id);
CREATE INDEX idx_podcast_episodes_series ON podcast_episodes(series_id);
CREATE INDEX idx_podcast_progress_user ON podcast_progress(user_id);

-- SpeedGrader
CREATE INDEX idx_speedgrader_sessions_grader ON speedgrader_sessions(grader_id);
CREATE INDEX idx_grading_comments_creator ON grading_comment_library(created_by);
CREATE INDEX idx_annotations_submission ON submission_annotations(submission_id);

-- Geolocation
CREATE INDEX idx_checkin_zones_tenant ON checkin_zones(tenant_id);
CREATE INDEX idx_checkin_events_zone ON checkin_events(zone_id);
CREATE INDEX idx_user_checkins_event ON user_checkins(checkin_event_id);
CREATE INDEX idx_user_checkins_user ON user_checkins(user_id);

-- Moderated grading
CREATE INDEX idx_moderated_assignments_assignment ON moderated_assignments(assignment_id);
CREATE INDEX idx_moderated_grades_submission ON moderated_grades(submission_id);

-- LTI
CREATE INDEX idx_lti_tools_tenant ON lti_tools(tenant_id);
CREATE INDEX idx_lti_placements_tool ON lti_placements(tool_id);
CREATE INDEX idx_lti_launches_user ON lti_launches(user_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- SM-2 Spaced Repetition Algorithm
CREATE OR REPLACE FUNCTION update_flashcard_progress(
  p_user_id UUID,
  p_card_id UUID,
  p_quality INTEGER -- 0-5 rating
) RETURNS flashcard_progress AS $$
DECLARE
  v_progress flashcard_progress;
  v_new_ef DECIMAL(4,2);
  v_new_interval INTEGER;
  v_tenant_id UUID;
BEGIN
  -- Get tenant_id from the card
  SELECT tenant_id INTO v_tenant_id FROM flashcards WHERE id = p_card_id;

  -- Get or create progress record
  SELECT * INTO v_progress
  FROM flashcard_progress
  WHERE user_id = p_user_id AND card_id = p_card_id;

  IF NOT FOUND THEN
    INSERT INTO flashcard_progress (tenant_id, user_id, card_id)
    VALUES (v_tenant_id, p_user_id, p_card_id)
    RETURNING * INTO v_progress;
  END IF;

  -- SM-2 Algorithm
  -- Update ease factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  v_new_ef := v_progress.ease_factor + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02));
  IF v_new_ef < 1.3 THEN
    v_new_ef := 1.3;
  END IF;

  -- Calculate new interval
  IF p_quality < 3 THEN
    -- Failed: reset
    v_new_interval := 1;
    v_progress.repetitions := 0;
  ELSE
    IF v_progress.repetitions = 0 THEN
      v_new_interval := 1;
    ELSIF v_progress.repetitions = 1 THEN
      v_new_interval := 6;
    ELSE
      v_new_interval := ROUND(v_progress.interval_days * v_new_ef);
    END IF;
    v_progress.repetitions := v_progress.repetitions + 1;
  END IF;

  -- Update progress
  UPDATE flashcard_progress
  SET
    ease_factor = v_new_ef,
    interval_days = v_new_interval,
    repetitions = v_progress.repetitions,
    next_review_date = CURRENT_DATE + v_new_interval,
    last_reviewed_at = NOW(),
    quality_history = array_append(COALESCE(quality_history, '{}'), p_quality),
    total_reviews = total_reviews + 1,
    correct_count = correct_count + CASE WHEN p_quality >= 3 THEN 1 ELSE 0 END,
    updated_at = NOW()
  WHERE id = v_progress.id
  RETURNING * INTO v_progress;

  RETURN v_progress;
END;
$$ LANGUAGE plpgsql;

-- Get cards due for review
CREATE OR REPLACE FUNCTION get_due_flashcards(
  p_user_id UUID,
  p_deck_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
  card_id UUID,
  front_content TEXT,
  back_content TEXT,
  front_image_url TEXT,
  back_image_url TEXT,
  ease_factor DECIMAL(4,2),
  interval_days INTEGER,
  is_new BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.front_content,
    f.back_content,
    f.front_image_url,
    f.back_image_url,
    COALESCE(fp.ease_factor, 2.5),
    COALESCE(fp.interval_days, 1),
    fp.id IS NULL as is_new
  FROM flashcards f
  LEFT JOIN flashcard_progress fp ON f.id = fp.card_id AND fp.user_id = p_user_id
  WHERE (p_deck_id IS NULL OR f.deck_id = p_deck_id)
    AND (fp.id IS NULL OR fp.next_review_date <= CURRENT_DATE)
  ORDER BY
    fp.id IS NULL DESC, -- New cards first
    fp.next_review_date ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Calculate distance between two coordinates (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_meters(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
) RETURNS INTEGER AS $$
DECLARE
  R CONSTANT INTEGER := 6371000; -- Earth radius in meters
  phi1 DECIMAL;
  phi2 DECIMAL;
  delta_phi DECIMAL;
  delta_lambda DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  phi1 := RADIANS(lat1);
  phi2 := RADIANS(lat2);
  delta_phi := RADIANS(lat2 - lat1);
  delta_lambda := RADIANS(lon2 - lon1);

  a := SIN(delta_phi/2) * SIN(delta_phi/2) +
       COS(phi1) * COS(phi2) *
       SIN(delta_lambda/2) * SIN(delta_lambda/2);
  c := 2 * ATAN2(SQRT(a), SQRT(1-a));

  RETURN ROUND(R * c);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Process check-in with geolocation verification
CREATE OR REPLACE FUNCTION process_checkin(
  p_event_id UUID,
  p_user_id UUID,
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_device_info JSONB DEFAULT NULL
) RETURNS user_checkins AS $$
DECLARE
  v_event checkin_events;
  v_zone checkin_zones;
  v_distance INTEGER;
  v_status TEXT;
  v_checkin user_checkins;
  v_tenant_id UUID;
BEGIN
  -- Get event and zone
  SELECT * INTO v_event FROM checkin_events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Check-in event not found';
  END IF;

  v_tenant_id := v_event.tenant_id;

  SELECT * INTO v_zone FROM checkin_zones WHERE id = v_event.zone_id;

  -- Calculate distance
  v_distance := calculate_distance_meters(
    p_latitude, p_longitude,
    v_zone.latitude, v_zone.longitude
  );

  -- Check if within radius
  IF v_distance > v_zone.radius_meters THEN
    RAISE EXCEPTION 'You are too far from the check-in location (% meters away)', v_distance;
  END IF;

  -- Check time window
  IF NOW() < v_event.checkin_window_start THEN
    RAISE EXCEPTION 'Check-in has not started yet';
  END IF;

  IF NOW() > v_event.checkin_window_end THEN
    RAISE EXCEPTION 'Check-in window has ended';
  END IF;

  -- Determine status
  IF NOW() > v_event.checkin_window_start + (v_event.late_threshold_minutes || ' minutes')::INTERVAL THEN
    v_status := 'late';
  ELSE
    v_status := 'on_time';
  END IF;

  -- Create check-in
  INSERT INTO user_checkins (
    tenant_id, checkin_event_id, user_id,
    checkin_latitude, checkin_longitude,
    checkin_distance_meters, status, device_info
  ) VALUES (
    v_tenant_id, p_event_id, p_user_id,
    p_latitude, p_longitude,
    v_distance, v_status, p_device_info
  )
  ON CONFLICT (checkin_event_id, user_id)
  DO UPDATE SET
    checkin_latitude = EXCLUDED.checkin_latitude,
    checkin_longitude = EXCLUDED.checkin_longitude,
    checkin_time = NOW(),
    checkin_distance_meters = EXCLUDED.checkin_distance_meters,
    device_info = EXCLUDED.device_info
  RETURNING * INTO v_checkin;

  RETURN v_checkin;
END;
$$ LANGUAGE plpgsql;

-- Update weak areas after practice exam
CREATE OR REPLACE FUNCTION update_weak_areas(
  p_session_id UUID
) RETURNS VOID AS $$
DECLARE
  v_session practice_exam_sessions;
  v_question RECORD;
  v_category TEXT;
BEGIN
  SELECT * INTO v_session FROM practice_exam_sessions WHERE id = p_session_id;

  -- Process each answered question
  FOR v_question IN
    SELECT pq.*,
           COALESCE(qq.tags, sq.tags) as tags,
           COALESCE(
             (SELECT name FROM nremt_categories nc WHERE nc.id::TEXT = ANY(COALESCE(qq.tags, sq.tags))),
             'General'
           ) as category
    FROM practice_exam_questions pq
    LEFT JOIN quiz_questions qq ON pq.question_id = qq.id AND pq.question_type = 'quiz'
    LEFT JOIN standardized_questions sq ON pq.question_id = sq.id AND pq.question_type = 'standardized'
    WHERE pq.session_id = p_session_id
      AND pq.answered_at IS NOT NULL
  LOOP
    -- Update or insert weak area tracking
    INSERT INTO student_weak_areas (
      tenant_id, user_id, category,
      total_questions, correct_count, accuracy_rate,
      last_assessed
    ) VALUES (
      v_session.tenant_id, v_session.user_id, v_question.category,
      1,
      CASE WHEN v_question.is_correct THEN 1 ELSE 0 END,
      CASE WHEN v_question.is_correct THEN 100.0 ELSE 0.0 END,
      NOW()
    )
    ON CONFLICT (user_id, category, subcategory)
    DO UPDATE SET
      total_questions = student_weak_areas.total_questions + 1,
      correct_count = student_weak_areas.correct_count + CASE WHEN v_question.is_correct THEN 1 ELSE 0 END,
      accuracy_rate = (student_weak_areas.correct_count + CASE WHEN v_question.is_correct THEN 1 ELSE 0 END)::DECIMAL /
                      (student_weak_areas.total_questions + 1) * 100,
      is_weak_area = ((student_weak_areas.correct_count + CASE WHEN v_question.is_correct THEN 1 ELSE 0 END)::DECIMAL /
                      (student_weak_areas.total_questions + 1) * 100) < 70,
      last_assessed = NOW(),
      updated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Calculate moderated grade discrepancy
CREATE OR REPLACE FUNCTION check_grade_discrepancy(
  p_moderated_assignment_id UUID,
  p_submission_id UUID
) RETURNS TABLE (
  has_discrepancy BOOLEAN,
  max_difference DECIMAL,
  grades JSONB
) AS $$
DECLARE
  v_threshold DECIMAL;
  v_grades DECIMAL[];
  v_max_diff DECIMAL;
BEGIN
  SELECT discrepancy_threshold INTO v_threshold
  FROM moderated_assignments WHERE id = p_moderated_assignment_id;

  SELECT array_agg(score) INTO v_grades
  FROM moderated_grades
  WHERE moderated_assignment_id = p_moderated_assignment_id
    AND submission_id = p_submission_id
    AND score IS NOT NULL;

  IF array_length(v_grades, 1) < 2 THEN
    RETURN QUERY SELECT FALSE, 0::DECIMAL, '[]'::JSONB;
    RETURN;
  END IF;

  v_max_diff := (SELECT MAX(g) - MIN(g) FROM unnest(v_grades) g);

  RETURN QUERY
  SELECT
    v_max_diff > v_threshold,
    v_max_diff,
    (SELECT jsonb_agg(jsonb_build_object('grader_id', grader_id, 'score', score))
     FROM moderated_grades
     WHERE moderated_assignment_id = p_moderated_assignment_id
       AND submission_id = p_submission_id);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE video_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE breakout_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE breakout_room_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_weak_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE speedgrader_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_comment_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderated_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderated_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderated_final_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti_launches ENABLE ROW LEVEL SECURITY;
ALTER TABLE lti_grades ENABLE ROW LEVEL SECURITY;

-- Video meetings: Users in tenant can view, instructors can manage
CREATE POLICY "View video meetings in tenant"
  ON video_meetings FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Instructors manage video meetings"
  ON video_meetings FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Flashcard decks: Users see own + public/official
CREATE POLICY "View flashcard decks"
  ON flashcard_decks FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (created_by = auth.uid() OR is_public = true OR is_official = true)
  );

CREATE POLICY "Manage own flashcard decks"
  ON flashcard_decks FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (created_by = auth.uid() OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor'))
  );

-- Flashcard progress: Users manage own
CREATE POLICY "Users manage own flashcard progress"
  ON flashcard_progress FOR ALL
  USING (user_id = auth.uid());

-- Practice exams: Users manage own
CREATE POLICY "Users manage own practice sessions"
  ON practice_exam_sessions FOR ALL
  USING (user_id = auth.uid());

-- Podcast series: View in tenant
CREATE POLICY "View podcast series"
  ON podcast_series FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND is_published = true
  );

CREATE POLICY "Instructors manage podcasts"
  ON podcast_series FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- SpeedGrader: Instructors only
CREATE POLICY "Instructors use speedgrader"
  ON speedgrader_sessions FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Check-in zones: Admins manage, all view
CREATE POLICY "View checkin zones"
  ON checkin_zones FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins manage checkin zones"
  ON checkin_zones FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- User check-ins: Users see own, instructors see all
CREATE POLICY "View checkins"
  ON user_checkins FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (user_id = auth.uid() OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor'))
  );

CREATE POLICY "Users create own checkins"
  ON user_checkins FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND user_id = auth.uid()
  );

-- Moderated grading: Instructors only
CREATE POLICY "Instructors manage moderated grading"
  ON moderated_assignments FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- LTI tools: Admins manage
CREATE POLICY "View LTI tools"
  ON lti_tools FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins manage LTI tools"
  ON lti_tools FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update flashcard deck stats
CREATE OR REPLACE FUNCTION update_deck_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE flashcard_decks
    SET card_count = card_count + 1, updated_at = NOW()
    WHERE id = NEW.deck_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE flashcard_decks
    SET card_count = card_count - 1, updated_at = NOW()
    WHERE id = OLD.deck_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_deck_stats
  AFTER INSERT OR DELETE ON flashcards
  FOR EACH ROW EXECUTE FUNCTION update_deck_stats();

-- Update podcast series stats
CREATE OR REPLACE FUNCTION update_podcast_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE podcast_series
    SET
      episode_count = episode_count + 1,
      total_duration_minutes = total_duration_minutes + (NEW.duration_seconds / 60),
      updated_at = NOW()
    WHERE id = NEW.series_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE podcast_series
    SET
      episode_count = episode_count - 1,
      total_duration_minutes = total_duration_minutes - (OLD.duration_seconds / 60),
      updated_at = NOW()
    WHERE id = OLD.series_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_podcast_stats
  AFTER INSERT OR DELETE ON podcast_episodes
  FOR EACH ROW EXECUTE FUNCTION update_podcast_stats();
