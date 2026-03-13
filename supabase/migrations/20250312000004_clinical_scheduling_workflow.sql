-- Clinical Scheduling Workflow: POC Approval + Calendar Export
-- Adds approval workflow layer on top of existing direct-booking system
--
-- IMPORTANT: Apply via Supabase Dashboard SQL editor (not supabase db push).
-- PostgreSQL requires ALTER TYPE ... ADD VALUE to commit before the new values
-- can be used in views/functions within the same transaction.
-- In the SQL editor, paste the entire file — statements run in auto-commit mode.

-- ============================================
-- EXTEND booking_status ENUM
-- ============================================

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'pending_poc_approval';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'poc_approved';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'poc_denied';

-- ============================================
-- NEW COLUMNS ON clinical_shift_bookings
-- ============================================

ALTER TABLE clinical_shift_bookings
  ADD COLUMN IF NOT EXISTS request_notes TEXT,
  ADD COLUMN IF NOT EXISTS poc_response_notes TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by TEXT,   -- 'student' | 'instructor' | 'poc' | 'system'
  ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ;

-- ============================================
-- clinical_poc_tokens
-- One-time tokens for POC approve/deny links
-- ============================================

CREATE TABLE IF NOT EXISTS clinical_poc_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES clinical_shift_bookings(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token UUID UNIQUE DEFAULT gen_random_uuid(),
  action_taken TEXT,            -- 'approved' | 'denied' | NULL
  action_taken_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poc_tokens_token ON clinical_poc_tokens(token);
CREATE INDEX IF NOT EXISTS idx_poc_tokens_booking ON clinical_poc_tokens(booking_id);

-- RLS: service role only (tokens are never queried directly by clients)
ALTER TABLE clinical_poc_tokens ENABLE ROW LEVEL SECURITY;

-- No client-facing policies — all access goes through API routes using admin client

-- ============================================
-- clinical_booking_audit_log
-- Immutable audit trail of all booking state changes
-- ============================================

CREATE TABLE IF NOT EXISTS clinical_booking_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES clinical_shift_bookings(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  action TEXT NOT NULL,         -- 'requested' | 'poc_approved' | 'poc_denied' |
                                --  'cancelled_by_student' | 'cancelled_by_instructor' |
                                --  'reminder_sent' | 'checked_in' | 'checked_out'
  actor_type TEXT,              -- 'student' | 'poc' | 'instructor' | 'system'
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_audit_booking ON clinical_booking_audit_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_audit_tenant ON clinical_booking_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_booking_audit_created ON clinical_booking_audit_log(created_at);

ALTER TABLE clinical_booking_audit_log ENABLE ROW LEVEL SECURITY;

-- Instructors and admins can view audit logs for their tenant
CREATE POLICY "Instructors can view audit logs"
  ON clinical_booking_audit_log FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = (SELECT auth.uid())
        AND role IN ('instructor', 'admin')
    )
  );

-- ============================================
-- calendar_subscriptions
-- Stable tokens for webcal:// ICS subscriptions
-- ============================================

CREATE TABLE IF NOT EXISTS calendar_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token UUID UNIQUE DEFAULT gen_random_uuid(),
  calendar_type TEXT NOT NULL DEFAULT 'clinical_shifts',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,
  UNIQUE(user_id, calendar_type)
);

CREATE INDEX IF NOT EXISTS idx_calendar_subs_token ON calendar_subscriptions(token);
CREATE INDEX IF NOT EXISTS idx_calendar_subs_user ON calendar_subscriptions(user_id);

ALTER TABLE calendar_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users manage their own subscriptions
CREATE POLICY "Users manage own calendar subscriptions"
  ON calendar_subscriptions FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================
-- request_clinical_shift() PL/pgSQL FUNCTION
-- Like book_clinical_shift() but creates pending_poc_approval status
-- Counts pending_poc_approval + poc_approved + booked toward capacity
-- ============================================

CREATE OR REPLACE FUNCTION request_clinical_shift(
  p_shift_id UUID,
  p_student_id UUID,
  p_tenant_id UUID,
  p_request_notes TEXT DEFAULT NULL
) RETURNS clinical_shift_bookings AS $$
DECLARE
  v_shift clinical_shifts;
  v_booking_count INTEGER;
  v_booking clinical_shift_bookings;
BEGIN
  -- Lock the shift row to prevent race conditions
  SELECT * INTO v_shift
  FROM clinical_shifts
  WHERE id = p_shift_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;

  IF NOT v_shift.is_active THEN
    RAISE EXCEPTION 'Shift is no longer available';
  END IF;

  IF v_shift.shift_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot request past shifts';
  END IF;

  -- Count existing requests/bookings (exclude cancelled and denied)
  SELECT COUNT(*) INTO v_booking_count
  FROM clinical_shift_bookings
  WHERE shift_id = p_shift_id
    AND status NOT IN ('cancelled', 'poc_denied');

  IF v_booking_count >= v_shift.capacity THEN
    RAISE EXCEPTION 'Shift is fully booked or all slots have pending requests';
  END IF;

  -- Check if student already has an active request/booking for this shift
  IF EXISTS (
    SELECT 1 FROM clinical_shift_bookings
    WHERE shift_id = p_shift_id
      AND student_id = p_student_id
      AND status NOT IN ('cancelled', 'poc_denied')
  ) THEN
    RAISE EXCEPTION 'You already have an active request or booking for this shift';
  END IF;

  -- Create the pending booking
  INSERT INTO clinical_shift_bookings (
    tenant_id, shift_id, student_id, status, requested_at, request_notes, booked_at
  ) VALUES (
    p_tenant_id, p_shift_id, p_student_id, 'pending_poc_approval', NOW(), p_request_notes, NOW()
  ) RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- UPDATE available_clinical_shifts VIEW
-- Include pending/approved in capacity counts
-- ============================================

CREATE OR REPLACE VIEW available_clinical_shifts AS
SELECT
  cs.*,
  s.name as site_name,
  s.site_type,
  s.address as site_address,
  s.city as site_city,
  s.state as site_state,
  COUNT(csb.id) FILTER (
    WHERE csb.status NOT IN ('cancelled', 'poc_denied')
  ) as booked_count,
  cs.capacity - COUNT(csb.id) FILTER (
    WHERE csb.status NOT IN ('cancelled', 'poc_denied')
  ) as available_slots,
  CASE
    WHEN COUNT(csb.id) FILTER (
      WHERE csb.status NOT IN ('cancelled', 'poc_denied')
    ) >= cs.capacity THEN false
    ELSE true
  END as is_available
FROM clinical_shifts cs
JOIN clinical_sites s ON cs.site_id = s.id
LEFT JOIN clinical_shift_bookings csb ON cs.id = csb.shift_id
WHERE cs.is_active = true
  AND cs.shift_date >= CURRENT_DATE
  AND s.is_active = true
GROUP BY cs.id, s.id;
