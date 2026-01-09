-- MedicForge Clinical Scheduling RLS Policies
-- Row Level Security for clinical scheduling tables

-- ============================================
-- ENABLE RLS ON ALL CLINICAL TABLES
-- ============================================

ALTER TABLE clinical_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_shift_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_patient_contacts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CLINICAL SITES POLICIES
-- ============================================

-- All users can view active clinical sites in their tenant
CREATE POLICY "Users can view active clinical sites"
    ON clinical_sites FOR SELECT
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND is_active = true
    );

-- Admins and instructors can view all sites (including inactive)
CREATE POLICY "Admins and instructors can view all sites"
    ON clinical_sites FOR SELECT
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    );

-- Admins and instructors can insert clinical sites
CREATE POLICY "Admins and instructors can insert sites"
    ON clinical_sites FOR INSERT
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    );

-- Admins and instructors can update clinical sites
CREATE POLICY "Admins and instructors can update sites"
    ON clinical_sites FOR UPDATE
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    )
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

-- Only admins can delete clinical sites
CREATE POLICY "Admins can delete sites"
    ON clinical_sites FOR DELETE
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    );

-- ============================================
-- CLINICAL SHIFTS POLICIES
-- ============================================

-- All users can view active shifts in their tenant
CREATE POLICY "Users can view active shifts"
    ON clinical_shifts FOR SELECT
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND is_active = true
    );

-- Admins and instructors can view all shifts
CREATE POLICY "Admins and instructors can view all shifts"
    ON clinical_shifts FOR SELECT
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    );

-- Admins and instructors can insert shifts
CREATE POLICY "Admins and instructors can insert shifts"
    ON clinical_shifts FOR INSERT
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
        AND created_by = auth.uid()
    );

-- Admins and instructors can update shifts
CREATE POLICY "Admins and instructors can update shifts"
    ON clinical_shifts FOR UPDATE
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    )
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

-- Admins and instructors can delete shifts
CREATE POLICY "Admins and instructors can delete shifts"
    ON clinical_shifts FOR DELETE
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    );

-- ============================================
-- CLINICAL SHIFT BOOKINGS POLICIES
-- ============================================

-- Students can view their own bookings
CREATE POLICY "Students can view own bookings"
    ON clinical_shift_bookings FOR SELECT
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND student_id = auth.uid()
    );

-- Admins and instructors can view all bookings
CREATE POLICY "Admins and instructors can view all bookings"
    ON clinical_shift_bookings FOR SELECT
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    );

-- Students can insert their own bookings
-- Note: Use book_clinical_shift function for atomic booking
CREATE POLICY "Students can insert own bookings"
    ON clinical_shift_bookings FOR INSERT
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND student_id = auth.uid()
        AND (SELECT role FROM users WHERE id = auth.uid()) = 'student'
    );

-- Students can update their own bookings (for cancellation)
CREATE POLICY "Students can update own bookings"
    ON clinical_shift_bookings FOR UPDATE
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND student_id = auth.uid()
    )
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND student_id = auth.uid()
    );

-- Admins and instructors can update any booking (for check-in, verification)
CREATE POLICY "Admins and instructors can update bookings"
    ON clinical_shift_bookings FOR UPDATE
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    )
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

-- ============================================
-- CLINICAL PATIENT CONTACTS POLICIES
-- ============================================

-- Students can view their own patient contacts
CREATE POLICY "Students can view own patient contacts"
    ON clinical_patient_contacts FOR SELECT
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND student_id = auth.uid()
    );

-- Admins and instructors can view all patient contacts
CREATE POLICY "Admins and instructors can view all patient contacts"
    ON clinical_patient_contacts FOR SELECT
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    );

-- Students can insert their own patient contacts
CREATE POLICY "Students can insert own patient contacts"
    ON clinical_patient_contacts FOR INSERT
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND student_id = auth.uid()
    );

-- Students can update their own patient contacts (if not yet verified)
CREATE POLICY "Students can update own unverified patient contacts"
    ON clinical_patient_contacts FOR UPDATE
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND student_id = auth.uid()
        AND verification_status = 'pending'
    )
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND student_id = auth.uid()
    );

-- Admins and instructors can update any patient contact (for verification)
CREATE POLICY "Admins and instructors can update patient contacts"
    ON clinical_patient_contacts FOR UPDATE
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    )
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

-- Only admins can delete patient contacts
CREATE POLICY "Admins can delete patient contacts"
    ON clinical_patient_contacts FOR DELETE
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
        AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    );

-- ============================================
-- GRANT EXECUTE ON FUNCTIONS
-- ============================================

-- Grant execute permission on booking functions to authenticated users
GRANT EXECUTE ON FUNCTION book_clinical_shift(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_clinical_booking(UUID, UUID, UUID, TEXT) TO authenticated;
