// CE Platform database types — hand-written from ce_platform_initial_schema migration.
// Mirrors the Supabase generated-type conventions (Row / Insert / Update).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---------------------------------------------------------------------------
// ce_agencies
// ---------------------------------------------------------------------------
export interface CEAgenciesRow {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  admin_user_id: string | null;
  subscription_tier: string | null;
  subscription_start: string | null;
  subscription_end: string | null;
  invite_code: string | null;
  created_at: string | null;
}

export interface CEAgenciesInsert {
  id?: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
  admin_user_id?: string | null;
  subscription_tier?: string | null;
  subscription_start?: string | null;
  subscription_end?: string | null;
  invite_code?: string | null;
  created_at?: string | null;
}

export interface CEAgenciesUpdate {
  id?: string;
  name?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
  admin_user_id?: string | null;
  subscription_tier?: string | null;
  subscription_start?: string | null;
  subscription_end?: string | null;
  invite_code?: string | null;
  created_at?: string | null;
}

// ---------------------------------------------------------------------------
// ce_users
// ---------------------------------------------------------------------------
export interface CEUsersRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  nremt_id: string | null;
  certification_level: string | null;
  state: string | null;
  agency_id: string | null;
  role: string;
  preferred_language: string | null;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CEUsersInsert {
  id: string; // matches auth.users.id — no default
  email: string;
  first_name: string;
  last_name: string;
  nremt_id?: string | null;
  certification_level?: string | null;
  state?: string | null;
  agency_id?: string | null;
  role?: string;
  preferred_language?: string | null;
  terms_accepted_at?: string | null;
  privacy_accepted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CEUsersUpdate {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  nremt_id?: string | null;
  certification_level?: string | null;
  state?: string | null;
  agency_id?: string | null;
  role?: string;
  preferred_language?: string | null;
  terms_accepted_at?: string | null;
  privacy_accepted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// ---------------------------------------------------------------------------
// ce_courses
// ---------------------------------------------------------------------------
export interface CECoursesRow {
  id: string;
  course_number: string | null;
  title: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  ceh_hours: number;
  nremt_category: string | null;
  capce_course_number: string | null;
  is_capce_accredited: boolean | null;
  course_type: string | null;
  delivery_method: string | null;
  is_agency_custom: boolean | null;
  created_by_agency_id: string | null;
  price: number | null;
  is_free: boolean | null;
  passing_score: number | null;
  expiration_months: number | null;
  target_audience: string | null;
  prerequisites: string | null;
  certification_levels: Json | null;
  language: string | null;
  translated_from_course_id: string | null;
  version: number | null;
  version_notes: string | null;
  requires_retake_on_update: boolean | null;
  previous_version_id: string | null;
  disclosure_statement: string | null;
  has_commercial_support: boolean | null;
  commercial_supporter_name: string | null;
  commercial_support_disclosure: string | null;
  off_label_use_disclosure: string | null;
  evidence_basis: string | null;
  status: string | null;
  submitted_for_review_at: string | null;
  committee_reviewed_at: string | null;
  committee_decision: string | null;
  committee_notes: string | null;
  medical_director_approved: boolean | null;
  medical_director_approved_at: string | null;
  medical_director_notes: string | null;
  published_at: string | null;
  archived_at: string | null;
  archive_reason: string | null;
  is_beta: boolean | null;
  beta_feedback_enabled: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

export interface CECoursesInsert {
  id?: string;
  course_number?: string | null;
  title: string;
  description?: string | null;
  category?: string | null;
  subcategory?: string | null;
  ceh_hours?: number;
  nremt_category?: string | null;
  capce_course_number?: string | null;
  is_capce_accredited?: boolean | null;
  course_type?: string | null;
  delivery_method?: string | null;
  is_agency_custom?: boolean | null;
  created_by_agency_id?: string | null;
  price?: number | null;
  is_free?: boolean | null;
  passing_score?: number | null;
  expiration_months?: number | null;
  target_audience?: string | null;
  prerequisites?: string | null;
  certification_levels?: Json | null;
  language?: string | null;
  translated_from_course_id?: string | null;
  version?: number | null;
  version_notes?: string | null;
  requires_retake_on_update?: boolean | null;
  previous_version_id?: string | null;
  disclosure_statement?: string | null;
  has_commercial_support?: boolean | null;
  commercial_supporter_name?: string | null;
  commercial_support_disclosure?: string | null;
  off_label_use_disclosure?: string | null;
  evidence_basis?: string | null;
  status?: string | null;
  submitted_for_review_at?: string | null;
  committee_reviewed_at?: string | null;
  committee_decision?: string | null;
  committee_notes?: string | null;
  medical_director_approved?: boolean | null;
  medical_director_approved_at?: string | null;
  medical_director_notes?: string | null;
  published_at?: string | null;
  archived_at?: string | null;
  archive_reason?: string | null;
  is_beta?: boolean | null;
  beta_feedback_enabled?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
}

export interface CECoursesUpdate {
  id?: string;
  course_number?: string | null;
  title?: string;
  description?: string | null;
  category?: string | null;
  subcategory?: string | null;
  ceh_hours?: number;
  nremt_category?: string | null;
  capce_course_number?: string | null;
  is_capce_accredited?: boolean | null;
  course_type?: string | null;
  delivery_method?: string | null;
  is_agency_custom?: boolean | null;
  created_by_agency_id?: string | null;
  price?: number | null;
  is_free?: boolean | null;
  passing_score?: number | null;
  expiration_months?: number | null;
  target_audience?: string | null;
  prerequisites?: string | null;
  certification_levels?: Json | null;
  language?: string | null;
  translated_from_course_id?: string | null;
  version?: number | null;
  version_notes?: string | null;
  requires_retake_on_update?: boolean | null;
  previous_version_id?: string | null;
  disclosure_statement?: string | null;
  has_commercial_support?: boolean | null;
  commercial_supporter_name?: string | null;
  commercial_support_disclosure?: string | null;
  off_label_use_disclosure?: string | null;
  evidence_basis?: string | null;
  status?: string | null;
  submitted_for_review_at?: string | null;
  committee_reviewed_at?: string | null;
  committee_decision?: string | null;
  committee_notes?: string | null;
  medical_director_approved?: boolean | null;
  medical_director_approved_at?: string | null;
  medical_director_notes?: string | null;
  published_at?: string | null;
  archived_at?: string | null;
  archive_reason?: string | null;
  is_beta?: boolean | null;
  beta_feedback_enabled?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
}

// ---------------------------------------------------------------------------
// ce_enrollments
// ---------------------------------------------------------------------------
export interface CEEnrollmentsRow {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  due_date: string | null;
  completion_status: string | null;
  completed_at: string | null;
  progress_percentage: number | null;
}

export interface CEEnrollmentsInsert {
  id?: string;
  user_id: string;
  course_id: string;
  enrolled_at?: string | null;
  assigned_by?: string | null;
  assigned_at?: string | null;
  due_date?: string | null;
  completion_status?: string | null;
  completed_at?: string | null;
  progress_percentage?: number | null;
}

export interface CEEnrollmentsUpdate {
  id?: string;
  user_id?: string;
  course_id?: string;
  enrolled_at?: string | null;
  assigned_by?: string | null;
  assigned_at?: string | null;
  due_date?: string | null;
  completion_status?: string | null;
  completed_at?: string | null;
  progress_percentage?: number | null;
}

// ---------------------------------------------------------------------------
// ce_certificates
// ---------------------------------------------------------------------------
export interface CECertificatesRow {
  id: string;
  enrollment_id: string;
  user_id: string;
  course_id: string;
  certificate_number: string;
  issued_at: string | null;
  expires_at: string | null;
  pdf_url: string | null;
  user_name: string;
  user_nremt_id: string | null;
  course_title: string;
  course_number: string;
  ceh_hours: number;
  completion_date: string;
  provider_name: string | null;
  provider_address: string | null;
  medical_director_name: string | null;
  is_capce_accredited: boolean | null;
  capce_course_number: string | null;
  verification_code: string;
  verified_count: number | null;
  last_verified_at: string | null;
}

export interface CECertificatesInsert {
  id?: string;
  enrollment_id: string;
  user_id: string;
  course_id: string;
  certificate_number: string;
  issued_at?: string | null;
  expires_at?: string | null;
  pdf_url?: string | null;
  user_name: string;
  user_nremt_id?: string | null;
  course_title: string;
  course_number: string;
  ceh_hours: number;
  completion_date: string;
  provider_name?: string | null;
  provider_address?: string | null;
  medical_director_name?: string | null;
  is_capce_accredited?: boolean | null;
  capce_course_number?: string | null;
  verification_code: string;
  verified_count?: number | null;
  last_verified_at?: string | null;
}

export interface CECertificatesUpdate {
  id?: string;
  enrollment_id?: string;
  user_id?: string;
  course_id?: string;
  certificate_number?: string;
  issued_at?: string | null;
  expires_at?: string | null;
  pdf_url?: string | null;
  user_name?: string;
  user_nremt_id?: string | null;
  course_title?: string;
  course_number?: string;
  ceh_hours?: number;
  completion_date?: string;
  provider_name?: string | null;
  provider_address?: string | null;
  medical_director_name?: string | null;
  is_capce_accredited?: boolean | null;
  capce_course_number?: string | null;
  verification_code?: string;
  verified_count?: number | null;
  last_verified_at?: string | null;
}

// ---------------------------------------------------------------------------
// ce_course_modules
// ---------------------------------------------------------------------------
export interface CECourseModulesRow {
  id: string;
  course_id: string;
  module_number: number;
  title: string;
  duration_minutes: number | null;
  sort_order: number | null;
  created_at: string | null;
}

export interface CECourseModulesInsert {
  id?: string;
  course_id: string;
  module_number: number;
  title: string;
  duration_minutes?: number | null;
  sort_order?: number | null;
  created_at?: string | null;
}

export interface CECourseModulesUpdate {
  id?: string;
  course_id?: string;
  module_number?: number;
  title?: string;
  duration_minutes?: number | null;
  sort_order?: number | null;
  created_at?: string | null;
}

// ---------------------------------------------------------------------------
// ce_module_progress
// ---------------------------------------------------------------------------
export interface CEModuleProgressRow {
  id: string;
  enrollment_id: string;
  module_id: string;
  started_at: string | null;
  completed_at: string | null;
  time_spent_minutes: number | null;
  progress_percentage: number | null;
  last_accessed_at: string | null;
}

export interface CEModuleProgressInsert {
  id?: string;
  enrollment_id: string;
  module_id: string;
  started_at?: string | null;
  completed_at?: string | null;
  time_spent_minutes?: number | null;
  progress_percentage?: number | null;
  last_accessed_at?: string | null;
}

export interface CEModuleProgressUpdate {
  id?: string;
  enrollment_id?: string;
  module_id?: string;
  started_at?: string | null;
  completed_at?: string | null;
  time_spent_minutes?: number | null;
  progress_percentage?: number | null;
  last_accessed_at?: string | null;
}

// ---------------------------------------------------------------------------
// ce_quizzes
// ---------------------------------------------------------------------------
export interface CEQuizzesRow {
  id: string;
  course_id: string;
  quiz_type: string | null;
  title: string;
  description: string | null;
  passing_score: number | null;
  randomize_questions: boolean | null;
  max_attempts: number | null;
  show_answers_after: string | null;
  created_at: string | null;
}

export interface CEQuizzesInsert {
  id?: string;
  course_id: string;
  quiz_type?: string | null;
  title: string;
  description?: string | null;
  passing_score?: number | null;
  randomize_questions?: boolean | null;
  max_attempts?: number | null;
  show_answers_after?: string | null;
  created_at?: string | null;
}

export interface CEQuizzesUpdate {
  id?: string;
  course_id?: string;
  quiz_type?: string | null;
  title?: string;
  description?: string | null;
  passing_score?: number | null;
  randomize_questions?: boolean | null;
  max_attempts?: number | null;
  show_answers_after?: string | null;
  created_at?: string | null;
}

// ---------------------------------------------------------------------------
// ce_quiz_questions
// ---------------------------------------------------------------------------
export interface CEQuizQuestionsRow {
  id: string;
  quiz_id: string;
  question_type: string | null;
  question_text: string;
  explanation: string | null;
  correct_answer: string;
  difficulty: string | null;
  sort_order: number | null;
  created_at: string | null;
}

export interface CEQuizQuestionsInsert {
  id?: string;
  quiz_id: string;
  question_type?: string | null;
  question_text: string;
  explanation?: string | null;
  correct_answer: string;
  difficulty?: string | null;
  sort_order?: number | null;
  created_at?: string | null;
}

export interface CEQuizQuestionsUpdate {
  id?: string;
  quiz_id?: string;
  question_type?: string | null;
  question_text?: string;
  explanation?: string | null;
  correct_answer?: string;
  difficulty?: string | null;
  sort_order?: number | null;
  created_at?: string | null;
}

// ---------------------------------------------------------------------------
// ce_quiz_attempts
// ---------------------------------------------------------------------------
export interface CEQuizAttemptsRow {
  id: string;
  enrollment_id: string;
  quiz_id: string;
  attempt_number: number;
  started_at: string | null;
  completed_at: string | null;
  score: number | null;
  is_passing: boolean | null;
  answers: Json | null;
}

export interface CEQuizAttemptsInsert {
  id?: string;
  enrollment_id: string;
  quiz_id: string;
  attempt_number: number;
  started_at?: string | null;
  completed_at?: string | null;
  score?: number | null;
  is_passing?: boolean | null;
  answers?: Json | null;
}

export interface CEQuizAttemptsUpdate {
  id?: string;
  enrollment_id?: string;
  quiz_id?: string;
  attempt_number?: number;
  started_at?: string | null;
  completed_at?: string | null;
  score?: number | null;
  is_passing?: boolean | null;
  answers?: Json | null;
}

// ---------------------------------------------------------------------------
// ce_user_subscriptions
// ---------------------------------------------------------------------------
export interface CEUserSubscriptionsRow {
  id: string;
  user_id: string;
  plan: string;
  price: number;
  starts_at: string;
  expires_at: string;
  square_subscription_id: string | null;
  status: string | null;
  auto_renew: boolean | null;
  created_at: string | null;
}

export interface CEUserSubscriptionsInsert {
  id?: string;
  user_id: string;
  plan: string;
  price: number;
  starts_at: string;
  expires_at: string;
  square_subscription_id?: string | null;
  status?: string | null;
  auto_renew?: boolean | null;
  created_at?: string | null;
}

export interface CEUserSubscriptionsUpdate {
  id?: string;
  user_id?: string;
  plan?: string;
  price?: number;
  starts_at?: string;
  expires_at?: string;
  square_subscription_id?: string | null;
  status?: string | null;
  auto_renew?: boolean | null;
  created_at?: string | null;
}

// ---------------------------------------------------------------------------
// ce_purchases
// ---------------------------------------------------------------------------
export interface CEPurchasesRow {
  id: string;
  user_id: string;
  course_id: string;
  amount: number;
  square_payment_id: string | null;
  purchased_at: string | null;
  refunded: boolean | null;
  refunded_at: string | null;
  refund_reason: string | null;
}

export interface CEPurchasesInsert {
  id?: string;
  user_id: string;
  course_id: string;
  amount: number;
  square_payment_id?: string | null;
  purchased_at?: string | null;
  refunded?: boolean | null;
  refunded_at?: string | null;
  refund_reason?: string | null;
}

export interface CEPurchasesUpdate {
  id?: string;
  user_id?: string;
  course_id?: string;
  amount?: number;
  square_payment_id?: string | null;
  purchased_at?: string | null;
  refunded?: boolean | null;
  refunded_at?: string | null;
  refund_reason?: string | null;
}

// ---------------------------------------------------------------------------
// ce_email_log
// ---------------------------------------------------------------------------
export interface CEEmailLogRow {
  id: string;
  user_id: string | null;
  email_type: string;
  subject: string;
  sent_at: string | null;
  status: string | null;
  resend_message_id: string | null;
}

export interface CEEmailLogInsert {
  id?: string;
  user_id?: string | null;
  email_type: string;
  subject: string;
  sent_at?: string | null;
  status?: string | null;
  resend_message_id?: string | null;
}

export interface CEEmailLogUpdate {
  id?: string;
  user_id?: string | null;
  email_type?: string;
  subject?: string;
  sent_at?: string | null;
  status?: string | null;
  resend_message_id?: string | null;
}

// ---------------------------------------------------------------------------
// ce_platform_settings
// ---------------------------------------------------------------------------
export interface CEPlatformSettingsRow {
  key: string;
  value: string;
  updated_at: string | null;
}

export interface CEPlatformSettingsInsert {
  key: string;
  value: string;
  updated_at?: string | null;
}

export interface CEPlatformSettingsUpdate {
  key?: string;
  value?: string;
  updated_at?: string | null;
}

// ---------------------------------------------------------------------------
// ce_agency_invite_codes
// ---------------------------------------------------------------------------
export interface CEAgencyInviteCodesRow {
  id: string;
  agency_id: string;
  code: string;
  expires_at: string | null;
  max_uses: number | null;
  uses_count: number | null;
  created_at: string | null;
}

export interface CEAgencyInviteCodesInsert {
  id?: string;
  agency_id: string;
  code: string;
  expires_at?: string | null;
  max_uses?: number | null;
  uses_count?: number | null;
  created_at?: string | null;
}

export interface CEAgencyInviteCodesUpdate {
  id?: string;
  agency_id?: string;
  code?: string;
  expires_at?: string | null;
  max_uses?: number | null;
  uses_count?: number | null;
  created_at?: string | null;
}

// ---------------------------------------------------------------------------
// CEDatabase — Supabase-style schema type
// ---------------------------------------------------------------------------
export interface CEDatabase {
  public: {
    Tables: {
      ce_agencies: {
        Row: CEAgenciesRow;
        Insert: CEAgenciesInsert;
        Update: CEAgenciesUpdate;
        Relationships: [];
      };
      ce_users: {
        Row: CEUsersRow;
        Insert: CEUsersInsert;
        Update: CEUsersUpdate;
        Relationships: [];
      };
      ce_courses: {
        Row: CECoursesRow;
        Insert: CECoursesInsert;
        Update: CECoursesUpdate;
        Relationships: [];
      };
      ce_enrollments: {
        Row: CEEnrollmentsRow;
        Insert: CEEnrollmentsInsert;
        Update: CEEnrollmentsUpdate;
        Relationships: [];
      };
      ce_certificates: {
        Row: CECertificatesRow;
        Insert: CECertificatesInsert;
        Update: CECertificatesUpdate;
        Relationships: [];
      };
      ce_course_modules: {
        Row: CECourseModulesRow;
        Insert: CECourseModulesInsert;
        Update: CECourseModulesUpdate;
        Relationships: [];
      };
      ce_module_progress: {
        Row: CEModuleProgressRow;
        Insert: CEModuleProgressInsert;
        Update: CEModuleProgressUpdate;
        Relationships: [];
      };
      ce_quizzes: {
        Row: CEQuizzesRow;
        Insert: CEQuizzesInsert;
        Update: CEQuizzesUpdate;
        Relationships: [];
      };
      ce_quiz_questions: {
        Row: CEQuizQuestionsRow;
        Insert: CEQuizQuestionsInsert;
        Update: CEQuizQuestionsUpdate;
        Relationships: [];
      };
      ce_quiz_attempts: {
        Row: CEQuizAttemptsRow;
        Insert: CEQuizAttemptsInsert;
        Update: CEQuizAttemptsUpdate;
        Relationships: [];
      };
      ce_user_subscriptions: {
        Row: CEUserSubscriptionsRow;
        Insert: CEUserSubscriptionsInsert;
        Update: CEUserSubscriptionsUpdate;
        Relationships: [];
      };
      ce_purchases: {
        Row: CEPurchasesRow;
        Insert: CEPurchasesInsert;
        Update: CEPurchasesUpdate;
        Relationships: [];
      };
      ce_email_log: {
        Row: CEEmailLogRow;
        Insert: CEEmailLogInsert;
        Update: CEEmailLogUpdate;
        Relationships: [];
      };
      ce_platform_settings: {
        Row: CEPlatformSettingsRow;
        Insert: CEPlatformSettingsInsert;
        Update: CEPlatformSettingsUpdate;
        Relationships: [];
      };
      ce_agency_invite_codes: {
        Row: CEAgencyInviteCodesRow;
        Insert: CEAgencyInviteCodesInsert;
        Update: CEAgencyInviteCodesUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
