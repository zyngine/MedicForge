-- Make patient contacts not require a shift booking
-- This allows students to log patient contacts independently

-- Make booking_id nullable
ALTER TABLE clinical_patient_contacts
    ALTER COLUMN booking_id DROP NOT NULL;

-- Add optional fields for manual entry (when no booking is linked)
ALTER TABLE clinical_patient_contacts
    ADD COLUMN IF NOT EXISTS contact_date DATE,
    ADD COLUMN IF NOT EXISTS site_name TEXT,
    ADD COLUMN IF NOT EXISTS site_type TEXT,
    ADD COLUMN IF NOT EXISTS supervisor_name TEXT,
    ADD COLUMN IF NOT EXISTS supervisor_credentials TEXT;

-- Add a comment explaining the change
COMMENT ON COLUMN clinical_patient_contacts.booking_id IS 'Optional link to a clinical shift booking. NULL if contact logged independently.';
COMMENT ON COLUMN clinical_patient_contacts.contact_date IS 'Date of patient contact. Used when no booking is linked.';
COMMENT ON COLUMN clinical_patient_contacts.site_name IS 'Clinical site name. Used when no booking is linked.';
