-- NREMT Psychomotor Skill Sheets Migration
-- Pre-loads all official NREMT skill sheets with step-by-step criteria

-- Create skill sheet templates table (system-wide, not tenant-specific)
CREATE TABLE skill_sheet_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    skill_code TEXT UNIQUE, -- e.g., "EMT-BVM", "PARA-IV"
    certification_level certification_level NOT NULL,
    category TEXT NOT NULL, -- Airway, Cardiac, Medical, Trauma, etc.
    description TEXT,
    time_limit_seconds INTEGER, -- Max time allowed (e.g., 600 for 10 min)
    critical_criteria JSONB NOT NULL DEFAULT '[]', -- Steps that auto-fail if missed
    steps JSONB NOT NULL DEFAULT '[]', -- [{id, description, points, isCritical}]
    total_points INTEGER DEFAULT 100,
    passing_score INTEGER DEFAULT 70,
    equipment_needed TEXT[],
    setup_instructions TEXT,
    patient_scenario TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Student skill sheet attempts (actual evaluations)
CREATE TABLE skill_sheet_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES skill_sheet_templates(id),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    evaluator_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Attempt details
    attempt_number INTEGER DEFAULT 1,
    attempt_date TIMESTAMPTZ DEFAULT now(),
    time_taken_seconds INTEGER,

    -- Results
    step_results JSONB NOT NULL DEFAULT '[]', -- [{stepId, passed, notes}]
    critical_failures TEXT[], -- List of critical criteria failed
    total_score INTEGER,
    passed BOOLEAN,

    -- Feedback
    evaluator_notes TEXT,
    student_reflection TEXT,
    remediation_plan TEXT,

    -- Verification
    evaluator_signature TEXT,
    signature_timestamp TIMESTAMPTZ,
    video_url TEXT, -- Optional video recording

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_sst_certification ON skill_sheet_templates(certification_level);
CREATE INDEX idx_sst_category ON skill_sheet_templates(category);
CREATE INDEX idx_ssa_student ON skill_sheet_attempts(student_id);
CREATE INDEX idx_ssa_template ON skill_sheet_attempts(template_id);
CREATE INDEX idx_ssa_course ON skill_sheet_attempts(course_id);
CREATE INDEX idx_ssa_tenant ON skill_sheet_attempts(tenant_id);

-- RLS
ALTER TABLE skill_sheet_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_sheet_attempts ENABLE ROW LEVEL SECURITY;

-- Everyone can view templates
CREATE POLICY "View skill sheet templates" ON skill_sheet_templates
    FOR SELECT USING (is_active = true);

-- Attempts: students see own, instructors see all in tenant
CREATE POLICY "View skill sheet attempts" ON skill_sheet_attempts
    FOR SELECT USING (
        student_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid()
            AND role IN ('admin', 'instructor')
            AND tenant_id = skill_sheet_attempts.tenant_id
        )
    );

CREATE POLICY "Create skill sheet attempts" ON skill_sheet_attempts
    FOR INSERT WITH CHECK (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Update skill sheet attempts" ON skill_sheet_attempts
    FOR UPDATE USING (
        evaluator_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid()
            AND role IN ('admin', 'instructor')
            AND tenant_id = skill_sheet_attempts.tenant_id
        )
    );

-- =====================================================
-- NREMT EMT Psychomotor Skill Sheets
-- =====================================================

INSERT INTO skill_sheet_templates (name, skill_code, certification_level, category, description, time_limit_seconds, critical_criteria, steps, total_points, passing_score, equipment_needed, patient_scenario) VALUES

-- Patient Assessment/Management - Trauma
('Patient Assessment - Trauma', 'EMT-TRAUMA', 'EMT', 'Assessment',
'Demonstrate the ability to perform a patient assessment on a trauma patient.',
600,
'["Takes or verbalizes appropriate PPE precautions", "Determines the scene/situation is safe", "Assesses airway patency", "Assesses breathing adequacy", "Controls major bleeding"]'::jsonb,
'[
    {"id": "1", "description": "Takes or verbalizes appropriate PPE precautions", "points": 1, "isCritical": true},
    {"id": "2", "description": "Determines the scene/situation is safe", "points": 1, "isCritical": true},
    {"id": "3", "description": "Determines the mechanism of injury/nature of illness", "points": 1, "isCritical": false},
    {"id": "4", "description": "Determines the number of patients", "points": 1, "isCritical": false},
    {"id": "5", "description": "Requests additional EMS assistance if necessary", "points": 1, "isCritical": false},
    {"id": "6", "description": "Considers stabilization of the spine", "points": 1, "isCritical": false},
    {"id": "7", "description": "Verbalizes general impression of the patient", "points": 1, "isCritical": false},
    {"id": "8", "description": "Determines responsiveness/level of consciousness (AVPU)", "points": 1, "isCritical": false},
    {"id": "9", "description": "Determines chief complaint/apparent life-threats", "points": 1, "isCritical": false},
    {"id": "10", "description": "Assesses airway and initiates appropriate oxygen therapy", "points": 1, "isCritical": true},
    {"id": "11", "description": "Assesses breathing and ensures adequate ventilation", "points": 1, "isCritical": true},
    {"id": "12", "description": "Assesses circulation - pulse, skin, bleeding", "points": 1, "isCritical": false},
    {"id": "13", "description": "Controls major bleeding if present", "points": 1, "isCritical": true},
    {"id": "14", "description": "Identifies patient priority and makes transport decision", "points": 1, "isCritical": false},
    {"id": "15", "description": "Performs secondary assessment - head", "points": 1, "isCritical": false},
    {"id": "16", "description": "Performs secondary assessment - neck", "points": 1, "isCritical": false},
    {"id": "17", "description": "Performs secondary assessment - chest", "points": 1, "isCritical": false},
    {"id": "18", "description": "Performs secondary assessment - abdomen", "points": 1, "isCritical": false},
    {"id": "19", "description": "Performs secondary assessment - pelvis", "points": 1, "isCritical": false},
    {"id": "20", "description": "Performs secondary assessment - extremities", "points": 1, "isCritical": false},
    {"id": "21", "description": "Performs secondary assessment - posterior", "points": 1, "isCritical": false},
    {"id": "22", "description": "Obtains baseline vital signs", "points": 1, "isCritical": false},
    {"id": "23", "description": "Obtains SAMPLE history", "points": 1, "isCritical": false},
    {"id": "24", "description": "Manages secondary injuries appropriately", "points": 1, "isCritical": false},
    {"id": "25", "description": "Demonstrates appropriate ongoing assessment", "points": 1, "isCritical": false}
]'::jsonb,
25, 70,
ARRAY['Gloves', 'Eye protection', 'Stethoscope', 'BP cuff', 'Penlight', 'Oxygen equipment', 'C-collar', 'Backboard'],
'You respond to a report of a motorcycle crash. Upon arrival, you find a 25-year-old male lying on the ground next to a motorcycle.'),

-- Patient Assessment/Management - Medical
('Patient Assessment - Medical', 'EMT-MEDICAL', 'EMT', 'Assessment',
'Demonstrate the ability to perform a patient assessment on a medical patient.',
600,
'["Takes or verbalizes appropriate PPE precautions", "Determines the scene/situation is safe", "Assesses airway patency", "Assesses breathing adequacy"]'::jsonb,
'[
    {"id": "1", "description": "Takes or verbalizes appropriate PPE precautions", "points": 1, "isCritical": true},
    {"id": "2", "description": "Determines the scene/situation is safe", "points": 1, "isCritical": true},
    {"id": "3", "description": "Determines the nature of illness", "points": 1, "isCritical": false},
    {"id": "4", "description": "Determines the number of patients", "points": 1, "isCritical": false},
    {"id": "5", "description": "Requests additional EMS assistance if necessary", "points": 1, "isCritical": false},
    {"id": "6", "description": "Verbalizes general impression of the patient", "points": 1, "isCritical": false},
    {"id": "7", "description": "Determines responsiveness/level of consciousness (AVPU)", "points": 1, "isCritical": false},
    {"id": "8", "description": "Determines chief complaint", "points": 1, "isCritical": false},
    {"id": "9", "description": "Assesses airway and initiates appropriate oxygen therapy", "points": 1, "isCritical": true},
    {"id": "10", "description": "Assesses breathing and ensures adequate ventilation", "points": 1, "isCritical": true},
    {"id": "11", "description": "Assesses circulation - pulse, skin color/condition", "points": 1, "isCritical": false},
    {"id": "12", "description": "Identifies patient priority and makes transport decision", "points": 1, "isCritical": false},
    {"id": "13", "description": "Obtains OPQRST for chief complaint", "points": 1, "isCritical": false},
    {"id": "14", "description": "Obtains SAMPLE history", "points": 1, "isCritical": false},
    {"id": "15", "description": "Performs focused physical exam based on complaint", "points": 1, "isCritical": false},
    {"id": "16", "description": "Obtains baseline vital signs", "points": 1, "isCritical": false},
    {"id": "17", "description": "Provides appropriate interventions", "points": 1, "isCritical": false},
    {"id": "18", "description": "Demonstrates appropriate ongoing assessment", "points": 1, "isCritical": false}
]'::jsonb,
18, 70,
ARRAY['Gloves', 'Eye protection', 'Stethoscope', 'BP cuff', 'Penlight', 'Oxygen equipment', 'Glucometer'],
'You respond to a residence for a 65-year-old female complaining of difficulty breathing.'),

-- BVM Ventilation
('BVM Ventilation of an Apneic Adult Patient', 'EMT-BVM', 'EMT', 'Airway',
'Demonstrate the ability to ventilate a patient using a bag-valve-mask.',
300,
'["Opens the airway manually", "Ventilates patient at proper rate", "Provides adequate volume with each ventilation"]'::jsonb,
'[
    {"id": "1", "description": "Takes or verbalizes appropriate PPE precautions", "points": 1, "isCritical": false},
    {"id": "2", "description": "Checks responsiveness", "points": 1, "isCritical": false},
    {"id": "3", "description": "Requests additional EMS assistance", "points": 1, "isCritical": false},
    {"id": "4", "description": "Opens the airway manually", "points": 1, "isCritical": true},
    {"id": "5", "description": "Elevates tongue, inserts simple airway adjunct (OPA or NPA)", "points": 1, "isCritical": false},
    {"id": "6", "description": "Selects appropriately sized mask", "points": 1, "isCritical": false},
    {"id": "7", "description": "Creates proper mask-to-face seal", "points": 1, "isCritical": false},
    {"id": "8", "description": "Ventilates patient at proper rate (10-12/min)", "points": 1, "isCritical": true},
    {"id": "9", "description": "Provides adequate volume with each ventilation", "points": 1, "isCritical": true},
    {"id": "10", "description": "Connects reservoir and sets oxygen flow rate (15 L/min)", "points": 1, "isCritical": false},
    {"id": "11", "description": "Reassesses ventilation", "points": 1, "isCritical": false}
]'::jsonb,
11, 70,
ARRAY['Gloves', 'BVM with reservoir', 'OPA set', 'NPA set', 'Lubricant', 'Oxygen source'],
'You arrive on scene to find an apneic adult patient. You must ventilate this patient using a BVM.'),

-- Oxygen Administration
('Oxygen Administration by Non-Rebreather Mask', 'EMT-O2NRB', 'EMT', 'Airway',
'Demonstrate the ability to administer supplemental oxygen via non-rebreather mask.',
180,
'["Places mask on patient properly", "Sets appropriate flow rate"]'::jsonb,
'[
    {"id": "1", "description": "Takes or verbalizes appropriate PPE precautions", "points": 1, "isCritical": false},
    {"id": "2", "description": "Assembles regulator to oxygen tank", "points": 1, "isCritical": false},
    {"id": "3", "description": "Opens valve on tank", "points": 1, "isCritical": false},
    {"id": "4", "description": "Checks tank pressure", "points": 1, "isCritical": false},
    {"id": "5", "description": "Attaches non-rebreather mask to regulator", "points": 1, "isCritical": false},
    {"id": "6", "description": "Prefills reservoir bag", "points": 1, "isCritical": false},
    {"id": "7", "description": "Sets flow rate at 10-15 L/min", "points": 1, "isCritical": true},
    {"id": "8", "description": "Applies mask to patient face properly", "points": 1, "isCritical": true},
    {"id": "9", "description": "Adjusts straps for proper fit", "points": 1, "isCritical": false},
    {"id": "10", "description": "Verifies reservoir bag remains inflated", "points": 1, "isCritical": false}
]'::jsonb,
10, 70,
ARRAY['Oxygen tank', 'Regulator', 'Non-rebreather mask', 'Gloves'],
'Apply a non-rebreather mask to a patient requiring high-flow oxygen therapy.'),

-- Cardiac Arrest Management/AED
('Cardiac Arrest Management/AED', 'EMT-AED', 'EMT', 'Cardiac',
'Demonstrate the ability to manage a cardiac arrest and use an AED.',
600,
'["Ensures CPR is being performed", "Applies AED pads correctly", "Clears patient before analysis", "Clears patient before shock", "Delivers shock if indicated"]'::jsonb,
'[
    {"id": "1", "description": "Takes or verbalizes appropriate PPE precautions", "points": 1, "isCritical": false},
    {"id": "2", "description": "Determines unresponsiveness", "points": 1, "isCritical": false},
    {"id": "3", "description": "Directs partner to begin CPR", "points": 1, "isCritical": true},
    {"id": "4", "description": "Turns on AED power", "points": 1, "isCritical": false},
    {"id": "5", "description": "Applies AED pads correctly", "points": 1, "isCritical": true},
    {"id": "6", "description": "Clears patient for analysis", "points": 1, "isCritical": true},
    {"id": "7", "description": "Initiates analysis", "points": 1, "isCritical": false},
    {"id": "8", "description": "Clears patient before shock delivery", "points": 1, "isCritical": true},
    {"id": "9", "description": "Delivers shock if indicated", "points": 1, "isCritical": true},
    {"id": "10", "description": "Immediately resumes CPR after shock", "points": 1, "isCritical": false},
    {"id": "11", "description": "Verbalizes check pulse after 2 minutes of CPR", "points": 1, "isCritical": false},
    {"id": "12", "description": "Operates AED per current guidelines", "points": 1, "isCritical": false}
]'::jsonb,
12, 70,
ARRAY['AED trainer', 'Gloves', 'CPR manikin', 'Barrier device'],
'You arrive at a residence to find a 55-year-old male unresponsive and not breathing.'),

-- Spinal Immobilization (Supine)
('Spinal Immobilization - Supine Patient', 'EMT-SPINE-SUP', 'EMT', 'Trauma',
'Demonstrate the ability to immobilize a supine patient with suspected spinal injury.',
600,
'["Directs assistant to maintain manual stabilization", "Secures torso before head", "Immobilizes head in neutral position"]'::jsonb,
'[
    {"id": "1", "description": "Takes or verbalizes appropriate PPE precautions", "points": 1, "isCritical": false},
    {"id": "2", "description": "Directs assistant to place/maintain head in neutral position", "points": 1, "isCritical": true},
    {"id": "3", "description": "Directs assistant to maintain manual stabilization", "points": 1, "isCritical": true},
    {"id": "4", "description": "Assesses motor, sensory, and circulatory function", "points": 1, "isCritical": false},
    {"id": "5", "description": "Applies appropriately sized cervical collar", "points": 1, "isCritical": false},
    {"id": "6", "description": "Positions immobilization device appropriately", "points": 1, "isCritical": false},
    {"id": "7", "description": "Directs movement of patient onto device", "points": 1, "isCritical": false},
    {"id": "8", "description": "Moves patient with minimal movement of spine", "points": 1, "isCritical": false},
    {"id": "9", "description": "Secures torso to device", "points": 1, "isCritical": true},
    {"id": "10", "description": "Secures head to device after torso", "points": 1, "isCritical": true},
    {"id": "11", "description": "Secures legs to device", "points": 1, "isCritical": false},
    {"id": "12", "description": "Pads voids appropriately", "points": 1, "isCritical": false},
    {"id": "13", "description": "Reassesses motor, sensory, and circulatory function", "points": 1, "isCritical": false}
]'::jsonb,
13, 70,
ARRAY['Cervical collar set', 'Long backboard', 'Straps', 'Head immobilizer', 'Padding', 'Gloves'],
'You have a patient lying supine who has a suspected spinal injury. Demonstrate spinal immobilization.'),

-- Bleeding Control/Shock Management
('Bleeding Control/Shock Management', 'EMT-BLEED', 'EMT', 'Trauma',
'Demonstrate the ability to control hemorrhage and manage shock.',
300,
'["Applies direct pressure", "Applies tourniquet if direct pressure fails"]'::jsonb,
'[
    {"id": "1", "description": "Takes or verbalizes appropriate PPE precautions", "points": 1, "isCritical": false},
    {"id": "2", "description": "Applies direct pressure to wound", "points": 1, "isCritical": true},
    {"id": "3", "description": "Applies pressure dressing", "points": 1, "isCritical": false},
    {"id": "4", "description": "If bleeding continues, applies tourniquet", "points": 1, "isCritical": true},
    {"id": "5", "description": "Places tourniquet proximal to wound", "points": 1, "isCritical": false},
    {"id": "6", "description": "Tightens tourniquet until bleeding stops", "points": 1, "isCritical": false},
    {"id": "7", "description": "Notes time of tourniquet application", "points": 1, "isCritical": false},
    {"id": "8", "description": "Positions patient appropriately (supine, legs elevated)", "points": 1, "isCritical": false},
    {"id": "9", "description": "Keeps patient warm", "points": 1, "isCritical": false},
    {"id": "10", "description": "Initiates transport", "points": 1, "isCritical": false}
]'::jsonb,
10, 70,
ARRAY['Gloves', 'Eye protection', 'Gauze/dressings', 'Tourniquet', 'Blanket'],
'You have a patient with severe bleeding from a wound on the lower extremity.'),

-- Long Bone Immobilization
('Immobilization Skills - Long Bone', 'EMT-SPLINT', 'EMT', 'Trauma',
'Demonstrate the ability to immobilize a long bone fracture.',
300,
'["Immobilizes joint above and below injury", "Reassesses distal circulation"]'::jsonb,
'[
    {"id": "1", "description": "Takes or verbalizes appropriate PPE precautions", "points": 1, "isCritical": false},
    {"id": "2", "description": "Directs manual stabilization of injury", "points": 1, "isCritical": false},
    {"id": "3", "description": "Assesses motor, sensory, and circulatory function distally", "points": 1, "isCritical": false},
    {"id": "4", "description": "Measures splint", "points": 1, "isCritical": false},
    {"id": "5", "description": "Applies splint", "points": 1, "isCritical": false},
    {"id": "6", "description": "Immobilizes joint above fracture site", "points": 1, "isCritical": true},
    {"id": "7", "description": "Immobilizes joint below fracture site", "points": 1, "isCritical": true},
    {"id": "8", "description": "Secures entire injured extremity", "points": 1, "isCritical": false},
    {"id": "9", "description": "Pads voids", "points": 1, "isCritical": false},
    {"id": "10", "description": "Reassesses motor, sensory, and circulatory function", "points": 1, "isCritical": true}
]'::jsonb,
10, 70,
ARRAY['Splint material', 'Roller gauze', 'Padding', 'Gloves'],
'Demonstrate immobilization of a closed, non-angulated mid-shaft fracture of the tibia/fibula.');

-- =====================================================
-- NREMT Paramedic Additional Skill Sheets
-- =====================================================

INSERT INTO skill_sheet_templates (name, skill_code, certification_level, category, description, time_limit_seconds, critical_criteria, steps, total_points, passing_score, equipment_needed, patient_scenario) VALUES

-- IV Access
('Intravenous Therapy', 'PARA-IV', 'Paramedic', 'IV/IO',
'Demonstrate the ability to establish peripheral IV access.',
300,
'["Selects appropriate IV catheter", "Inserts catheter successfully", "Disposes of needle in sharps container"]'::jsonb,
'[
    {"id": "1", "description": "Takes or verbalizes appropriate PPE precautions", "points": 1, "isCritical": false},
    {"id": "2", "description": "Checks IV fluid for clarity and expiration", "points": 1, "isCritical": false},
    {"id": "3", "description": "Selects appropriate IV tubing", "points": 1, "isCritical": false},
    {"id": "4", "description": "Prepares IV tubing (spikes bag, flushes tubing)", "points": 1, "isCritical": false},
    {"id": "5", "description": "Applies tourniquet", "points": 1, "isCritical": false},
    {"id": "6", "description": "Palpates suitable vein", "points": 1, "isCritical": false},
    {"id": "7", "description": "Cleanses site appropriately", "points": 1, "isCritical": false},
    {"id": "8", "description": "Performs venipuncture with appropriate catheter", "points": 1, "isCritical": true},
    {"id": "9", "description": "Observes flashback in catheter", "points": 1, "isCritical": false},
    {"id": "10", "description": "Advances catheter", "points": 1, "isCritical": false},
    {"id": "11", "description": "Connects IV tubing to catheter", "points": 1, "isCritical": false},
    {"id": "12", "description": "Releases tourniquet", "points": 1, "isCritical": false},
    {"id": "13", "description": "Opens IV to proper flow rate", "points": 1, "isCritical": false},
    {"id": "14", "description": "Secures catheter", "points": 1, "isCritical": false},
    {"id": "15", "description": "Disposes of needle properly", "points": 1, "isCritical": true}
]'::jsonb,
15, 70,
ARRAY['IV start kit', 'IV catheters', 'IV tubing', 'IV solution', 'Tourniquet', 'Gloves', 'Sharps container'],
'Establish an IV on this patient who requires fluid therapy.'),

-- Endotracheal Intubation
('Endotracheal Intubation', 'PARA-ETT', 'Paramedic', 'Airway',
'Demonstrate the ability to perform endotracheal intubation.',
300,
'["Confirms tube placement by auscultation", "Secures tube properly", "Does not interrupt ventilations >30 seconds"]'::jsonb,
'[
    {"id": "1", "description": "Takes or verbalizes appropriate PPE precautions", "points": 1, "isCritical": false},
    {"id": "2", "description": "Opens the airway manually", "points": 1, "isCritical": false},
    {"id": "3", "description": "Elevates tongue, inserts simple adjunct", "points": 1, "isCritical": false},
    {"id": "4", "description": "Ventilates patient with BVM", "points": 1, "isCritical": false},
    {"id": "5", "description": "Directs assistant to pre-oxygenate patient", "points": 1, "isCritical": false},
    {"id": "6", "description": "Identifies equipment for intubation", "points": 1, "isCritical": false},
    {"id": "7", "description": "Checks equipment (cuff, light, etc.)", "points": 1, "isCritical": false},
    {"id": "8", "description": "Positions head properly", "points": 1, "isCritical": false},
    {"id": "9", "description": "Inserts laryngoscope blade properly", "points": 1, "isCritical": false},
    {"id": "10", "description": "Lifts mandible with laryngoscope", "points": 1, "isCritical": false},
    {"id": "11", "description": "Visualizes vocal cords", "points": 1, "isCritical": false},
    {"id": "12", "description": "Inserts ETT through vocal cords", "points": 1, "isCritical": false},
    {"id": "13", "description": "Inflates cuff to proper pressure", "points": 1, "isCritical": false},
    {"id": "14", "description": "Confirms placement by auscultation (bilaterally and epigastrium)", "points": 1, "isCritical": true},
    {"id": "15", "description": "Confirms placement with secondary device (waveform capnography)", "points": 1, "isCritical": false},
    {"id": "16", "description": "Secures tube", "points": 1, "isCritical": true},
    {"id": "17", "description": "Does not interrupt ventilations >30 seconds", "points": 1, "isCritical": true}
]'::jsonb,
17, 70,
ARRAY['Laryngoscope', 'ETT tubes', 'Stylet', 'Syringe', 'BVM', 'Tube holder', 'Stethoscope', 'Capnography'],
'This patient is unresponsive and apneic. Perform endotracheal intubation.'),

-- 12-Lead ECG
('12-Lead ECG Acquisition', 'PARA-12LEAD', 'Paramedic', 'Cardiac',
'Demonstrate the ability to acquire a diagnostic quality 12-lead ECG.',
180,
'["Places all leads in correct positions", "Obtains artifact-free tracing"]'::jsonb,
'[
    {"id": "1", "description": "Takes or verbalizes appropriate PPE precautions", "points": 1, "isCritical": false},
    {"id": "2", "description": "Prepares skin appropriately", "points": 1, "isCritical": false},
    {"id": "3", "description": "Places V1 electrode - 4th ICS, right sternal border", "points": 1, "isCritical": true},
    {"id": "4", "description": "Places V2 electrode - 4th ICS, left sternal border", "points": 1, "isCritical": true},
    {"id": "5", "description": "Places V3 electrode - between V2 and V4", "points": 1, "isCritical": false},
    {"id": "6", "description": "Places V4 electrode - 5th ICS, midclavicular line", "points": 1, "isCritical": true},
    {"id": "7", "description": "Places V5 electrode - anterior axillary line, level of V4", "points": 1, "isCritical": false},
    {"id": "8", "description": "Places V6 electrode - midaxillary line, level of V4", "points": 1, "isCritical": false},
    {"id": "9", "description": "Places limb leads correctly", "points": 1, "isCritical": false},
    {"id": "10", "description": "Ensures patient is still during acquisition", "points": 1, "isCritical": false},
    {"id": "11", "description": "Obtains artifact-free 12-lead ECG", "points": 1, "isCritical": true},
    {"id": "12", "description": "Labels ECG with patient information", "points": 1, "isCritical": false}
]'::jsonb,
12, 70,
ARRAY['12-Lead ECG monitor', 'Electrodes', 'Razor/prep materials', 'Gloves'],
'Obtain a 12-lead ECG on this patient complaining of chest pain.');
