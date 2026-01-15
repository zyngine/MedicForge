-- Add agency_code column to tenants table for instructor registration
-- This allows instructors to join a tenant/organization by entering the agency code

-- Add agency_code column
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS agency_code VARCHAR(10) UNIQUE;

-- Generate agency codes for existing tenants that don't have one
UPDATE tenants
SET agency_code = UPPER(SUBSTRING(md5(id::text || NOW()::text) FROM 1 FOR 8))
WHERE agency_code IS NULL;

-- Make agency_code NOT NULL after populating
ALTER TABLE tenants ALTER COLUMN agency_code SET NOT NULL;

-- Add a default value for new tenants (will be overwritten by application logic)
ALTER TABLE tenants ALTER COLUMN agency_code SET DEFAULT UPPER(SUBSTRING(md5(gen_random_uuid()::text) FROM 1 FOR 8));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenants_agency_code ON tenants(agency_code);

-- Create function to generate unique agency code
CREATE OR REPLACE FUNCTION generate_agency_code() RETURNS VARCHAR(10) AS $$
DECLARE
    new_code VARCHAR(10);
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate 8 character alphanumeric code
        new_code := UPPER(SUBSTRING(md5(gen_random_uuid()::text) FROM 1 FOR 8));

        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM tenants WHERE agency_code = new_code) INTO code_exists;

        -- Exit loop if code is unique
        EXIT WHEN NOT code_exists;
    END LOOP;

    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN tenants.agency_code IS 'Unique code for instructors to join this organization';
