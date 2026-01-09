export * from "./database.types";

import type { Tables } from "./database.types";

// Re-export table types for convenience
export type Tenant = Tables<"tenants">;
export type User = Tables<"users">;
export type Course = Tables<"courses">;
export type Enrollment = Tables<"enrollments">;
export type Module = Tables<"modules">;
export type Lesson = Tables<"lessons">;
export type Assignment = Tables<"assignments">;
export type QuizQuestion = Tables<"quiz_questions">;
export type Submission = Tables<"submissions">;
export type SkillCategory = Tables<"skill_categories">;
export type Skill = Tables<"skills">;
export type SkillAttempt = Tables<"skill_attempts">;
export type ClinicalLog = Tables<"clinical_logs">;
export type DiscussionThread = Tables<"discussion_threads">;
export type DiscussionPost = Tables<"discussion_posts">;
export type Event = Tables<"events">;
export type Attendance = Tables<"attendance">;
export type Notification = Tables<"notifications">;
export type Announcement = Tables<"announcements">;
export type File = Tables<"files">;

// Extended types with relations
export interface CourseWithInstructor extends Course {
  instructor: User;
}

export interface CourseWithModules extends Course {
  modules: Module[];
}

export interface ModuleWithLessons extends Module {
  lessons: Lesson[];
}

export interface ModuleWithAssignments extends Module {
  assignments: Assignment[];
}

export interface AssignmentWithQuestions extends Assignment {
  quiz_questions: QuizQuestion[];
}

export interface SubmissionWithStudent extends Submission {
  student: User;
}

export interface SubmissionWithAssignment extends Submission {
  assignment: Assignment;
}

export interface EnrollmentWithCourse extends Enrollment {
  course: CourseWithInstructor;
}

export interface EnrollmentWithStudent extends Enrollment {
  student: User;
}

// Grading types
export type CurveMethod = "none" | "bell" | "sqrt" | "linear" | "flat" | "custom";

export interface CurveConfig {
  method: CurveMethod;
  targetMean?: number;
  flatBonus?: number;
  customFormula?: string;
}

export interface GradeResult {
  studentId: string;
  studentName: string;
  rawScore: number;
  curvedScore: number;
  percentile: number;
  letterGrade: string;
}

// Quiz answer types
export interface QuizAnswer {
  questionId: string;
  answer: string | string[] | boolean;
  isCorrect?: boolean;
  pointsEarned?: number;
}

export interface QuizSubmission {
  answers: QuizAnswer[];
  startedAt: string;
  submittedAt?: string;
  timeSpentSeconds: number;
}

// Clinical log types
export interface PatientContact {
  ageGroup: "infant" | "child" | "adult" | "geriatric";
  chiefComplaint: string;
  skillsPerformed: string[];
  wasTeamLead: boolean;
  notes?: string;
}

// Notification preferences
export interface NotificationPreferences {
  email: {
    assignments: boolean;
    grades: boolean;
    announcements: boolean;
    reminders: boolean;
  };
  push: {
    assignments: boolean;
    grades: boolean;
    announcements: boolean;
    reminders: boolean;
  };
}

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
  };
}

export interface SessionUser extends AuthUser {
  tenant_id: string;
  role: "admin" | "instructor" | "student";
  full_name: string;
  avatar_url?: string;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  organizationName?: string;
  enrollmentCode?: string;
}

export interface CourseForm {
  title: string;
  description?: string;
  courseCode?: string;
  courseType: "EMR" | "EMT" | "AEMT" | "Paramedic" | "Custom";
  startDate?: string;
  endDate?: string;
  maxStudents?: number;
}

export interface AssignmentForm {
  title: string;
  description?: string;
  instructions?: string;
  type: "quiz" | "written" | "skill_checklist" | "discussion";
  dueDate?: string;
  availableFrom?: string;
  pointsPossible: number;
  timeLimitMinutes?: number;
  attemptsAllowed: number;
}

// ============================================
// CLINICAL SCHEDULING TYPES
// ============================================

export type ClinicalSiteType =
  | "hospital"
  | "ambulance_service"
  | "fire_department"
  | "urgent_care"
  | "other";

export type BookingStatus = "booked" | "completed" | "cancelled" | "no_show";

export type PatientAgeRange =
  | "neonate"
  | "infant"
  | "toddler"
  | "preschool"
  | "school_age"
  | "adolescent"
  | "adult"
  | "geriatric";

export interface Preceptor {
  name: string;
  credentials: string;
  phone?: string;
}

export interface ClinicalSite {
  id: string;
  tenant_id: string;
  name: string;
  site_type: ClinicalSiteType;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  contact_name: string | null;
  contact_email: string | null;
  preceptors: Preceptor[];
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClinicalShift {
  id: string;
  tenant_id: string;
  site_id: string;
  course_id: string | null;
  title: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  notes: string | null;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClinicalShiftWithDetails extends ClinicalShift {
  site?: ClinicalSite;
  course?: Course;
  bookings_count?: number;
  available_slots?: number;
  is_available?: boolean;
}

export interface ShiftBooking {
  id: string;
  tenant_id: string;
  shift_id: string;
  student_id: string;
  status: BookingStatus;
  booked_at: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  hours_completed: number | null;
  preceptor_name: string | null;
  preceptor_signature: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftBookingWithDetails extends ShiftBooking {
  shift?: ClinicalShiftWithDetails;
  student?: User;
}

export interface VitalSigns {
  time: string;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  pulse: number | null;
  respiratory_rate: number | null;
  spo2: number | null;
  temperature: number | null;
  gcs: number | null;
  pain_scale: number | null;
}

export interface MedicationGiven {
  medication: string;
  dose: string;
  route: string;
  time: string;
}

export interface ClinicalPatientContact {
  id: string;
  tenant_id: string;
  booking_id: string;
  student_id: string;
  course_id: string | null;
  patient_age_range: PatientAgeRange;
  patient_gender: string | null;
  call_type: string | null;
  call_nature: string | null;
  dispatch_complaint: string | null;
  chief_complaint: string | null;
  primary_impression: string | null;
  secondary_impression: string | null;
  level_of_consciousness: string | null;
  mental_status: string | null;
  vitals: VitalSigns[];
  skills_performed: string[];
  medications_given: MedicationGiven[];
  procedures: string[];
  disposition: string | null;
  transport_destination: string | null;
  transport_mode: string | null;
  was_team_lead: boolean;
  role_description: string | null;
  narrative: string | null;
  preceptor_feedback: string | null;
  preceptor_signature: string | null;
  verification_status: "pending" | "verified" | "rejected";
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClinicalPatientContactWithDetails extends ClinicalPatientContact {
  booking?: ShiftBookingWithDetails;
  student?: User;
  course?: Course;
  verifier?: User;
}

// Clinical Form Types
export interface ClinicalSiteForm {
  name: string;
  site_type: ClinicalSiteType;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  contact_name?: string;
  contact_email?: string;
  preceptors?: Preceptor[];
  notes?: string;
}

export interface ClinicalShiftForm {
  site_id: string;
  course_id?: string;
  title: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  notes?: string;
}

export interface PatientContactForm {
  booking_id: string;
  course_id?: string;
  patient_age_range: PatientAgeRange;
  patient_gender?: string;
  call_type?: string;
  call_nature?: string;
  dispatch_complaint?: string;
  chief_complaint?: string;
  primary_impression?: string;
  secondary_impression?: string;
  level_of_consciousness?: string;
  mental_status?: string;
  vitals?: VitalSigns[];
  skills_performed?: string[];
  medications_given?: MedicationGiven[];
  procedures?: string[];
  disposition?: string;
  transport_destination?: string;
  transport_mode?: string;
  was_team_lead?: boolean;
  role_description?: string;
  narrative?: string;
}

// NREMT Skills Categories
export const NREMT_SKILL_CATEGORIES = [
  {
    category: "Airway Management",
    skills: [
      "Head-tilt/chin-lift",
      "Jaw thrust",
      "OPA insertion",
      "NPA insertion",
      "Suctioning",
      "BVM ventilation",
      "Oxygen administration",
      "Pulse oximetry",
    ],
  },
  {
    category: "Assessment",
    skills: [
      "Primary assessment",
      "Secondary assessment",
      "Vital signs",
      "Blood glucose monitoring",
      "12-Lead ECG",
      "Capnography",
    ],
  },
  {
    category: "Cardiac",
    skills: [
      "CPR",
      "AED use",
      "Cardiac monitoring",
      "Synchronized cardioversion",
      "Transcutaneous pacing",
    ],
  },
  {
    category: "IV/IO Access",
    skills: [
      "Peripheral IV insertion",
      "IO insertion",
      "Fluid administration",
      "IV medication administration",
    ],
  },
  {
    category: "Trauma",
    skills: [
      "Bleeding control",
      "Tourniquet application",
      "Splinting",
      "Spinal immobilization",
      "Traction splint",
    ],
  },
  {
    category: "Medical",
    skills: [
      "Nebulizer treatment",
      "Epinephrine auto-injector",
      "Oral glucose",
      "Naloxone administration",
      "Nitroglycerin assist",
    ],
  },
] as const;

// Patient age range labels
export const PATIENT_AGE_LABELS: Record<PatientAgeRange, string> = {
  neonate: "Neonate (0-1 month)",
  infant: "Infant (1 month - 1 year)",
  toddler: "Toddler (1-3 years)",
  preschool: "Preschool (3-5 years)",
  school_age: "School Age (6-12 years)",
  adolescent: "Adolescent (13-17 years)",
  adult: "Adult (18-64 years)",
  geriatric: "Geriatric (65+ years)",
};

// Clinical site type labels
export const SITE_TYPE_LABELS: Record<ClinicalSiteType, string> = {
  hospital: "Hospital",
  ambulance_service: "Ambulance Service",
  fire_department: "Fire Department",
  urgent_care: "Urgent Care",
  other: "Other",
};
