-- =============================================================================
-- Migration: 20260915000001_student_vital_signs.sql
-- Description: A vital-signs log a student can add to outside a patient contact,
--              and a count that treats both places as one total.
--
-- Programs commonly require a fixed number of documented vital sign sets (50 is
-- the number this request came with) before a student is signed off. Two things
-- were missing:
--
--   * Vitals could only be recorded inside a patient contact report
--     (clinical_patient_contacts.vitals, a JSONB array of sets). Sets taken in
--     lab, on a ride-along with no report, or on a classmate had nowhere to go.
--
--   * Nothing counted them. courses.required_patient_contacts and
--     required_clinical_hours exist as columns but are referenced nowhere in the
--     app; the student clinical tracker hardcodes 48 hours / 30 contacts with a
--     TODO. So a requirement expressed as a number had no number to compare to.
--
-- student_vital_signs holds the standalone sets. Counting sums it together with
-- the sets already inside the student's patient contacts, so a student who
-- documented eight sets across two patient contacts is eight of the way there
-- and does not re-key them.
--
-- Deliberately not included: a preceptor sign-off step. These are self-logged and
-- instructors can see them; adding a verification workflow would gate the count
-- behind someone else's inbox, which is not what was asked for.
-- =============================================================================

CREATE TABLE IF NOT EXISTS student_vital_signs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Optional: a set taken in lab does not necessarily belong to a course, and
    -- the program-level total is what the requirement is about.
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,

    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    context TEXT NOT NULL DEFAULT 'lab',      -- lab | clinical | field | other
    setting TEXT,                             -- free text: "Station 4", "Sim lab"

    -- Who it was taken on, kept deliberately non-identifying: these are practice
    -- sets on classmates and patients, and a name here would make the table PHI.
    subject_type TEXT,                        -- classmate | patient | volunteer | manikin
    subject_age_range TEXT,

    -- Measurements. All nullable: a set taken with no thermometer is still a set,
    -- and refusing to store it would just push students into faking a number.
    -- Ranges are plausibility bounds, wide enough not to reject real readings.
    bp_systolic INTEGER CHECK (bp_systolic IS NULL OR bp_systolic BETWEEN 0 AND 300),
    bp_diastolic INTEGER CHECK (bp_diastolic IS NULL OR bp_diastolic BETWEEN 0 AND 250),
    bp_method TEXT,                           -- auscultated | palpated | monitor
    pulse INTEGER CHECK (pulse IS NULL OR pulse BETWEEN 0 AND 350),
    pulse_quality TEXT,                       -- strong | weak | thready | irregular
    respiratory_rate INTEGER CHECK (respiratory_rate IS NULL OR respiratory_rate BETWEEN 0 AND 100),
    spo2 INTEGER CHECK (spo2 IS NULL OR spo2 BETWEEN 0 AND 100),
    temperature NUMERIC(4,1) CHECK (temperature IS NULL OR temperature BETWEEN 70 AND 115),
    blood_glucose INTEGER CHECK (blood_glucose IS NULL OR blood_glucose BETWEEN 0 AND 1000),
    gcs INTEGER CHECK (gcs IS NULL OR gcs BETWEEN 3 AND 15),
    pain_scale INTEGER CHECK (pain_scale IS NULL OR pain_scale BETWEEN 0 AND 10),
    skin TEXT,
    pupils TEXT,

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- A row with nothing measured in it is not a vital sign set, and counting one
    -- towards a 50-set requirement would make the requirement meaningless.
    CONSTRAINT student_vital_signs_has_a_measurement CHECK (
        bp_systolic IS NOT NULL
        OR bp_diastolic IS NOT NULL
        OR pulse IS NOT NULL
        OR respiratory_rate IS NOT NULL
        OR spo2 IS NOT NULL
        OR temperature IS NOT NULL
        OR blood_glucose IS NOT NULL
        OR gcs IS NOT NULL
    )
);

COMMENT ON TABLE student_vital_signs IS
  'Vital sign sets a student logged outside a patient contact report. Counted '
  'together with clinical_patient_contacts.vitals by get_student_vitals_progress().';

CREATE INDEX IF NOT EXISTS idx_student_vital_signs_student
    ON student_vital_signs (student_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_vital_signs_tenant
    ON student_vital_signs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_vital_signs_course
    ON student_vital_signs (course_id) WHERE course_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_student_vital_signs()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS student_vital_signs_updated_at ON student_vital_signs;
CREATE TRIGGER student_vital_signs_updated_at
    BEFORE UPDATE ON student_vital_signs
    FOR EACH ROW EXECUTE FUNCTION touch_student_vital_signs();

-- ---------------------------------------------------------------------------
-- RLS: a student owns their own log; staff in the tenant can read it.
--
-- Split into per-command policies rather than one FOR ALL so the staff read
-- cannot become a staff write -- an instructor adding sets to a student's total
-- is exactly what "self-logged" rules out.
-- ---------------------------------------------------------------------------
ALTER TABLE student_vital_signs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students manage their own vital signs" ON student_vital_signs;
CREATE POLICY "Students manage their own vital signs" ON student_vital_signs
    FOR ALL
    USING (student_id = auth.uid())
    WITH CHECK (
        student_id = auth.uid()
        AND tenant_id = get_user_tenant_id()
    );

DROP POLICY IF EXISTS "Staff can view vital signs in their tenant" ON student_vital_signs;
CREATE POLICY "Staff can view vital signs in their tenant" ON student_vital_signs
    FOR SELECT
    USING (
        tenant_id = get_user_tenant_id()
        AND get_user_role()::TEXT IN ('admin', 'instructor')
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON student_vital_signs TO authenticated;

-- ---------------------------------------------------------------------------
-- The target, per course.
-- ---------------------------------------------------------------------------
ALTER TABLE courses ADD COLUMN IF NOT EXISTS required_vital_signs INTEGER;

COMMENT ON COLUMN courses.required_vital_signs IS
  'How many documented vital sign sets this course requires. NULL means no requirement.';

-- ---------------------------------------------------------------------------
-- How many sets has a student documented, and how many do they need?
--
-- Counts both places vitals live:
--   * rows in student_vital_signs
--   * entries in each clinical_patient_contacts.vitals array
--
-- jsonb_typeof is checked because the column is a bare JSONB defaulting to '[]'
-- with nothing stopping an object being written there; jsonb_array_length would
-- raise on one and take the whole progress panel down with it.
--
-- The requirement is the largest required_vital_signs across the student's active
-- enrollments. A student in two courses that each ask for 50 sets has not been
-- asked for 100 -- it is one program requirement, expressed by whichever course
-- carries it.
--
-- p_student_id defaults to the caller, which is how a student uses it. Passing
-- someone else requires being an admin or instructor in their tenant.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_student_vitals_progress(p_student_id UUID DEFAULT NULL)
RETURNS TABLE (
    student_id UUID,
    logged_standalone BIGINT,
    logged_in_patient_contacts BIGINT,
    logged_total BIGINT,
    required_total INTEGER,
    remaining INTEGER
) AS $$
DECLARE
    v_target UUID;
    v_caller_tenant UUID;
    v_caller_role TEXT;
    v_target_tenant UUID;
BEGIN
    v_target := COALESCE(p_student_id, auth.uid());
    IF v_target IS NULL THEN
        RETURN;
    END IF;

    v_caller_tenant := get_user_tenant_id();
    v_caller_role := get_user_role()::TEXT;

    SELECT u.tenant_id INTO v_target_tenant FROM users u WHERE u.id = v_target;

    IF v_target <> auth.uid() THEN
        IF v_caller_tenant IS NULL
           OR v_target_tenant IS DISTINCT FROM v_caller_tenant
           OR v_caller_role NOT IN ('admin', 'instructor') THEN
            RETURN;
        END IF;
    END IF;

    RETURN QUERY
    WITH standalone AS (
        SELECT COUNT(*)::BIGINT AS n
        FROM student_vital_signs v
        WHERE v.student_id = v_target
    ),
    from_contacts AS (
        SELECT COALESCE(SUM(
            CASE WHEN jsonb_typeof(pc.vitals) = 'array'
                 THEN jsonb_array_length(pc.vitals)
                 ELSE 0 END
        ), 0)::BIGINT AS n
        FROM clinical_patient_contacts pc
        WHERE pc.student_id = v_target
    ),
    target AS (
        SELECT MAX(c.required_vital_signs) AS n
        FROM enrollments e
        JOIN courses c ON c.id = e.course_id
        WHERE e.student_id = v_target
          AND e.status = 'active'
          AND c.required_vital_signs IS NOT NULL
    )
    SELECT
        v_target,
        s.n,
        f.n,
        s.n + f.n,
        t.n,
        CASE WHEN t.n IS NULL THEN NULL
             ELSE GREATEST(t.n - (s.n + f.n), 0)::INTEGER END
    FROM standalone s, from_contacts f, target t;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- Who in a course is short, for an instructor.
--
-- One row per actively enrolled student. Ordered by how far behind they are, so
-- the answer to "who do I need to chase" is the top of the list.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_course_vitals_roster(p_course_id UUID)
RETURNS TABLE (
    student_id UUID,
    full_name TEXT,
    email TEXT,
    logged_standalone BIGINT,
    logged_in_patient_contacts BIGINT,
    logged_total BIGINT,
    required_total INTEGER,
    remaining INTEGER,
    last_logged_at TIMESTAMPTZ
) AS $$
DECLARE
    v_tenant_id UUID;
    v_role TEXT;
    v_required INTEGER;
BEGIN
    v_tenant_id := get_user_tenant_id();
    v_role := get_user_role()::TEXT;

    IF v_tenant_id IS NULL OR v_role NOT IN ('admin', 'instructor') THEN
        RETURN;
    END IF;

    SELECT c.required_vital_signs INTO v_required
    FROM courses c
    WHERE c.id = p_course_id AND c.tenant_id = v_tenant_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        -- users.full_name/email are VARCHAR(255); RETURN QUERY checks the result
        -- structure by exact type, so cast rather than rely on coercion.
        u.full_name::TEXT,
        u.email::TEXT,
        counts.standalone_n,
        counts.contact_n,
        counts.standalone_n + counts.contact_n,
        v_required,
        CASE WHEN v_required IS NULL THEN NULL
             ELSE GREATEST(v_required - (counts.standalone_n + counts.contact_n), 0)::INTEGER END,
        counts.last_at
    FROM enrollments e
    JOIN users u ON u.id = e.student_id
    CROSS JOIN LATERAL (
        SELECT
            (SELECT COUNT(*)::BIGINT FROM student_vital_signs v WHERE v.student_id = u.id)
                AS standalone_n,
            (SELECT COALESCE(SUM(
                 CASE WHEN jsonb_typeof(pc.vitals) = 'array'
                      THEN jsonb_array_length(pc.vitals)
                      ELSE 0 END
             ), 0)::BIGINT
             FROM clinical_patient_contacts pc WHERE pc.student_id = u.id)
                AS contact_n,
            (SELECT MAX(v.recorded_at) FROM student_vital_signs v WHERE v.student_id = u.id)
                AS last_at
    ) counts
    WHERE e.course_id = p_course_id
      AND e.status = 'active'
      AND u.tenant_id = v_tenant_id
    ORDER BY
        CASE WHEN v_required IS NULL THEN 0
             ELSE GREATEST(v_required - (counts.standalone_n + counts.contact_n), 0) END DESC,
        u.full_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION get_student_vitals_progress(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_course_vitals_roster(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_student_vitals_progress(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_course_vitals_roster(UUID) TO authenticated;
