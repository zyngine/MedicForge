-- Private feedback channel: notes the preceptor/evaluator wants the
-- instructor to see but NOT the student. The existing preceptor_feedback
-- column is student-visible; this one is instructor-only.
ALTER TABLE clinical_patient_contacts
  ADD COLUMN IF NOT EXISTS instructor_private_notes text;
