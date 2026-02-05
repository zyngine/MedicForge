-- Add payment_method and subscription_notes columns to tenants table
-- This allows platform admins to track invoice/check customers separately from Stripe

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS subscription_notes TEXT;

-- Add a comment for clarity
COMMENT ON COLUMN tenants.payment_method IS 'Payment method: stripe, invoice, ach, free';
COMMENT ON COLUMN tenants.subscription_notes IS 'Internal notes about subscription (invoice numbers, etc.)';
