-- Add missing indexes identified during schema review
-- All CE tables were created without indexes on their FK/filter columns.
-- clinical_shift_bookings gets a composite index for the my-shifts page.

-- ============================================
-- ce_purchases
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ce_purchases_user_id
  ON ce_purchases(user_id);

CREATE INDEX IF NOT EXISTS idx_ce_purchases_course_id
  ON ce_purchases(course_id);

-- square_payment_id lookup for payment webhooks
CREATE INDEX IF NOT EXISTS idx_ce_purchases_square_payment_id
  ON ce_purchases(square_payment_id)
  WHERE square_payment_id IS NOT NULL;

-- ============================================
-- ce_user_subscriptions
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ce_user_subscriptions_user_id
  ON ce_user_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_ce_user_subscriptions_status_expires
  ON ce_user_subscriptions(status, expires_at);

-- ============================================
-- ce_agency_subscriptions
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ce_agency_subscriptions_agency_id
  ON ce_agency_subscriptions(agency_id);

CREATE INDEX IF NOT EXISTS idx_ce_agency_subscriptions_payment_status
  ON ce_agency_subscriptions(payment_status, expires_at);

-- ============================================
-- ce_discussion_replies
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ce_discussion_replies_discussion_id
  ON ce_discussion_replies(discussion_id);

CREATE INDEX IF NOT EXISTS idx_ce_discussion_replies_user_id
  ON ce_discussion_replies(user_id);

-- ============================================
-- ce_email_log
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ce_email_log_user_id_sent_at
  ON ce_email_log(user_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_ce_email_log_type_sent_at
  ON ce_email_log(email_type, sent_at DESC);

-- ============================================
-- ce_quiz_attempts
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ce_quiz_attempts_enrollment_id
  ON ce_quiz_attempts(enrollment_id);

CREATE INDEX IF NOT EXISTS idx_ce_quiz_attempts_quiz_id
  ON ce_quiz_attempts(quiz_id);

-- ============================================
-- clinical_shift_bookings
-- Composite index for student "my-shifts" queries that filter by status
-- ============================================

CREATE INDEX IF NOT EXISTS idx_clinical_bookings_student_status
  ON clinical_shift_bookings(student_id, status);
