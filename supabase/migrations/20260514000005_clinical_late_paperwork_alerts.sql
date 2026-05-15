-- Per-shift paperwork deadline (default 24 hours after shift end)
ALTER TABLE clinical_shifts ADD COLUMN IF NOT EXISTS paperwork_due_hours_after_shift integer DEFAULT 24;

-- Track whether each patient contact was submitted late + the deadline that applied
ALTER TABLE clinical_patient_contacts ADD COLUMN IF NOT EXISTS was_submitted_late boolean DEFAULT false;
ALTER TABLE clinical_patient_contacts ADD COLUMN IF NOT EXISTS submitted_due_at timestamptz;

-- Trigger: compute lateness on insert and fan out instructor notifications
CREATE OR REPLACE FUNCTION check_late_paperwork_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_due_at timestamptz;
  v_shift record;
  v_due_hours int;
  v_student_name text;
  v_shift_title text;
BEGIN
  IF NEW.booking_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    s.shift_date,
    s.end_time,
    s.title AS shift_title,
    s.paperwork_due_hours_after_shift,
    s.course_id,
    c.instructor_id
  INTO v_shift
  FROM clinical_shift_bookings b
  JOIN clinical_shifts s ON s.id = b.shift_id
  LEFT JOIN courses c ON c.id = s.course_id
  WHERE b.id = NEW.booking_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_due_hours := COALESCE(v_shift.paperwork_due_hours_after_shift, 24);
  v_due_at := (v_shift.shift_date + v_shift.end_time)::timestamptz
              + (v_due_hours || ' hours')::interval;

  NEW.submitted_due_at := v_due_at;
  NEW.was_submitted_late := (now() > v_due_at);

  IF NEW.was_submitted_late THEN
    SELECT full_name INTO v_student_name FROM users WHERE id = NEW.student_id;
    v_shift_title := COALESCE(v_shift.shift_title, 'clinical');

    IF v_shift.instructor_id IS NOT NULL THEN
      INSERT INTO notifications (tenant_id, user_id, title, message, link)
      VALUES (
        NEW.tenant_id,
        v_shift.instructor_id,
        'Late clinical paperwork',
        COALESCE(v_student_name, 'A student') || ' submitted ' || v_shift_title ||
        ' paperwork after the ' || v_due_hours || '-hour deadline.',
        '/instructor/clinical/patient-contacts/' || NEW.id::text
      );
    END IF;

    IF v_shift.course_id IS NOT NULL THEN
      INSERT INTO notifications (tenant_id, user_id, title, message, link)
      SELECT
        NEW.tenant_id,
        ci.instructor_id,
        'Late clinical paperwork',
        COALESCE(v_student_name, 'A student') || ' submitted ' || v_shift_title ||
        ' paperwork after the ' || v_due_hours || '-hour deadline.',
        '/instructor/clinical/patient-contacts/' || NEW.id::text
      FROM course_instructors ci
      WHERE ci.course_id = v_shift.course_id
        AND ci.instructor_id IS DISTINCT FROM v_shift.instructor_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_late_paperwork_submission_trigger ON clinical_patient_contacts;
CREATE TRIGGER check_late_paperwork_submission_trigger
  BEFORE INSERT ON clinical_patient_contacts
  FOR EACH ROW
  EXECUTE FUNCTION check_late_paperwork_submission();
