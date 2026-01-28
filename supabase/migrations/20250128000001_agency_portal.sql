-- Agency Portal Schema
-- Workforce Competency Management System for EMS Agencies
-- Tracks employee skills verification and medical director sign-offs

-- ============================================
-- ENUMS (idempotent using DO blocks)
-- ============================================

-- Competency status
DO $$ BEGIN
  CREATE TYPE competency_status AS ENUM (
    'not_started',
    'in_progress',
    'pending_review',
    'verified',
    'expired',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Verification cycle type
DO $$ BEGIN
  CREATE TYPE verification_cycle_type AS ENUM (
    'initial',
    'annual',
    'remedial'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Employee certification level
DO $$ BEGIN
  CREATE TYPE certification_level AS ENUM (
    'EMR',
    'EMT',
    'AEMT',
    'Paramedic',
    'Other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- EXTEND TENANTS FOR AGENCY SUPPORT
-- ============================================

-- Add tenant_type to support education vs agency vs combined
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tenant_type TEXT DEFAULT 'education';
-- Values: 'education', 'agency', 'combined'

-- ============================================
-- AGENCY-SPECIFIC TABLES
-- ============================================

-- Agency settings and configuration (extends tenant info)
CREATE TABLE IF NOT EXISTS agency_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Agency details
  agency_license_number TEXT,
  state_code TEXT DEFAULT 'PA',
  county TEXT,

  -- Compliance settings
  verification_reminder_days INTEGER DEFAULT 30, -- Days before expiration to remind
  annual_cycle_month INTEGER DEFAULT 1, -- Month when annual cycle resets (1 = January)
  require_supervisor_review BOOLEAN DEFAULT false,

  -- Branding
  agency_logo_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id)
);

-- Employees (agency workforce - linked to users table)
CREATE TABLE IF NOT EXISTS agency_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Optional link to user account

  -- Employee info (can exist without user account)
  employee_number TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,

  -- Certification
  certification_level certification_level NOT NULL DEFAULT 'EMT',
  state_certification_number TEXT,
  national_registry_number TEXT,
  certification_expiration DATE,

  -- Employment
  hire_date DATE,
  department TEXT,
  position TEXT,
  supervisor_id UUID REFERENCES agency_employees(id),
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, employee_number)
);

-- Skill/Competency Library (what skills need to be verified)
CREATE TABLE IF NOT EXISTS skill_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL = system default

  -- Skill details
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- e.g., 'Airway', 'Cardiac', 'Trauma', 'Medical'
  skill_code TEXT, -- Optional reference code

  -- Requirements
  certification_levels certification_level[] DEFAULT ARRAY['EMT']::certification_level[],
  is_required BOOLEAN DEFAULT true,
  requires_annual_verification BOOLEAN DEFAULT true,

  -- For ordering/display
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Source
  is_system_default BOOLEAN DEFAULT false, -- PA default skills
  state_code TEXT DEFAULT 'PA',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification Cycles (Initial, Annual 2024, Annual 2025, etc.)
CREATE TABLE IF NOT EXISTS verification_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Cycle info
  name TEXT NOT NULL, -- e.g., "Initial Verification", "Annual 2025"
  cycle_type verification_cycle_type NOT NULL,
  year INTEGER, -- For annual cycles

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false, -- Prevent changes after completion

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, cycle_type, year)
);

-- Employee Competencies (tracking each employee's skill verifications)
CREATE TABLE IF NOT EXISTS employee_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES agency_employees(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skill_library(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES verification_cycles(id) ON DELETE CASCADE,

  -- Status tracking
  status competency_status DEFAULT 'not_started',

  -- Completion details
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id), -- Employee or supervisor who marked complete

  -- Evidence/documentation
  notes TEXT,
  document_urls TEXT[], -- Uploaded evidence

  -- Supervisor review (optional)
  supervisor_id UUID REFERENCES agency_employees(id),
  supervisor_reviewed_at TIMESTAMPTZ,
  supervisor_approved BOOLEAN,
  supervisor_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(employee_id, skill_id, cycle_id)
);

-- Medical Director Assignments (which MDs oversee which agencies)
CREATE TABLE IF NOT EXISTS medical_director_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- The MD's user account

  -- MD details
  md_name TEXT NOT NULL,
  md_credentials TEXT, -- e.g., "MD, FACEP"
  md_license_number TEXT,
  md_email TEXT,
  md_phone TEXT,

  -- Assignment
  is_primary BOOLEAN DEFAULT false, -- Primary MD for agency
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, user_id)
);

-- Competency Verifications (Medical Director sign-offs)
CREATE TABLE IF NOT EXISTS competency_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- What's being verified
  competency_id UUID REFERENCES employee_competencies(id) ON DELETE CASCADE,
  -- OR batch verification for multiple competencies
  employee_id UUID REFERENCES agency_employees(id) ON DELETE CASCADE,
  cycle_id UUID REFERENCES verification_cycles(id) ON DELETE CASCADE,

  -- Verification type
  is_batch_verification BOOLEAN DEFAULT false, -- Verify all skills at once

  -- Medical Director info
  verified_by UUID NOT NULL REFERENCES users(id), -- MD user
  md_assignment_id UUID REFERENCES medical_director_assignments(id),

  -- Verification details
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  verification_method TEXT, -- 'in_person', 'video', 'documentation_review'

  -- Digital signature
  signature_data TEXT, -- Base64 signature image or signature hash
  signature_ip TEXT,
  signature_timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log for compliance
CREATE TABLE IF NOT EXISTS agency_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- What happened
  action TEXT NOT NULL, -- 'competency_completed', 'verification_signed', 'employee_added', etc.
  entity_type TEXT NOT NULL, -- 'employee', 'competency', 'verification', etc.
  entity_id UUID,

  -- Who did it
  performed_by UUID REFERENCES users(id),
  performed_by_name TEXT, -- Denormalized for audit trail

  -- Details
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_agency_settings_tenant ON agency_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agency_employees_tenant ON agency_employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agency_employees_user ON agency_employees(user_id);
CREATE INDEX IF NOT EXISTS idx_agency_employees_supervisor ON agency_employees(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_agency_employees_cert_level ON agency_employees(certification_level);
CREATE INDEX IF NOT EXISTS idx_skill_library_tenant ON skill_library(tenant_id);
CREATE INDEX IF NOT EXISTS idx_skill_library_category ON skill_library(category);
CREATE INDEX IF NOT EXISTS idx_skill_library_cert_levels ON skill_library USING GIN(certification_levels);
CREATE INDEX IF NOT EXISTS idx_verification_cycles_tenant ON verification_cycles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_verification_cycles_active ON verification_cycles(is_active);
CREATE INDEX IF NOT EXISTS idx_employee_competencies_employee ON employee_competencies(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_competencies_skill ON employee_competencies(skill_id);
CREATE INDEX IF NOT EXISTS idx_employee_competencies_cycle ON employee_competencies(cycle_id);
CREATE INDEX IF NOT EXISTS idx_employee_competencies_status ON employee_competencies(status);
CREATE INDEX IF NOT EXISTS idx_md_assignments_tenant ON medical_director_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_md_assignments_user ON medical_director_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_competency_verifications_competency ON competency_verifications(competency_id);
CREATE INDEX IF NOT EXISTS idx_competency_verifications_employee ON competency_verifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_competency_verifications_cycle ON competency_verifications(cycle_id);
CREATE INDEX IF NOT EXISTS idx_competency_verifications_md ON competency_verifications(verified_by);
CREATE INDEX IF NOT EXISTS idx_agency_audit_log_tenant ON agency_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agency_audit_log_entity ON agency_audit_log(entity_type, entity_id);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS update_agency_settings_updated_at ON agency_settings;
CREATE TRIGGER update_agency_settings_updated_at
  BEFORE UPDATE ON agency_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agency_employees_updated_at ON agency_employees;
CREATE TRIGGER update_agency_employees_updated_at
  BEFORE UPDATE ON agency_employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_skill_library_updated_at ON skill_library;
CREATE TRIGGER update_skill_library_updated_at
  BEFORE UPDATE ON skill_library
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_verification_cycles_updated_at ON verification_cycles;
CREATE TRIGGER update_verification_cycles_updated_at
  BEFORE UPDATE ON verification_cycles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employee_competencies_updated_at ON employee_competencies;
CREATE TRIGGER update_employee_competencies_updated_at
  BEFORE UPDATE ON employee_competencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_md_assignments_updated_at ON medical_director_assignments;
CREATE TRIGGER update_md_assignments_updated_at
  BEFORE UPDATE ON medical_director_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE agency_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_director_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE competency_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_audit_log ENABLE ROW LEVEL SECURITY;

-- Agency Settings: Admin only
DROP POLICY IF EXISTS "Admins can manage agency settings" ON agency_settings;
CREATE POLICY "Admins can manage agency settings"
  ON agency_settings FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Users can view agency settings" ON agency_settings;
CREATE POLICY "Users can view agency settings"
  ON agency_settings FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- Agency Employees: Admins manage, employees see own, supervisors see team
DROP POLICY IF EXISTS "Admins can manage employees" ON agency_employees;
CREATE POLICY "Admins can manage employees"
  ON agency_employees FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

DROP POLICY IF EXISTS "Employees can view themselves" ON agency_employees;
CREATE POLICY "Employees can view themselves"
  ON agency_employees FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Skill Library: Admins manage, all view
DROP POLICY IF EXISTS "Admins can manage skill library" ON skill_library;
CREATE POLICY "Admins can manage skill library"
  ON skill_library FOR ALL
  USING (
    (tenant_id IS NULL AND is_system_default = true) -- System defaults viewable by all
    OR (
      tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
      AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view skill library" ON skill_library;
CREATE POLICY "Users can view skill library"
  ON skill_library FOR SELECT
  USING (
    tenant_id IS NULL -- System defaults
    OR tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- Verification Cycles: Admins manage, all view
DROP POLICY IF EXISTS "Admins can manage verification cycles" ON verification_cycles;
CREATE POLICY "Admins can manage verification cycles"
  ON verification_cycles FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Users can view verification cycles" ON verification_cycles;
CREATE POLICY "Users can view verification cycles"
  ON verification_cycles FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- Employee Competencies: Admins/supervisors manage, employees see own
DROP POLICY IF EXISTS "Admins can manage all competencies" ON employee_competencies;
CREATE POLICY "Admins can manage all competencies"
  ON employee_competencies FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'instructor')
  );

DROP POLICY IF EXISTS "Employees can view/update own competencies" ON employee_competencies;
CREATE POLICY "Employees can view/update own competencies"
  ON employee_competencies FOR ALL
  USING (
    employee_id IN (
      SELECT id FROM agency_employees WHERE user_id = auth.uid()
    )
  );

-- Medical Director Assignments: Admins manage, MDs view their assignments
DROP POLICY IF EXISTS "Admins can manage MD assignments" ON medical_director_assignments;
CREATE POLICY "Admins can manage MD assignments"
  ON medical_director_assignments FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "MDs can view their assignments" ON medical_director_assignments;
CREATE POLICY "MDs can view their assignments"
  ON medical_director_assignments FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Competency Verifications: MDs can create, admins can view all
DROP POLICY IF EXISTS "MDs can create verifications" ON competency_verifications;
CREATE POLICY "MDs can create verifications"
  ON competency_verifications FOR INSERT
  WITH CHECK (
    verified_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM medical_director_assignments
      WHERE user_id = auth.uid()
      AND tenant_id = competency_verifications.tenant_id
      AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can view verifications in tenant" ON competency_verifications;
CREATE POLICY "Users can view verifications in tenant"
  ON competency_verifications FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- Audit Log: Admins view only
DROP POLICY IF EXISTS "Admins can view audit log" ON agency_audit_log;
CREATE POLICY "Admins can view audit log"
  ON agency_audit_log FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "System can insert audit log" ON agency_audit_log;
CREATE POLICY "System can insert audit log"
  ON agency_audit_log FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- ============================================
-- SEED PA DEFAULT SKILLS (only if not already seeded)
-- ============================================

INSERT INTO skill_library (name, description, category, certification_levels, is_required, requires_annual_verification, is_system_default, state_code, display_order)
SELECT * FROM (VALUES
-- Airway Management
('Airway Positioning (Head-tilt/Chin-lift, Jaw Thrust)', 'Proper positioning techniques for airway management', 'Airway', ARRAY['EMR', 'EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 1),
('Oropharyngeal Airway (OPA) Insertion', 'Insertion and sizing of OPA', 'Airway', ARRAY['EMR', 'EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 2),
('Nasopharyngeal Airway (NPA) Insertion', 'Insertion and sizing of NPA', 'Airway', ARRAY['EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 3),
('Suctioning (Oral/Nasal)', 'Proper suctioning techniques', 'Airway', ARRAY['EMR', 'EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 4),
('Bag-Valve-Mask (BVM) Ventilation', 'Two-person and single-person BVM technique', 'Airway', ARRAY['EMR', 'EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 5),
('Oxygen Administration', 'NC, NRB, and other oxygen delivery devices', 'Airway', ARRAY['EMR', 'EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 6),
('Supraglottic Airway (King/iGel)', 'Insertion of supraglottic airways', 'Airway', ARRAY['AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 7),
('Endotracheal Intubation', 'Direct and video laryngoscopy', 'Airway', ARRAY['Paramedic']::certification_level[], true, true, true, 'PA', 8),

-- Assessment
('Primary Assessment', 'Scene size-up and primary survey', 'Assessment', ARRAY['EMR', 'EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 10),
('Secondary Assessment', 'Head-to-toe physical exam', 'Assessment', ARRAY['EMR', 'EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 11),
('Vital Signs', 'BP, pulse, respirations, SpO2, temperature', 'Assessment', ARRAY['EMR', 'EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 12),
('Blood Glucose Monitoring', 'Glucometer use and interpretation', 'Assessment', ARRAY['EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 13),
('12-Lead ECG Acquisition', 'Proper lead placement and acquisition', 'Assessment', ARRAY['AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 14),
('Capnography/ETCO2 Monitoring', 'Waveform interpretation', 'Assessment', ARRAY['AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 15),

-- Cardiac
('CPR (Adult/Pediatric/Infant)', 'High-quality CPR with proper rate and depth', 'Cardiac', ARRAY['EMR', 'EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 20),
('AED Operation', 'Proper AED use and pad placement', 'Cardiac', ARRAY['EMR', 'EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 21),
('Manual Defibrillation', 'Manual defibrillator operation', 'Cardiac', ARRAY['Paramedic']::certification_level[], true, true, true, 'PA', 22),
('Synchronized Cardioversion', 'Cardioversion for unstable tachycardias', 'Cardiac', ARRAY['Paramedic']::certification_level[], true, true, true, 'PA', 23),
('Transcutaneous Pacing', 'TCP for symptomatic bradycardia', 'Cardiac', ARRAY['Paramedic']::certification_level[], true, true, true, 'PA', 24),

-- IV/IO Access
('Peripheral IV Insertion', 'IV catheter insertion and securing', 'Vascular Access', ARRAY['AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 30),
('Intraosseous (IO) Access', 'IO insertion (tibial, humeral)', 'Vascular Access', ARRAY['AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 31),
('IV Fluid Administration', 'Crystalloid administration', 'Vascular Access', ARRAY['AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 32),

-- Trauma
('Hemorrhage Control', 'Direct pressure, wound packing', 'Trauma', ARRAY['EMR', 'EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 40),
('Tourniquet Application', 'Proper tourniquet placement', 'Trauma', ARRAY['EMR', 'EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 41),
('Splinting', 'Extremity immobilization', 'Trauma', ARRAY['EMR', 'EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 42),
('Spinal Motion Restriction', 'C-collar application, long board', 'Trauma', ARRAY['EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 43),
('Traction Splint Application', 'Femur fracture management', 'Trauma', ARRAY['EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 44),
('Chest Seal Application', 'Occlusive dressing for chest trauma', 'Trauma', ARRAY['EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 45),
('Needle Decompression', 'Tension pneumothorax treatment', 'Trauma', ARRAY['Paramedic']::certification_level[], true, true, true, 'PA', 46),

-- Medical
('Epinephrine Auto-Injector', 'EpiPen administration for anaphylaxis', 'Medical', ARRAY['EMR', 'EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 50),
('Oral Glucose Administration', 'Treatment for hypoglycemia', 'Medical', ARRAY['EMR', 'EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 51),
('Naloxone Administration', 'Narcan for opioid overdose', 'Medical', ARRAY['EMR', 'EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 52),
('Aspirin Administration', 'ASA for suspected ACS', 'Medical', ARRAY['EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 53),
('Nitroglycerin Assist', 'NTG administration for chest pain', 'Medical', ARRAY['EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 54),
('Nebulizer Treatment', 'Albuterol/Ipratropium administration', 'Medical', ARRAY['EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 55),
('CPAP Application', 'Non-invasive positive pressure', 'Medical', ARRAY['EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 56),

-- Pediatric
('Pediatric Assessment', 'Pediatric assessment triangle, length-based dosing', 'Pediatric', ARRAY['EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 60),
('Pediatric Airway Management', 'Pediatric-specific airway techniques', 'Pediatric', ARRAY['EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 61),
('Pediatric IV/IO Access', 'Pediatric vascular access', 'Pediatric', ARRAY['AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 62),

-- OB/GYN
('Normal Delivery', 'Uncomplicated childbirth', 'OB/GYN', ARRAY['EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 70),
('Neonatal Resuscitation', 'Newborn assessment and resuscitation', 'OB/GYN', ARRAY['EMT', 'AEMT', 'Paramedic']::certification_level[], true, true, true, 'PA', 71),
('Complicated Delivery', 'Breech, cord prolapse, shoulder dystocia', 'OB/GYN', ARRAY['Paramedic']::certification_level[], true, true, true, 'PA', 72)
) AS v(name, description, category, certification_levels, is_required, requires_annual_verification, is_system_default, state_code, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM skill_library WHERE is_system_default = true AND name = v.name
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if user is a medical director for a tenant
CREATE OR REPLACE FUNCTION is_medical_director(tenant_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM medical_director_assignments
    WHERE user_id = auth.uid()
    AND tenant_id = tenant_uuid
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get employee completion percentage for a cycle
CREATE OR REPLACE FUNCTION get_employee_cycle_completion(
  p_employee_id UUID,
  p_cycle_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  total_skills INTEGER;
  verified_skills INTEGER;
BEGIN
  -- Get total required skills for this employee's certification level
  SELECT COUNT(*) INTO total_skills
  FROM skill_library sl
  JOIN agency_employees ae ON ae.id = p_employee_id
  WHERE (sl.tenant_id IS NULL OR sl.tenant_id = ae.tenant_id)
    AND sl.is_active = true
    AND sl.requires_annual_verification = true
    AND ae.certification_level = ANY(sl.certification_levels);

  IF total_skills = 0 THEN
    RETURN 100;
  END IF;

  -- Get verified skills count
  SELECT COUNT(*) INTO verified_skills
  FROM employee_competencies
  WHERE employee_id = p_employee_id
    AND cycle_id = p_cycle_id
    AND status = 'verified';

  RETURN ROUND((verified_skills::NUMERIC / total_skills) * 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
