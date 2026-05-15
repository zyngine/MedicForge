-- ============================================
-- CLINICAL PRECEPTOR RATINGS
-- ============================================
CREATE TABLE IF NOT EXISTS clinical_preceptor_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES clinical_shift_bookings(id) ON DELETE SET NULL,
  shift_id uuid REFERENCES clinical_shifts(id) ON DELETE SET NULL,
  site_id uuid REFERENCES clinical_sites(id) ON DELETE SET NULL,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preceptor_name text NOT NULL,
  knowledge_rating int NOT NULL CHECK (knowledge_rating BETWEEN 1 AND 5),
  communication_rating int NOT NULL CHECK (communication_rating BETWEEN 1 AND 5),
  professionalism_rating int NOT NULL CHECK (professionalism_rating BETWEEN 1 AND 5),
  overall_comment text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_preceptor_ratings_tenant ON clinical_preceptor_ratings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_preceptor_ratings_preceptor ON clinical_preceptor_ratings(tenant_id, lower(preceptor_name));
CREATE INDEX IF NOT EXISTS idx_preceptor_ratings_booking ON clinical_preceptor_ratings(booking_id);
ALTER TABLE clinical_preceptor_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members read preceptor ratings"
  ON clinical_preceptor_ratings FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = (SELECT auth.uid())));

CREATE POLICY "Students rate own preceptors"
  ON clinical_preceptor_ratings FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = (SELECT auth.uid()))
    AND student_id = (SELECT auth.uid())
  );

-- ============================================
-- CLINICAL COMPLAINTS
-- ============================================
CREATE TABLE IF NOT EXISTS clinical_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES clinical_shift_bookings(id) ON DELETE SET NULL,
  filed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  filer_role text NOT NULL CHECK (filer_role IN ('student','preceptor','instructor','admin')),
  subject_type text NOT NULL CHECK (subject_type IN ('preceptor','student','site','other')),
  subject_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  subject_name text,
  category text NOT NULL CHECK (category IN ('behavior','safety','attendance','communication','other')),
  description text NOT NULL,
  is_anonymous boolean DEFAULT false,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed','resolved','dismissed')),
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_complaints_tenant_status ON clinical_complaints(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_complaints_filer ON clinical_complaints(filed_by_user_id);
ALTER TABLE clinical_complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instructors and admins read complaints"
  ON clinical_complaints FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = (SELECT auth.uid()))
    AND (SELECT role FROM users WHERE id = (SELECT auth.uid()))::text IN ('admin','instructor')
  );

CREATE POLICY "Filer reads own complaint"
  ON clinical_complaints FOR SELECT
  USING (filed_by_user_id = (SELECT auth.uid()));

CREATE POLICY "Tenant members file complaints"
  ON clinical_complaints FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = (SELECT auth.uid()))
    AND filed_by_user_id = (SELECT auth.uid())
  );

CREATE POLICY "Instructors and admins update complaints"
  ON clinical_complaints FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = (SELECT auth.uid()))
    AND (SELECT role FROM users WHERE id = (SELECT auth.uid()))::text IN ('admin','instructor')
  );

-- Threshold trigger: low average preceptor rating (avg < 3.0 over last 5 shifts)
CREATE OR REPLACE FUNCTION check_preceptor_rating_threshold()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_avg numeric;
  v_count int;
  v_course_id uuid;
  v_instructor_id uuid;
  v_link text;
BEGIN
  SELECT
    AVG((knowledge_rating + communication_rating + professionalism_rating) / 3.0),
    COUNT(*)
  INTO v_avg, v_count
  FROM (
    SELECT knowledge_rating, communication_rating, professionalism_rating
    FROM clinical_preceptor_ratings
    WHERE tenant_id = NEW.tenant_id
      AND lower(preceptor_name) = lower(NEW.preceptor_name)
    ORDER BY created_at DESC
    LIMIT 5
  ) recent;

  IF v_count >= 3 AND v_avg < 3.0 THEN
    v_link := '/instructor/clinical/preceptor-performance';

    SELECT s.course_id, c.instructor_id INTO v_course_id, v_instructor_id
    FROM clinical_shift_bookings b
    JOIN clinical_shifts s ON s.id = b.shift_id
    LEFT JOIN courses c ON c.id = s.course_id
    WHERE b.id = NEW.booking_id LIMIT 1;

    IF v_instructor_id IS NOT NULL THEN
      INSERT INTO notifications (tenant_id, user_id, title, message, link)
      VALUES (NEW.tenant_id, v_instructor_id, 'Preceptor flagged: low ratings',
        NEW.preceptor_name || ' has an average rating of ' || ROUND(v_avg, 1) || '/5 across the last ' || v_count || ' shifts.',
        v_link);
    END IF;

    IF v_course_id IS NOT NULL THEN
      INSERT INTO notifications (tenant_id, user_id, title, message, link)
      SELECT NEW.tenant_id, ci.instructor_id, 'Preceptor flagged: low ratings',
        NEW.preceptor_name || ' has an average rating of ' || ROUND(v_avg, 1) || '/5 across the last ' || v_count || ' shifts.',
        v_link
      FROM course_instructors ci
      WHERE ci.course_id = v_course_id AND ci.instructor_id IS DISTINCT FROM v_instructor_id;
    END IF;

    INSERT INTO notifications (tenant_id, user_id, title, message, link)
    SELECT NEW.tenant_id, u.id, 'Preceptor flagged: low ratings',
      NEW.preceptor_name || ' has an average rating of ' || ROUND(v_avg, 1) || '/5 across the last ' || v_count || ' shifts.',
      v_link
    FROM users u
    WHERE u.tenant_id = NEW.tenant_id AND u.role::text = 'admin' AND u.id IS DISTINCT FROM v_instructor_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_preceptor_rating_threshold_trigger
  AFTER INSERT ON clinical_preceptor_ratings
  FOR EACH ROW EXECUTE FUNCTION check_preceptor_rating_threshold();

-- Notification trigger: every complaint goes to course instructors + tenant admins
CREATE OR REPLACE FUNCTION notify_on_clinical_complaint()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_instructor_id uuid;
  v_subject_label text;
BEGIN
  v_subject_label := CASE
    WHEN NEW.subject_type = 'preceptor' THEN 'preceptor ' || COALESCE(NEW.subject_name, 'unknown')
    WHEN NEW.subject_type = 'student' THEN 'a student'
    WHEN NEW.subject_type = 'site' THEN 'a clinical site'
    ELSE 'a clinical issue'
  END;

  IF NEW.course_id IS NOT NULL THEN
    SELECT instructor_id INTO v_instructor_id FROM courses WHERE id = NEW.course_id;
    IF v_instructor_id IS NOT NULL THEN
      INSERT INTO notifications (tenant_id, user_id, title, message, link)
      VALUES (NEW.tenant_id, v_instructor_id, 'New clinical complaint',
        'A ' || NEW.category || ' complaint about ' || v_subject_label || ' was filed.',
        '/instructor/clinical/complaints/' || NEW.id::text);
    END IF;

    INSERT INTO notifications (tenant_id, user_id, title, message, link)
    SELECT NEW.tenant_id, ci.instructor_id, 'New clinical complaint',
      'A ' || NEW.category || ' complaint about ' || v_subject_label || ' was filed.',
      '/instructor/clinical/complaints/' || NEW.id::text
    FROM course_instructors ci
    WHERE ci.course_id = NEW.course_id AND ci.instructor_id IS DISTINCT FROM v_instructor_id;
  END IF;

  INSERT INTO notifications (tenant_id, user_id, title, message, link)
  SELECT NEW.tenant_id, u.id, 'New clinical complaint',
    'A ' || NEW.category || ' complaint about ' || v_subject_label || ' was filed.',
    '/instructor/clinical/complaints/' || NEW.id::text
  FROM users u
  WHERE u.tenant_id = NEW.tenant_id AND u.role::text = 'admin' AND u.id IS DISTINCT FROM v_instructor_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_clinical_complaint_trigger
  AFTER INSERT ON clinical_complaints
  FOR EACH ROW EXECUTE FUNCTION notify_on_clinical_complaint();
