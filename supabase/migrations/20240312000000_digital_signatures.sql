-- Digital Signatures Support
-- Migration: 20240312000000_digital_signatures.sql
-- Adds signature capture and verification fields to relevant tables

-- Add signature fields to clinical_logs
ALTER TABLE clinical_logs ADD COLUMN IF NOT EXISTS preceptor_signature_data TEXT;
ALTER TABLE clinical_logs ADD COLUMN IF NOT EXISTS preceptor_signature_name TEXT;
ALTER TABLE clinical_logs ADD COLUMN IF NOT EXISTS preceptor_signature_credentials TEXT;
ALTER TABLE clinical_logs ADD COLUMN IF NOT EXISTS preceptor_signed_at TIMESTAMPTZ;
ALTER TABLE clinical_logs ADD COLUMN IF NOT EXISTS student_signature_data TEXT;
ALTER TABLE clinical_logs ADD COLUMN IF NOT EXISTS student_signed_at TIMESTAMPTZ;

-- Add signature fields to clinical_shift_bookings
ALTER TABLE clinical_shift_bookings ADD COLUMN IF NOT EXISTS preceptor_signature_data TEXT;
ALTER TABLE clinical_shift_bookings ADD COLUMN IF NOT EXISTS preceptor_signature_name TEXT;
ALTER TABLE clinical_shift_bookings ADD COLUMN IF NOT EXISTS preceptor_signature_credentials TEXT;
ALTER TABLE clinical_shift_bookings ADD COLUMN IF NOT EXISTS preceptor_signed_at TIMESTAMPTZ;

-- Add signature fields to clinical_patient_contacts
ALTER TABLE clinical_patient_contacts ADD COLUMN IF NOT EXISTS preceptor_signature_data TEXT;
ALTER TABLE clinical_patient_contacts ADD COLUMN IF NOT EXISTS preceptor_signature_name TEXT;
ALTER TABLE clinical_patient_contacts ADD COLUMN IF NOT EXISTS preceptor_signature_credentials TEXT;
ALTER TABLE clinical_patient_contacts ADD COLUMN IF NOT EXISTS preceptor_signed_at TIMESTAMPTZ;

-- Add signature fields to skill_sheet_attempts
ALTER TABLE skill_sheet_attempts ADD COLUMN IF NOT EXISTS evaluator_signature_data TEXT;
ALTER TABLE skill_sheet_attempts ADD COLUMN IF NOT EXISTS evaluator_signature_name TEXT;
ALTER TABLE skill_sheet_attempts ADD COLUMN IF NOT EXISTS evaluator_signature_credentials TEXT;
ALTER TABLE skill_sheet_attempts ADD COLUMN IF NOT EXISTS evaluator_signed_at TIMESTAMPTZ;
ALTER TABLE skill_sheet_attempts ADD COLUMN IF NOT EXISTS student_signature_data TEXT;
ALTER TABLE skill_sheet_attempts ADD COLUMN IF NOT EXISTS student_signed_at TIMESTAMPTZ;

-- Create signatures table for storing reusable signatures
CREATE TABLE IF NOT EXISTS user_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signature_data TEXT NOT NULL,
  signature_type TEXT NOT NULL DEFAULT 'primary', -- primary, preceptor, evaluator
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, signature_type, is_default)
);

-- Create signature verifications table for audit trail
CREATE TABLE IF NOT EXISTS signature_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES auth.users(id),
  signer_name TEXT NOT NULL,
  signer_credentials TEXT,
  signature_data TEXT NOT NULL,
  document_type TEXT NOT NULL, -- clinical_log, shift_booking, patient_contact, skill_attempt
  document_id UUID NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  verified_hash TEXT, -- SHA256 hash of signature + document_id for verification

  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Create index for verification lookups
CREATE INDEX IF NOT EXISTS idx_signature_verifications_document
  ON signature_verifications(document_type, document_id);

CREATE INDEX IF NOT EXISTS idx_signature_verifications_signer
  ON signature_verifications(signer_id);

-- Enable RLS
ALTER TABLE user_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_signatures
CREATE POLICY "Users can view own signatures"
  ON user_signatures FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own signatures"
  ON user_signatures FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own signatures"
  ON user_signatures FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own signatures"
  ON user_signatures FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for signature_verifications
CREATE POLICY "Users can view signatures in their tenant"
  ON signature_verifications FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Authenticated users can insert verifications"
  ON signature_verifications FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- Function to record a signature verification
CREATE OR REPLACE FUNCTION record_signature_verification(
  p_tenant_id UUID,
  p_signer_id UUID,
  p_signer_name TEXT,
  p_signer_credentials TEXT,
  p_signature_data TEXT,
  p_document_type TEXT,
  p_document_id UUID,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS signature_verifications AS $$
DECLARE
  v_verification signature_verifications;
  v_hash TEXT;
BEGIN
  -- Generate verification hash
  v_hash := encode(
    sha256(
      (p_signature_data || p_document_id::TEXT || p_signer_name || NOW()::TEXT)::BYTEA
    ),
    'hex'
  );

  INSERT INTO signature_verifications (
    tenant_id,
    signer_id,
    signer_name,
    signer_credentials,
    signature_data,
    document_type,
    document_id,
    ip_address,
    user_agent,
    verified_hash
  ) VALUES (
    p_tenant_id,
    p_signer_id,
    p_signer_name,
    p_signer_credentials,
    p_signature_data,
    p_document_type,
    p_document_id,
    p_ip_address,
    p_user_agent,
    v_hash
  ) RETURNING * INTO v_verification;

  RETURN v_verification;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE user_signatures IS 'Stores user signature images for reuse';
COMMENT ON TABLE signature_verifications IS 'Audit trail for all digital signatures';
COMMENT ON FUNCTION record_signature_verification IS 'Records a signature with verification hash';
