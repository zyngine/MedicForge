-- Add white_label_enabled field to tenants table
-- When enabled, MedicForge branding will be hidden from the tenant's portal

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS white_label_enabled BOOLEAN DEFAULT FALSE;

-- Add comment explaining the field
COMMENT ON COLUMN tenants.white_label_enabled IS 'When true, hides MedicForge branding from tenant portal (requires Institution or Enterprise tier)';
