-- Certificates table for tracking issued certificates
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

  -- Certificate details
  certificate_number VARCHAR(50) NOT NULL,
  certificate_type VARCHAR(50) NOT NULL DEFAULT 'completion', -- completion, continuing_education, skill_verification
  title TEXT NOT NULL,

  -- Completion data
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL means no expiration

  -- Course completion details
  completion_date DATE NOT NULL,
  final_grade DECIMAL(5,2),
  hours_completed DECIMAL(6,2),

  -- Template and styling
  template_id UUID REFERENCES certificate_templates(id),
  custom_data JSONB DEFAULT '{}', -- Additional fields for certificate

  -- Verification
  verification_code VARCHAR(20) NOT NULL UNIQUE,
  is_revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,

  -- Metadata
  issued_by UUID REFERENCES users(id),
  pdf_url TEXT, -- Stored PDF path
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, certificate_number)
);

-- Certificate templates
CREATE TABLE IF NOT EXISTS certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  description TEXT,
  certificate_type VARCHAR(50) NOT NULL DEFAULT 'completion',

  -- Template design
  template_html TEXT NOT NULL, -- HTML template with placeholders
  styles TEXT, -- CSS styles
  background_image_url TEXT,
  logo_position VARCHAR(20) DEFAULT 'top-center', -- top-left, top-center, top-right

  -- Default values
  default_title TEXT,
  signature_name TEXT,
  signature_title TEXT,
  signature_image_url TEXT,

  -- Settings
  show_grade BOOLEAN DEFAULT TRUE,
  show_hours BOOLEAN DEFAULT TRUE,
  show_date BOOLEAN DEFAULT TRUE,
  show_verification_code BOOLEAN DEFAULT TRUE,

  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_certificates_tenant ON certificates(tenant_id);
CREATE INDEX idx_certificates_student ON certificates(student_id);
CREATE INDEX idx_certificates_course ON certificates(course_id);
CREATE INDEX idx_certificates_verification ON certificates(verification_code);
CREATE INDEX idx_certificate_templates_tenant ON certificate_templates(tenant_id);

-- RLS Policies
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_templates ENABLE ROW LEVEL SECURITY;

-- Certificates: Students see own, instructors/admins see all in tenant
CREATE POLICY "Students view own certificates"
  ON certificates FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (
      student_id = auth.uid()
      OR (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
    )
  );

CREATE POLICY "Instructors/admins can issue certificates"
  ON certificates FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

CREATE POLICY "Instructors/admins can update certificates"
  ON certificates FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

-- Certificate templates: Only admins can manage
CREATE POLICY "View templates in tenant"
  ON certificate_templates FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins manage templates"
  ON certificate_templates FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Function to generate verification code
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate certificate number
CREATE OR REPLACE FUNCTION generate_certificate_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
  result TEXT;
BEGIN
  year_part := to_char(NOW(), 'YYYY');

  SELECT COALESCE(MAX(
    CASE
      WHEN certificate_number ~ ('^MF-' || year_part || '-[0-9]+$')
      THEN substring(certificate_number FROM 'MF-' || year_part || '-([0-9]+)$')::integer
      ELSE 0
    END
  ), 0) + 1
  INTO seq_num
  FROM certificates
  WHERE tenant_id = p_tenant_id;

  result := 'MF-' || year_part || '-' || lpad(seq_num::text, 5, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate certificate number and verification code
CREATE OR REPLACE FUNCTION certificates_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.certificate_number IS NULL OR NEW.certificate_number = '' THEN
    NEW.certificate_number := generate_certificate_number(NEW.tenant_id);
  END IF;

  IF NEW.verification_code IS NULL OR NEW.verification_code = '' THEN
    NEW.verification_code := generate_verification_code();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER certificates_before_insert_trigger
  BEFORE INSERT ON certificates
  FOR EACH ROW
  EXECUTE FUNCTION certificates_before_insert();

-- Insert default certificate template
INSERT INTO certificate_templates (
  id,
  tenant_id,
  name,
  description,
  certificate_type,
  template_html,
  default_title,
  is_default,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000', -- Will be updated per tenant
  'Default Completion Certificate',
  'Standard course completion certificate',
  'completion',
  '<div class="certificate">
    <div class="header">
      <div class="logo">{{logo}}</div>
      <h1>Certificate of Completion</h1>
    </div>
    <div class="body">
      <p class="presented">This is to certify that</p>
      <h2 class="student-name">{{student_name}}</h2>
      <p class="completion-text">has successfully completed the course</p>
      <h3 class="course-title">{{course_title}}</h3>
      {{#if show_grade}}<p class="grade">Final Grade: {{grade}}%</p>{{/if}}
      {{#if show_hours}}<p class="hours">Hours Completed: {{hours}}</p>{{/if}}
      {{#if show_date}}<p class="date">Completion Date: {{completion_date}}</p>{{/if}}
    </div>
    <div class="footer">
      <div class="signature">
        <div class="signature-line"></div>
        <p class="signature-name">{{signature_name}}</p>
        <p class="signature-title">{{signature_title}}</p>
      </div>
      <div class="verification">
        <p>Certificate #: {{certificate_number}}</p>
        {{#if show_verification_code}}<p>Verification Code: {{verification_code}}</p>{{/if}}
      </div>
    </div>
  </div>',
  'Certificate of Completion',
  true,
  true
) ON CONFLICT DO NOTHING;
