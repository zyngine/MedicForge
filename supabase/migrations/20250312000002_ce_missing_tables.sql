-- ============================================================
-- CE Platform: Missing tables referenced by committee pages
-- ============================================================

-- Committee document library
CREATE TABLE IF NOT EXISTS ce_committee_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  category        text NOT NULL,
  document_url    text NOT NULL,
  description     text,
  version         text,
  effective_date  date,
  review_date     date,
  uploaded_by     text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE ce_committee_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE admins can manage committee documents"
  ON ce_committee_documents FOR ALL
  USING (get_ce_user_role() = 'admin');

CREATE POLICY "CE admins can insert committee documents"
  ON ce_committee_documents FOR INSERT
  WITH CHECK (get_ce_user_role() = 'admin');

-- ----------------------------------------------------------------

-- Committee course review decisions (one per course review cycle)
-- Separate from ce_committee_course_reviews (the review queue/assignment)
CREATE TABLE IF NOT EXISTS ce_committee_reviews (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id                 uuid NOT NULL REFERENCES ce_courses(id) ON DELETE CASCADE,
  decision                  text,   -- approved | approved_with_revisions | tabled | rejected
  votes_for                 int,
  votes_against             int,
  votes_abstain             int,
  medical_director_approved boolean DEFAULT false,
  notes                     text,
  revisions_required        text,
  reviewed_at               timestamptz,
  created_at                timestamptz DEFAULT now()
);

ALTER TABLE ce_committee_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE admins can manage course reviews"
  ON ce_committee_reviews FOR ALL
  USING (get_ce_user_role() = 'admin');

CREATE POLICY "CE admins can insert course reviews"
  ON ce_committee_reviews FOR INSERT
  WITH CHECK (get_ce_user_role() = 'admin');

-- Index for fast lookup by course
CREATE INDEX IF NOT EXISTS idx_ce_committee_reviews_course_id
  ON ce_committee_reviews (course_id);
