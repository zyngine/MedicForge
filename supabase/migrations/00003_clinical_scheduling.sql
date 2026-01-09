-- MedicForge Clinical Scheduling & Documentation System
-- ESO-style clinical scheduling with NREMT-focused patient documentation

-- ============================================
-- NEW ENUMS
-- ============================================

-- Clinical site types
CREATE TYPE clinical_site_type AS ENUM (
    'hospital',
    'ambulance_service',
    'fire_department',
    'urgent_care',
    'other'
);

-- Booking status for clinical shifts
CREATE TYPE booking_status AS ENUM (
    'booked',
    'completed',
    'cancelled',
    'no_show'
);

-- Patient age ranges per NREMT categories
CREATE TYPE patient_age_range AS ENUM (
    'neonate',      -- 0-1 month
    'infant',       -- 1 month - 1 year
    'toddler',      -- 1-3 years
    'preschool',    -- 3-5 years
    'school_age',   -- 6-12 years
    'adolescent',   -- 13-17 years
    'adult',        -- 18-64 years
    'geriatric'     -- 65+ years
);

-- ============================================
-- CLINICAL SITES TABLE
-- ============================================

CREATE TABLE clinical_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    site_type clinical_site_type DEFAULT 'other',
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    phone VARCHAR(50),
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    preceptors JSONB DEFAULT '[]',  -- Array of {name, credentials, phone}
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CLINICAL SHIFTS TABLE
-- ============================================

CREATE TABLE clinical_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES clinical_sites(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,  -- Optional: limit to specific course
    title VARCHAR(255) NOT NULL,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INTEGER DEFAULT 1,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CLINICAL SHIFT BOOKINGS TABLE
-- ============================================

CREATE TABLE clinical_shift_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES clinical_shifts(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status booking_status DEFAULT 'booked',
    booked_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    hours_completed DECIMAL(4,2),
    preceptor_name VARCHAR(255),
    preceptor_signature TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shift_id, student_id)  -- One booking per student per shift
);

-- ============================================
-- CLINICAL PATIENT CONTACTS TABLE
-- ============================================

CREATE TABLE clinical_patient_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES clinical_shift_bookings(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,

    -- Patient Demographics (NREMT requirements)
    patient_age_range patient_age_range NOT NULL,
    patient_gender VARCHAR(20),

    -- Call Information
    call_type VARCHAR(50),                -- 911/IFT/Standby
    call_nature VARCHAR(50),              -- Emergency/Non-emergency
    dispatch_complaint TEXT,
    chief_complaint TEXT,

    -- Assessment
    primary_impression TEXT,              -- What you think is wrong
    secondary_impression TEXT,
    level_of_consciousness VARCHAR(50),   -- AVPU
    mental_status TEXT,

    -- Vitals (JSONB for multiple sets)
    vitals JSONB DEFAULT '[]',            -- Array of {time, bp_systolic, bp_diastolic, pulse, resp, spo2, temp, gcs, pain}

    -- Interventions/Skills Performed
    skills_performed JSONB DEFAULT '[]',  -- Array of skill names/IDs
    medications_given JSONB DEFAULT '[]', -- Array of {medication, dose, route, time}
    procedures JSONB DEFAULT '[]',        -- IV access, airway management, etc.

    -- Disposition
    disposition VARCHAR(100),             -- Transported, Refused, etc.
    transport_destination VARCHAR(255),
    transport_mode VARCHAR(50),           -- ALS/BLS/Ground/Air

    -- Student Role
    was_team_lead BOOLEAN DEFAULT false,
    role_description TEXT,

    -- Documentation
    narrative TEXT,                       -- Free-text patient care report
    preceptor_feedback TEXT,
    preceptor_signature TEXT,

    -- Verification
    verification_status verification_status DEFAULT 'pending',
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Clinical Sites
CREATE INDEX idx_clinical_sites_tenant ON clinical_sites(tenant_id);
CREATE INDEX idx_clinical_sites_active ON clinical_sites(tenant_id, is_active);
CREATE INDEX idx_clinical_sites_type ON clinical_sites(site_type);

-- Clinical Shifts
CREATE INDEX idx_clinical_shifts_site ON clinical_shifts(site_id);
CREATE INDEX idx_clinical_shifts_date ON clinical_shifts(shift_date);
CREATE INDEX idx_clinical_shifts_course ON clinical_shifts(course_id);
CREATE INDEX idx_clinical_shifts_tenant ON clinical_shifts(tenant_id);
CREATE INDEX idx_clinical_shifts_active ON clinical_shifts(tenant_id, is_active, shift_date);

-- Clinical Shift Bookings
CREATE INDEX idx_clinical_bookings_shift ON clinical_shift_bookings(shift_id);
CREATE INDEX idx_clinical_bookings_student ON clinical_shift_bookings(student_id);
CREATE INDEX idx_clinical_bookings_tenant ON clinical_shift_bookings(tenant_id);
CREATE INDEX idx_clinical_bookings_status ON clinical_shift_bookings(status);

-- Clinical Patient Contacts
CREATE INDEX idx_patient_contacts_booking ON clinical_patient_contacts(booking_id);
CREATE INDEX idx_patient_contacts_student ON clinical_patient_contacts(student_id);
CREATE INDEX idx_patient_contacts_tenant ON clinical_patient_contacts(tenant_id);
CREATE INDEX idx_patient_contacts_course ON clinical_patient_contacts(course_id);
CREATE INDEX idx_patient_contacts_verification ON clinical_patient_contacts(verification_status);
CREATE INDEX idx_patient_contacts_age ON clinical_patient_contacts(patient_age_range);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

CREATE TRIGGER update_clinical_sites_updated_at
    BEFORE UPDATE ON clinical_sites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinical_shifts_updated_at
    BEFORE UPDATE ON clinical_shifts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinical_bookings_updated_at
    BEFORE UPDATE ON clinical_shift_bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_contacts_updated_at
    BEFORE UPDATE ON clinical_patient_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ATOMIC BOOKING FUNCTION
-- ============================================

-- This function handles booking a clinical shift with row-level locking
-- to prevent race conditions when multiple students try to book the same shift
CREATE OR REPLACE FUNCTION book_clinical_shift(
    p_shift_id UUID,
    p_student_id UUID,
    p_tenant_id UUID
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

    -- Check if shift is in the future
    IF v_shift.shift_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'Cannot book past shifts';
    END IF;

    -- Count existing bookings (excluding cancelled)
    SELECT COUNT(*) INTO v_booking_count
    FROM clinical_shift_bookings
    WHERE shift_id = p_shift_id
      AND status != 'cancelled';

    IF v_booking_count >= v_shift.capacity THEN
        RAISE EXCEPTION 'Shift is fully booked';
    END IF;

    -- Check if student already booked this shift
    IF EXISTS (
        SELECT 1 FROM clinical_shift_bookings
        WHERE shift_id = p_shift_id
          AND student_id = p_student_id
          AND status != 'cancelled'
    ) THEN
        RAISE EXCEPTION 'You have already booked this shift';
    END IF;

    -- Create the booking
    INSERT INTO clinical_shift_bookings (
        tenant_id, shift_id, student_id, status, booked_at
    ) VALUES (
        p_tenant_id, p_shift_id, p_student_id, 'booked', NOW()
    ) RETURNING * INTO v_booking;

    RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- CANCEL BOOKING FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION cancel_clinical_booking(
    p_booking_id UUID,
    p_student_id UUID,
    p_tenant_id UUID,
    p_reason TEXT DEFAULT NULL
) RETURNS clinical_shift_bookings AS $$
DECLARE
    v_booking clinical_shift_bookings;
    v_shift clinical_shifts;
BEGIN
    -- Get and lock the booking
    SELECT * INTO v_booking
    FROM clinical_shift_bookings
    WHERE id = p_booking_id
      AND tenant_id = p_tenant_id
      AND student_id = p_student_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    IF v_booking.status != 'booked' THEN
        RAISE EXCEPTION 'Can only cancel bookings with status booked';
    END IF;

    -- Get the shift to check date
    SELECT * INTO v_shift
    FROM clinical_shifts
    WHERE id = v_booking.shift_id;

    -- Optionally check if shift hasn't started yet
    IF v_shift.shift_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'Cannot cancel past bookings';
    END IF;

    -- Update the booking
    UPDATE clinical_shift_bookings
    SET status = 'cancelled',
        cancelled_at = NOW(),
        cancellation_reason = p_reason
    WHERE id = p_booking_id
    RETURNING * INTO v_booking;

    RETURN v_booking;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VIEW: Available Shifts
-- ============================================

CREATE OR REPLACE VIEW available_clinical_shifts AS
SELECT
    cs.*,
    s.name as site_name,
    s.site_type,
    s.address as site_address,
    s.city as site_city,
    s.state as site_state,
    COUNT(csb.id) FILTER (WHERE csb.status != 'cancelled') as booked_count,
    cs.capacity - COUNT(csb.id) FILTER (WHERE csb.status != 'cancelled') as available_slots,
    CASE
        WHEN COUNT(csb.id) FILTER (WHERE csb.status != 'cancelled') >= cs.capacity THEN false
        ELSE true
    END as is_available
FROM clinical_shifts cs
JOIN clinical_sites s ON cs.site_id = s.id
LEFT JOIN clinical_shift_bookings csb ON cs.id = csb.shift_id
WHERE cs.is_active = true
  AND cs.shift_date >= CURRENT_DATE
  AND s.is_active = true
GROUP BY cs.id, s.id;
