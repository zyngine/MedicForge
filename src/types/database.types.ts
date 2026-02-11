export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accreditation_document_versions: {
        Row: {
          change_notes: string | null
          created_at: string | null
          document_id: string
          file_name: string
          file_url: string
          id: string
          uploaded_by: string
          version: number
        }
        Insert: {
          change_notes?: string | null
          created_at?: string | null
          document_id: string
          file_name: string
          file_url: string
          id?: string
          uploaded_by: string
          version: number
        }
        Update: {
          change_notes?: string | null
          created_at?: string | null
          document_id?: string
          file_name?: string
          file_url?: string
          id?: string
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "accreditation_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "accreditation_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      accreditation_documents: {
        Row: {
          category: Database["public"]["Enums"]["accreditation_doc_category"]
          created_at: string | null
          description: string | null
          effective_date: string | null
          expiration_date: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["accreditation_doc_status"]
          tags: string[] | null
          tenant_id: string
          title: string
          updated_at: string | null
          uploaded_by: string
          version: number
        }
        Insert: {
          category: Database["public"]["Enums"]["accreditation_doc_category"]
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          expiration_date?: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["accreditation_doc_status"]
          tags?: string[] | null
          tenant_id: string
          title: string
          updated_at?: string | null
          uploaded_by: string
          version?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["accreditation_doc_category"]
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          expiration_date?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["accreditation_doc_status"]
          tags?: string[] | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "accreditation_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_audit_log: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          performed_by: string | null
          performed_by_name: string | null
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
          performed_by_name?: string | null
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          performed_by?: string | null
          performed_by_name?: string | null
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_audit_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_employees: {
        Row: {
          certification_expiration: string | null
          certification_level: Database["public"]["Enums"]["certification_level"]
          created_at: string | null
          department: string | null
          email: string | null
          employee_number: string | null
          first_name: string
          hire_date: string | null
          id: string
          is_active: boolean | null
          last_name: string
          national_registry_number: string | null
          phone: string | null
          position: string | null
          state_certification_number: string | null
          supervisor_id: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          certification_expiration?: string | null
          certification_level?: Database["public"]["Enums"]["certification_level"]
          created_at?: string | null
          department?: string | null
          email?: string | null
          employee_number?: string | null
          first_name: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          last_name: string
          national_registry_number?: string | null
          phone?: string | null
          position?: string | null
          state_certification_number?: string | null
          supervisor_id?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          certification_expiration?: string | null
          certification_level?: Database["public"]["Enums"]["certification_level"]
          created_at?: string | null
          department?: string | null
          email?: string | null
          employee_number?: string | null
          first_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string
          national_registry_number?: string | null
          phone?: string | null
          position?: string | null
          state_certification_number?: string | null
          supervisor_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_employees_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "agency_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_settings: {
        Row: {
          agency_license_number: string | null
          agency_logo_url: string | null
          annual_cycle_month: number | null
          county: string | null
          created_at: string | null
          id: string
          require_supervisor_review: boolean | null
          state_code: string | null
          tenant_id: string
          updated_at: string | null
          verification_reminder_days: number | null
        }
        Insert: {
          agency_license_number?: string | null
          agency_logo_url?: string | null
          annual_cycle_month?: number | null
          county?: string | null
          created_at?: string | null
          id?: string
          require_supervisor_review?: boolean | null
          state_code?: string | null
          tenant_id: string
          updated_at?: string | null
          verification_reminder_days?: number | null
        }
        Update: {
          agency_license_number?: string | null
          agency_logo_url?: string | null
          annual_cycle_month?: number | null
          county?: string | null
          created_at?: string | null
          id?: string
          require_supervisor_review?: boolean | null
          state_code?: string | null
          tenant_id?: string
          updated_at?: string | null
          verification_reminder_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string
          content: string
          course_id: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          publish_at: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          author_id: string
          content: string
          course_id: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          publish_at?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          author_id?: string
          content?: string
          course_id?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          publish_at?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_questions: {
        Row: {
          assignment_id: string
          id: string
          order_index: number | null
          points_override: number | null
          question_id: string
        }
        Insert: {
          assignment_id: string
          id?: string
          order_index?: number | null
          points_override?: number | null
          question_id: string
        }
        Update: {
          assignment_id?: string
          id?: string
          order_index?: number | null
          points_override?: number | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_questions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          attempts_allowed: number | null
          available_from: string | null
          description: string | null
          due_date: string | null
          id: string
          instructions: string | null
          is_published: boolean | null
          module_id: string
          points_possible: number | null
          rubric: Json | null
          settings: Json | null
          tenant_id: string
          time_limit_minutes: number | null
          title: string
          type: Database["public"]["Enums"]["assignment_type"] | null
        }
        Insert: {
          attempts_allowed?: number | null
          available_from?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          module_id: string
          points_possible?: number | null
          rubric?: Json | null
          settings?: Json | null
          tenant_id: string
          time_limit_minutes?: number | null
          title: string
          type?: Database["public"]["Enums"]["assignment_type"] | null
        }
        Update: {
          attempts_allowed?: number | null
          available_from?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          module_id?: string
          points_possible?: number | null
          rubric?: Json | null
          settings?: Json | null
          tenant_id?: string
          time_limit_minutes?: number | null
          title?: string
          type?: Database["public"]["Enums"]["assignment_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          check_in_time: string | null
          event_id: string
          id: string
          notes: string | null
          recorded_by: string | null
          status: Database["public"]["Enums"]["attendance_status"] | null
          student_id: string
          tenant_id: string
        }
        Insert: {
          check_in_time?: string | null
          event_id: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          student_id: string
          tenant_id: string
        }
        Update: {
          check_in_time?: string | null
          event_id?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cat_sessions: {
        Row: {
          ability_se: number | null
          assignment_id: string | null
          completed_at: string | null
          created_at: string | null
          final_ability: number | null
          final_score: number | null
          id: string
          pass_fail: string | null
          questions_answered: number
          questions_correct: number
          response_history: Json | null
          started_at: string
          status: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          ability_se?: number | null
          assignment_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          final_ability?: number | null
          final_score?: number | null
          id?: string
          pass_fail?: string | null
          questions_answered?: number
          questions_correct?: number
          response_history?: Json | null
          started_at?: string
          status?: string
          student_id: string
          tenant_id: string
        }
        Update: {
          ability_se?: number | null
          assignment_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          final_ability?: number | null
          final_score?: number | null
          id?: string
          pass_fail?: string | null
          questions_answered?: number
          questions_correct?: number
          response_history?: Json | null
          started_at?: string
          status?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cat_sessions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cat_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_logs: {
        Row: {
          activities: Json | null
          course_id: string
          date: string
          hours: number | null
          id: string
          log_type: Database["public"]["Enums"]["log_type"]
          notes: string | null
          patient_info: Json | null
          preceptor_signature_credentials: string | null
          preceptor_signature_data: string | null
          preceptor_signature_name: string | null
          preceptor_signed_at: string | null
          site_name: string | null
          site_type: string | null
          skills_performed: Json | null
          student_id: string
          student_signature_data: string | null
          student_signed_at: string | null
          supervisor_credentials: string | null
          supervisor_name: string | null
          tenant_id: string
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at: string | null
          verified_by: string | null
          was_team_lead: boolean | null
        }
        Insert: {
          activities?: Json | null
          course_id: string
          date: string
          hours?: number | null
          id?: string
          log_type: Database["public"]["Enums"]["log_type"]
          notes?: string | null
          patient_info?: Json | null
          preceptor_signature_credentials?: string | null
          preceptor_signature_data?: string | null
          preceptor_signature_name?: string | null
          preceptor_signed_at?: string | null
          site_name?: string | null
          site_type?: string | null
          skills_performed?: Json | null
          student_id: string
          student_signature_data?: string | null
          student_signed_at?: string | null
          supervisor_credentials?: string | null
          supervisor_name?: string | null
          tenant_id: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
          verified_by?: string | null
          was_team_lead?: boolean | null
        }
        Update: {
          activities?: Json | null
          course_id?: string
          date?: string
          hours?: number | null
          id?: string
          log_type?: Database["public"]["Enums"]["log_type"]
          notes?: string | null
          patient_info?: Json | null
          preceptor_signature_credentials?: string | null
          preceptor_signature_data?: string | null
          preceptor_signature_name?: string | null
          preceptor_signed_at?: string | null
          site_name?: string | null
          site_type?: string | null
          skills_performed?: Json | null
          student_id?: string
          student_signature_data?: string | null
          student_signed_at?: string | null
          supervisor_credentials?: string | null
          supervisor_name?: string | null
          tenant_id?: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
          verified_by?: string | null
          was_team_lead?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_logs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_logs_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_patient_contacts: {
        Row: {
          booking_id: string | null
          call_nature: string | null
          call_type: string | null
          chief_complaint: string | null
          contact_date: string | null
          course_id: string | null
          created_at: string | null
          dispatch_complaint: string | null
          disposition: string | null
          id: string
          level_of_consciousness: string | null
          medications_given: Json | null
          mental_status: string | null
          narrative: string | null
          patient_age_range: Database["public"]["Enums"]["patient_age_range"]
          patient_gender: string | null
          preceptor_feedback: string | null
          preceptor_signature: string | null
          preceptor_signature_credentials: string | null
          preceptor_signature_data: string | null
          preceptor_signature_name: string | null
          preceptor_signed_at: string | null
          primary_impression: string | null
          procedures: Json | null
          role_description: string | null
          secondary_impression: string | null
          site_name: string | null
          site_type: string | null
          skills_performed: Json | null
          student_id: string
          supervisor_credentials: string | null
          supervisor_name: string | null
          tenant_id: string
          transport_destination: string | null
          transport_mode: string | null
          updated_at: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at: string | null
          verified_by: string | null
          vitals: Json | null
          was_team_lead: boolean | null
        }
        Insert: {
          booking_id?: string | null
          call_nature?: string | null
          call_type?: string | null
          chief_complaint?: string | null
          contact_date?: string | null
          course_id?: string | null
          created_at?: string | null
          dispatch_complaint?: string | null
          disposition?: string | null
          id?: string
          level_of_consciousness?: string | null
          medications_given?: Json | null
          mental_status?: string | null
          narrative?: string | null
          patient_age_range: Database["public"]["Enums"]["patient_age_range"]
          patient_gender?: string | null
          preceptor_feedback?: string | null
          preceptor_signature?: string | null
          preceptor_signature_credentials?: string | null
          preceptor_signature_data?: string | null
          preceptor_signature_name?: string | null
          preceptor_signed_at?: string | null
          primary_impression?: string | null
          procedures?: Json | null
          role_description?: string | null
          secondary_impression?: string | null
          site_name?: string | null
          site_type?: string | null
          skills_performed?: Json | null
          student_id: string
          supervisor_credentials?: string | null
          supervisor_name?: string | null
          tenant_id: string
          transport_destination?: string | null
          transport_mode?: string | null
          updated_at?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
          verified_by?: string | null
          vitals?: Json | null
          was_team_lead?: boolean | null
        }
        Update: {
          booking_id?: string | null
          call_nature?: string | null
          call_type?: string | null
          chief_complaint?: string | null
          contact_date?: string | null
          course_id?: string | null
          created_at?: string | null
          dispatch_complaint?: string | null
          disposition?: string | null
          id?: string
          level_of_consciousness?: string | null
          medications_given?: Json | null
          mental_status?: string | null
          narrative?: string | null
          patient_age_range?: Database["public"]["Enums"]["patient_age_range"]
          patient_gender?: string | null
          preceptor_feedback?: string | null
          preceptor_signature?: string | null
          preceptor_signature_credentials?: string | null
          preceptor_signature_data?: string | null
          preceptor_signature_name?: string | null
          preceptor_signed_at?: string | null
          primary_impression?: string | null
          procedures?: Json | null
          role_description?: string | null
          secondary_impression?: string | null
          site_name?: string | null
          site_type?: string | null
          skills_performed?: Json | null
          student_id?: string
          supervisor_credentials?: string | null
          supervisor_name?: string | null
          tenant_id?: string
          transport_destination?: string | null
          transport_mode?: string | null
          updated_at?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
          verified_by?: string | null
          vitals?: Json | null
          was_team_lead?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_patient_contacts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "clinical_shift_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_patient_contacts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_patient_contacts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_patient_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_patient_contacts_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_shift_bookings: {
        Row: {
          booked_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          hours_completed: number | null
          id: string
          notes: string | null
          preceptor_name: string | null
          preceptor_signature: string | null
          preceptor_signature_credentials: string | null
          preceptor_signature_data: string | null
          preceptor_signature_name: string | null
          preceptor_signed_at: string | null
          shift_id: string
          status: Database["public"]["Enums"]["booking_status"] | null
          student_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          booked_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          hours_completed?: number | null
          id?: string
          notes?: string | null
          preceptor_name?: string | null
          preceptor_signature?: string | null
          preceptor_signature_credentials?: string | null
          preceptor_signature_data?: string | null
          preceptor_signature_name?: string | null
          preceptor_signed_at?: string | null
          shift_id: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          student_id: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          booked_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          hours_completed?: number | null
          id?: string
          notes?: string | null
          preceptor_name?: string | null
          preceptor_signature?: string | null
          preceptor_signature_credentials?: string | null
          preceptor_signature_data?: string | null
          preceptor_signature_name?: string | null
          preceptor_signed_at?: string | null
          shift_id?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          student_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_shift_bookings_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "available_clinical_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_shift_bookings_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "clinical_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_shift_bookings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_shift_bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_shifts: {
        Row: {
          capacity: number | null
          course_id: string | null
          created_at: string | null
          created_by: string
          end_time: string
          id: string
          is_active: boolean | null
          notes: string | null
          shift_date: string
          site_id: string
          start_time: string
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          course_id?: string | null
          created_at?: string | null
          created_by: string
          end_time: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          shift_date: string
          site_id: string
          start_time: string
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string
          end_time?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          shift_date?: string
          site_id?: string
          start_time?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_shifts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_shifts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_shifts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "clinical_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_sites: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          preceptors: Json | null
          site_type: Database["public"]["Enums"]["clinical_site_type"] | null
          state: string | null
          tenant_id: string
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          preceptors?: Json | null
          site_type?: Database["public"]["Enums"]["clinical_site_type"] | null
          state?: string | null
          tenant_id: string
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          preceptors?: Json | null
          site_type?: Database["public"]["Enums"]["clinical_site_type"] | null
          state?: string | null
          tenant_id?: string
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_sites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      competency_verifications: {
        Row: {
          competency_id: string | null
          created_at: string | null
          cycle_id: string | null
          employee_id: string | null
          id: string
          is_batch_verification: boolean | null
          md_assignment_id: string | null
          notes: string | null
          signature_data: string | null
          signature_ip: string | null
          signature_timestamp: string | null
          tenant_id: string
          verification_method: string | null
          verified_at: string | null
          verified_by: string
        }
        Insert: {
          competency_id?: string | null
          created_at?: string | null
          cycle_id?: string | null
          employee_id?: string | null
          id?: string
          is_batch_verification?: boolean | null
          md_assignment_id?: string | null
          notes?: string | null
          signature_data?: string | null
          signature_ip?: string | null
          signature_timestamp?: string | null
          tenant_id: string
          verification_method?: string | null
          verified_at?: string | null
          verified_by: string
        }
        Update: {
          competency_id?: string | null
          created_at?: string | null
          cycle_id?: string | null
          employee_id?: string | null
          id?: string
          is_batch_verification?: boolean | null
          md_assignment_id?: string | null
          notes?: string | null
          signature_data?: string | null
          signature_ip?: string | null
          signature_timestamp?: string | null
          tenant_id?: string
          verification_method?: string | null
          verified_at?: string | null
          verified_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "competency_verifications_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "employee_competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competency_verifications_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "verification_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competency_verifications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "agency_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competency_verifications_md_assignment_id_fkey"
            columns: ["md_assignment_id"]
            isOneToOne: false
            referencedRelation: "medical_director_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competency_verifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competency_verifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          course_code: string | null
          course_type: Database["public"]["Enums"]["course_type"] | null
          created_at: string | null
          description: string | null
          end_date: string | null
          enrollment_code: string
          id: string
          instructor_id: string
          is_active: boolean | null
          is_archived: boolean | null
          max_students: number | null
          settings: Json | null
          start_date: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          course_code?: string | null
          course_type?: Database["public"]["Enums"]["course_type"] | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          enrollment_code: string
          id?: string
          instructor_id: string
          is_active?: boolean | null
          is_archived?: boolean | null
          max_students?: number | null
          settings?: Json | null
          start_date?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          course_code?: string | null
          course_type?: Database["public"]["Enums"]["course_type"] | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          enrollment_code?: string
          id?: string
          instructor_id?: string
          is_active?: boolean | null
          is_archived?: boolean | null
          max_students?: number | null
          settings?: Json | null
          start_date?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_instructors: {
        Row: {
          id: string
          course_id: string
          instructor_id: string
          role: "lead" | "coordinator" | "instructor" | "assistant" | "grader"
          can_edit: boolean
          can_grade: boolean
          can_manage_students: boolean
          added_by: string | null
          added_at: string
        }
        Insert: {
          id?: string
          course_id: string
          instructor_id: string
          role?: "lead" | "coordinator" | "instructor" | "assistant" | "grader"
          can_edit?: boolean
          can_grade?: boolean
          can_manage_students?: boolean
          added_by?: string | null
          added_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          instructor_id?: string
          role?: "lead" | "coordinator" | "instructor" | "assistant" | "grader"
          can_edit?: boolean
          can_grade?: boolean
          can_manage_students?: boolean
          added_by?: string | null
          added_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_instructors_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_instructors_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_templates: {
        Row: {
          id: string
          tenant_id: string
          created_by: string
          name: string
          description: string | null
          time_limit_minutes: number | null
          max_attempts: number
          shuffle_questions: boolean
          shuffle_options: boolean
          show_correct_answers: boolean
          passing_score: number
          questions: Json
          total_points: number
          question_count: number
          tags: string[]
          certification_level: string | null
          is_active: boolean
          times_used: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          created_by: string
          name: string
          description?: string | null
          time_limit_minutes?: number | null
          max_attempts?: number
          shuffle_questions?: boolean
          shuffle_options?: boolean
          show_correct_answers?: boolean
          passing_score?: number
          questions?: Json
          tags?: string[]
          certification_level?: string | null
          is_active?: boolean
          times_used?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          created_by?: string
          name?: string
          description?: string | null
          time_limit_minutes?: number | null
          max_attempts?: number
          shuffle_questions?: boolean
          shuffle_options?: boolean
          show_correct_answers?: boolean
          passing_score?: number
          questions?: Json
          tags?: string[]
          certification_level?: string | null
          is_active?: boolean
          times_used?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_posts: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          edited_at: string | null
          id: string
          is_anonymous: boolean | null
          parent_id: string | null
          tenant_id: string
          thread_id: string
          upvotes: number | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          parent_id?: string | null
          tenant_id: string
          thread_id: string
          upvotes?: number | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          parent_id?: string | null
          tenant_id?: string
          thread_id?: string
          upvotes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "discussion_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "discussion_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_posts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "discussion_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_threads: {
        Row: {
          author_id: string
          content: string
          course_id: string
          created_at: string | null
          id: string
          is_anonymous_allowed: boolean | null
          is_locked: boolean | null
          is_pinned: boolean | null
          module_id: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          course_id: string
          created_at?: string | null
          id?: string
          is_anonymous_allowed?: boolean | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          module_id?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          course_id?: string
          created_at?: string | null
          id?: string
          is_anonymous_allowed?: boolean | null
          is_locked?: boolean | null
          is_pinned?: boolean | null
          module_id?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussion_threads_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_threads_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_threads_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_threads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_competencies: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          cycle_id: string
          document_urls: string[] | null
          employee_id: string
          id: string
          notes: string | null
          skill_id: string
          status: Database["public"]["Enums"]["competency_status"] | null
          supervisor_approved: boolean | null
          supervisor_id: string | null
          supervisor_notes: string | null
          supervisor_reviewed_at: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          cycle_id: string
          document_urls?: string[] | null
          employee_id: string
          id?: string
          notes?: string | null
          skill_id: string
          status?: Database["public"]["Enums"]["competency_status"] | null
          supervisor_approved?: boolean | null
          supervisor_id?: string | null
          supervisor_notes?: string | null
          supervisor_reviewed_at?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          cycle_id?: string
          document_urls?: string[] | null
          employee_id?: string
          id?: string
          notes?: string | null
          skill_id?: string
          status?: Database["public"]["Enums"]["competency_status"] | null
          supervisor_approved?: boolean | null
          supervisor_id?: string | null
          supervisor_notes?: string | null
          supervisor_reviewed_at?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_competencies_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_competencies_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "verification_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_competencies_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "agency_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_competencies_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_competencies_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "agency_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_competencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completion_percentage: number | null
          course_id: string
          enrolled_at: string | null
          final_grade: number | null
          id: string
          status: Database["public"]["Enums"]["enrollment_status"] | null
          student_id: string
          tenant_id: string
        }
        Insert: {
          completion_percentage?: number | null
          course_id: string
          enrolled_at?: string | null
          final_grade?: number | null
          id?: string
          status?: Database["public"]["Enums"]["enrollment_status"] | null
          student_id: string
          tenant_id: string
        }
        Update: {
          completion_percentage?: number | null
          course_id?: string
          enrolled_at?: string | null
          final_grade?: number | null
          id?: string
          status?: Database["public"]["Enums"]["enrollment_status"] | null
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          course_id: string
          description: string | null
          end_time: string
          event_type: Database["public"]["Enums"]["event_type"] | null
          id: string
          is_mandatory: boolean | null
          location: string | null
          recurrence_rule: string | null
          start_time: string
          tenant_id: string
          title: string
          virtual_link: string | null
        }
        Insert: {
          course_id: string
          description?: string | null
          end_time: string
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string
          is_mandatory?: boolean | null
          location?: string | null
          recurrence_rule?: string | null
          start_time: string
          tenant_id: string
          title: string
          virtual_link?: string | null
        }
        Update: {
          course_id?: string
          description?: string | null
          end_time?: string
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string
          is_mandatory?: boolean | null
          location?: string | null
          recurrence_rule?: string | null
          start_time?: string
          tenant_id?: string
          title?: string
          virtual_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          attempt_number: number
          created_at: string | null
          current_theta: number | null
          exam_id: string | null
          id: string
          ip_address: unknown
          last_activity_at: string | null
          proctoring_session_id: string | null
          proctoring_violations: Json | null
          question_sequence: string[] | null
          questions_administered: number | null
          questions_answered: number | null
          standard_error: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["attempt_status"]
          student_id: string
          submitted_at: string | null
          template_id: string | null
          tenant_id: string
          time_used_seconds: number | null
          user_agent: string | null
        }
        Insert: {
          attempt_number?: number
          created_at?: string | null
          current_theta?: number | null
          exam_id?: string | null
          id?: string
          ip_address?: unknown
          last_activity_at?: string | null
          proctoring_session_id?: string | null
          proctoring_violations?: Json | null
          question_sequence?: string[] | null
          questions_administered?: number | null
          questions_answered?: number | null
          standard_error?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["attempt_status"]
          student_id: string
          submitted_at?: string | null
          template_id?: string | null
          tenant_id: string
          time_used_seconds?: number | null
          user_agent?: string | null
        }
        Update: {
          attempt_number?: number
          created_at?: string | null
          current_theta?: number | null
          exam_id?: string | null
          id?: string
          ip_address?: unknown
          last_activity_at?: string | null
          proctoring_session_id?: string | null
          proctoring_violations?: Json | null
          question_sequence?: string[] | null
          questions_administered?: number | null
          questions_answered?: number | null
          standard_error?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["attempt_status"]
          student_id?: string
          submitted_at?: string | null
          template_id?: string | null
          tenant_id?: string
          time_used_seconds?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "standardized_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "standardized_exam_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_responses: {
        Row: {
          answered_at: string | null
          attempt_id: string
          created_at: string | null
          flagged_for_review: boolean | null
          id: string
          information_value: number | null
          is_correct: boolean | null
          points_earned: number | null
          presented_at: string
          question_id: string
          selected_answer: Json | null
          sequence_number: number
          theta_after: number | null
          theta_before: number | null
          time_spent_seconds: number | null
        }
        Insert: {
          answered_at?: string | null
          attempt_id: string
          created_at?: string | null
          flagged_for_review?: boolean | null
          id?: string
          information_value?: number | null
          is_correct?: boolean | null
          points_earned?: number | null
          presented_at: string
          question_id: string
          selected_answer?: Json | null
          sequence_number: number
          theta_after?: number | null
          theta_before?: number | null
          time_spent_seconds?: number | null
        }
        Update: {
          answered_at?: string | null
          attempt_id?: string
          created_at?: string | null
          flagged_for_review?: boolean | null
          id?: string
          information_value?: number | null
          is_correct?: boolean | null
          points_earned?: number | null
          presented_at?: string
          question_id?: string
          selected_answer?: Json | null
          sequence_number?: number
          theta_after?: number | null
          theta_before?: number | null
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "standardized_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_results: {
        Row: {
          attempt_id: string
          calculated_at: string | null
          category_scores: Json | null
          cohort_rank: number | null
          cohort_size: number | null
          id: string
          national_percentile: number | null
          pass_probability: number | null
          passed: boolean | null
          percentile: number | null
          raw_score: number | null
          recommended_focus_areas: string[] | null
          scaled_score: number | null
          strengths: string[] | null
          theta_score: number | null
          weaknesses: string[] | null
        }
        Insert: {
          attempt_id: string
          calculated_at?: string | null
          category_scores?: Json | null
          cohort_rank?: number | null
          cohort_size?: number | null
          id?: string
          national_percentile?: number | null
          pass_probability?: number | null
          passed?: boolean | null
          percentile?: number | null
          raw_score?: number | null
          recommended_focus_areas?: string[] | null
          scaled_score?: number | null
          strengths?: string[] | null
          theta_score?: number | null
          weaknesses?: string[] | null
        }
        Update: {
          attempt_id?: string
          calculated_at?: string | null
          category_scores?: Json | null
          cohort_rank?: number | null
          cohort_size?: number | null
          id?: string
          national_percentile?: number | null
          pass_probability?: number | null
          passed?: boolean | null
          percentile?: number | null
          raw_score?: number | null
          recommended_focus_areas?: string[] | null
          scaled_score?: number | null
          strengths?: string[] | null
          theta_score?: number | null
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          context: Database["public"]["Enums"]["file_context"]
          context_id: string | null
          created_at: string | null
          file_size: number
          file_type: string
          filename: string
          id: string
          storage_path: string
          tenant_id: string
          uploaded_by: string
        }
        Insert: {
          context: Database["public"]["Enums"]["file_context"]
          context_id?: string | null
          created_at?: string | null
          file_size: number
          file_type: string
          filename: string
          id?: string
          storage_path: string
          tenant_id: string
          uploaded_by: string
        }
        Update: {
          context?: Database["public"]["Enums"]["file_context"]
          context_id?: string | null
          created_at?: string | null
          file_size?: number
          file_type?: string
          filename?: string
          id?: string
          storage_path?: string
          tenant_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: Json | null
          content_type: Database["public"]["Enums"]["content_type"] | null
          document_url: string | null
          duration_minutes: number | null
          id: string
          is_published: boolean | null
          module_id: string
          order_index: number | null
          tenant_id: string
          title: string
          video_url: string | null
        }
        Insert: {
          content?: Json | null
          content_type?: Database["public"]["Enums"]["content_type"] | null
          document_url?: string | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          module_id: string
          order_index?: number | null
          tenant_id: string
          title: string
          video_url?: string | null
        }
        Update: {
          content?: Json | null
          content_type?: Database["public"]["Enums"]["content_type"] | null
          document_url?: string | null
          duration_minutes?: number | null
          id?: string
          is_published?: boolean | null
          module_id?: string
          order_index?: number | null
          tenant_id?: string
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_director_assignments: {
        Row: {
          assigned_at: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          md_credentials: string | null
          md_email: string | null
          md_license_number: string | null
          md_name: string
          md_phone: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          md_credentials?: string | null
          md_email?: string | null
          md_license_number?: string | null
          md_name: string
          md_phone?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          md_credentials?: string | null
          md_email?: string | null
          md_license_number?: string | null
          md_name?: string
          md_phone?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_director_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_director_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          description: string | null
          id: string
          is_published: boolean | null
          order_index: number | null
          tenant_id: string
          title: string
          unlock_date: string | null
        }
        Insert: {
          course_id: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          order_index?: number | null
          tenant_id: string
          title: string
          unlock_date?: string | null
        }
        Update: {
          course_id?: string
          description?: string | null
          id?: string
          is_published?: boolean | null
          order_index?: number | null
          tenant_id?: string
          title?: string
          unlock_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          tenant_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          tenant_id?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      nremt_categories: {
        Row: {
          certification_level: string
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          weight_percentage: number | null
        }
        Insert: {
          certification_level: string
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          weight_percentage?: number | null
        }
        Update: {
          certification_level?: string
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          weight_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nremt_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "nremt_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string | null
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      portfolio_artifacts: {
        Row: {
          artifact_type: string
          content: string | null
          created_at: string | null
          description: string | null
          external_url: string | null
          file_url: string | null
          id: string
          is_featured: boolean | null
          order_index: number
          reflection: string | null
          section_id: string
          source_id: string | null
          source_type: string | null
          tags: string[] | null
          tenant_id: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          artifact_type: string
          content?: string | null
          created_at?: string | null
          description?: string | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_featured?: boolean | null
          order_index?: number
          reflection?: string | null
          section_id: string
          source_id?: string | null
          source_type?: string | null
          tags?: string[] | null
          tenant_id: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          artifact_type?: string
          content?: string | null
          created_at?: string | null
          description?: string | null
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_featured?: boolean | null
          order_index?: number
          reflection?: string | null
          section_id?: string
          source_id?: string | null
          source_type?: string | null
          tags?: string[] | null
          tenant_id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_artifacts_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "portfolio_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_artifacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_sections: {
        Row: {
          content: string | null
          created_at: string | null
          description: string | null
          id: string
          is_visible: boolean | null
          order_index: number
          portfolio_id: string
          section_type: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_visible?: boolean | null
          order_index?: number
          portfolio_id: string
          section_type?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_visible?: boolean | null
          order_index?: number
          portfolio_id?: string
          section_type?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_sections_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_sections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_shares: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          last_viewed_at: string | null
          permissions: string | null
          portfolio_id: string
          share_token: string | null
          share_type: string
          shared_with_email: string | null
          shared_with_user_id: string | null
          tenant_id: string
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          permissions?: string | null
          portfolio_id: string
          share_token?: string | null
          share_type: string
          shared_with_email?: string | null
          shared_with_user_id?: string | null
          tenant_id: string
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_viewed_at?: string | null
          permissions?: string | null
          portfolio_id?: string
          share_token?: string | null
          share_type?: string
          shared_with_email?: string | null
          shared_with_user_id?: string | null
          tenant_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_shares_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_shares_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_shares_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          custom_css: string | null
          description: string | null
          id: string
          is_public: boolean | null
          is_published: boolean | null
          layout_config: Json | null
          owner_id: string
          portfolio_type: string | null
          published_at: string | null
          tenant_id: string
          theme: string | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          custom_css?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          is_published?: boolean | null
          layout_config?: Json | null
          owner_id: string
          portfolio_type?: string | null
          published_at?: string | null
          tenant_id: string
          theme?: string | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          custom_css?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          is_published?: boolean | null
          layout_config?: Json | null
          owner_id?: string
          portfolio_type?: string | null
          published_at?: string | null
          tenant_id?: string
          theme?: string | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolios_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string | null
          user_email: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string | null
          user_email: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string | null
          user_email?: string
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          avg_time_seconds: number | null
          category_id: string | null
          certification_level:
            | Database["public"]["Enums"]["certification_level"]
            | null
          correct_answer: Json
          created_at: string | null
          created_by: string | null
          difficulty: Database["public"]["Enums"]["question_difficulty"] | null
          discrimination_index: number | null
          explanation: string | null
          id: string
          irt_difficulty: number | null
          irt_discrimination: number | null
          irt_guessing: number | null
          is_active: boolean | null
          is_validated: boolean | null
          options: Json | null
          points: number | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"] | null
          references: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string | null
          tags: string[] | null
          tenant_id: string | null
          time_estimate_seconds: number | null
          times_correct: number | null
          times_used: number | null
          updated_at: string | null
        }
        Insert: {
          avg_time_seconds?: number | null
          category_id?: string | null
          certification_level?:
            | Database["public"]["Enums"]["certification_level"]
            | null
          correct_answer: Json
          created_at?: string | null
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["question_difficulty"] | null
          discrimination_index?: number | null
          explanation?: string | null
          id?: string
          irt_difficulty?: number | null
          irt_discrimination?: number | null
          irt_guessing?: number | null
          is_active?: boolean | null
          is_validated?: boolean | null
          options?: Json | null
          points?: number | null
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"] | null
          references?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          time_estimate_seconds?: number | null
          times_correct?: number | null
          times_used?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_time_seconds?: number | null
          category_id?: string | null
          certification_level?:
            | Database["public"]["Enums"]["certification_level"]
            | null
          correct_answer?: Json
          created_at?: string | null
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["question_difficulty"] | null
          discrimination_index?: number | null
          explanation?: string | null
          id?: string
          irt_difficulty?: number | null
          irt_discrimination?: number | null
          irt_guessing?: number | null
          is_active?: boolean | null
          is_validated?: boolean | null
          options?: Json | null
          points?: number | null
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"] | null
          references?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          time_estimate_seconds?: number | null
          times_correct?: number | null
          times_used?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "question_bank_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      question_bank_categories: {
        Row: {
          certification_level:
            | Database["public"]["Enums"]["certification_level"]
            | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          nremt_category_code: string | null
          order_index: number | null
          parent_category_id: string | null
          tenant_id: string | null
        }
        Insert: {
          certification_level?:
            | Database["public"]["Enums"]["certification_level"]
            | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          nremt_category_code?: string | null
          order_index?: number | null
          parent_category_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          certification_level?:
            | Database["public"]["Enums"]["certification_level"]
            | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          nremt_category_code?: string | null
          order_index?: number | null
          parent_category_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "question_bank_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      question_bank_stats: {
        Row: {
          assignment_id: string | null
          attempt_number: number | null
          certification_level:
            | Database["public"]["Enums"]["certification_level"]
            | null
          created_at: string | null
          id: string
          is_correct: boolean
          question_id: string
          student_answer: Json | null
          student_id: string
          time_spent_seconds: number | null
        }
        Insert: {
          assignment_id?: string | null
          attempt_number?: number | null
          certification_level?:
            | Database["public"]["Enums"]["certification_level"]
            | null
          created_at?: string | null
          id?: string
          is_correct: boolean
          question_id: string
          student_answer?: Json | null
          student_id: string
          time_spent_seconds?: number | null
        }
        Update: {
          assignment_id?: string | null
          attempt_number?: number | null
          certification_level?:
            | Database["public"]["Enums"]["certification_level"]
            | null
          created_at?: string | null
          id?: string
          is_correct?: boolean
          question_id?: string
          student_answer?: Json | null
          student_id?: string
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_stats_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_stats_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_stats_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      question_tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "question_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          assignment_id: string
          correct_answer: Json
          explanation: string | null
          id: string
          options: Json | null
          order_index: number | null
          points: number | null
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"] | null
          tenant_id: string
        }
        Insert: {
          assignment_id: string
          correct_answer: Json
          explanation?: string | null
          id?: string
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"] | null
          tenant_id: string
        }
        Update: {
          assignment_id?: string
          correct_answer?: Json
          explanation?: string | null
          id?: string
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"] | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_verifications: {
        Row: {
          document_id: string
          document_type: string
          id: string
          ip_address: string | null
          signature_data: string
          signed_at: string | null
          signer_credentials: string | null
          signer_id: string | null
          signer_name: string
          tenant_id: string | null
          user_agent: string | null
          verified_hash: string | null
        }
        Insert: {
          document_id: string
          document_type: string
          id?: string
          ip_address?: string | null
          signature_data: string
          signed_at?: string | null
          signer_credentials?: string | null
          signer_id?: string | null
          signer_name: string
          tenant_id?: string | null
          user_agent?: string | null
          verified_hash?: string | null
        }
        Update: {
          document_id?: string
          document_type?: string
          id?: string
          ip_address?: string | null
          signature_data?: string
          signed_at?: string | null
          signer_credentials?: string | null
          signer_id?: string | null
          signer_name?: string
          tenant_id?: string | null
          user_agent?: string | null
          verified_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_verifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_attempts: {
        Row: {
          attempt_number: number | null
          course_id: string
          evaluated_at: string | null
          evaluator_id: string | null
          feedback: string | null
          id: string
          notes: string | null
          skill_id: string
          status: Database["public"]["Enums"]["skill_status"] | null
          step_results: Json | null
          student_id: string
          tenant_id: string
        }
        Insert: {
          attempt_number?: number | null
          course_id: string
          evaluated_at?: string | null
          evaluator_id?: string | null
          feedback?: string | null
          id?: string
          notes?: string | null
          skill_id: string
          status?: Database["public"]["Enums"]["skill_status"] | null
          step_results?: Json | null
          student_id: string
          tenant_id: string
        }
        Update: {
          attempt_number?: number | null
          course_id?: string
          evaluated_at?: string | null
          evaluator_id?: string | null
          feedback?: string | null
          id?: string
          notes?: string | null
          skill_id?: string
          status?: Database["public"]["Enums"]["skill_status"] | null
          step_results?: Json | null
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_attempts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_attempts_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_attempts_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_categories: {
        Row: {
          course_type: Database["public"]["Enums"]["course_type"]
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          required_count: number | null
          tenant_id: string
        }
        Insert: {
          course_type: Database["public"]["Enums"]["course_type"]
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          required_count?: number | null
          tenant_id: string
        }
        Update: {
          course_type?: Database["public"]["Enums"]["course_type"]
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          required_count?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_library: {
        Row: {
          category: string
          certification_levels:
            | Database["public"]["Enums"]["certification_level"][]
            | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          is_system_default: boolean | null
          name: string
          requires_annual_verification: boolean | null
          skill_code: string | null
          state_code: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          certification_levels?:
            | Database["public"]["Enums"]["certification_level"][]
            | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          is_system_default?: boolean | null
          name: string
          requires_annual_verification?: boolean | null
          skill_code?: string | null
          state_code?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          certification_levels?:
            | Database["public"]["Enums"]["certification_level"][]
            | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          is_system_default?: boolean | null
          name?: string
          requires_annual_verification?: boolean | null
          skill_code?: string | null
          state_code?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_library_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_sheet_attempts: {
        Row: {
          attempt_date: string | null
          attempt_number: number | null
          course_id: string | null
          created_at: string | null
          critical_failures: string[] | null
          evaluator_id: string | null
          evaluator_notes: string | null
          evaluator_signature: string | null
          evaluator_signature_credentials: string | null
          evaluator_signature_data: string | null
          evaluator_signature_name: string | null
          evaluator_signed_at: string | null
          id: string
          passed: boolean | null
          remediation_plan: string | null
          signature_timestamp: string | null
          step_results: Json
          student_id: string
          student_reflection: string | null
          student_signature_data: string | null
          student_signed_at: string | null
          template_id: string
          tenant_id: string
          time_taken_seconds: number | null
          total_score: number | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          attempt_date?: string | null
          attempt_number?: number | null
          course_id?: string | null
          created_at?: string | null
          critical_failures?: string[] | null
          evaluator_id?: string | null
          evaluator_notes?: string | null
          evaluator_signature?: string | null
          evaluator_signature_credentials?: string | null
          evaluator_signature_data?: string | null
          evaluator_signature_name?: string | null
          evaluator_signed_at?: string | null
          id?: string
          passed?: boolean | null
          remediation_plan?: string | null
          signature_timestamp?: string | null
          step_results?: Json
          student_id: string
          student_reflection?: string | null
          student_signature_data?: string | null
          student_signed_at?: string | null
          template_id: string
          tenant_id: string
          time_taken_seconds?: number | null
          total_score?: number | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          attempt_date?: string | null
          attempt_number?: number | null
          course_id?: string | null
          created_at?: string | null
          critical_failures?: string[] | null
          evaluator_id?: string | null
          evaluator_notes?: string | null
          evaluator_signature?: string | null
          evaluator_signature_credentials?: string | null
          evaluator_signature_data?: string | null
          evaluator_signature_name?: string | null
          evaluator_signed_at?: string | null
          id?: string
          passed?: boolean | null
          remediation_plan?: string | null
          signature_timestamp?: string | null
          step_results?: Json
          student_id?: string
          student_reflection?: string | null
          student_signature_data?: string | null
          student_signed_at?: string | null
          template_id?: string
          tenant_id?: string
          time_taken_seconds?: number | null
          total_score?: number | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_sheet_attempts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_sheet_attempts_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_sheet_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_sheet_attempts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "skill_sheet_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_sheet_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_sheet_templates: {
        Row: {
          category: string
          certification_level: Database["public"]["Enums"]["certification_level"]
          created_at: string | null
          critical_criteria: Json
          description: string | null
          equipment_needed: string[] | null
          id: string
          is_active: boolean | null
          name: string
          passing_score: number | null
          patient_scenario: string | null
          setup_instructions: string | null
          skill_code: string | null
          steps: Json
          time_limit_seconds: number | null
          total_points: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          certification_level: Database["public"]["Enums"]["certification_level"]
          created_at?: string | null
          critical_criteria?: Json
          description?: string | null
          equipment_needed?: string[] | null
          id?: string
          is_active?: boolean | null
          name: string
          passing_score?: number | null
          patient_scenario?: string | null
          setup_instructions?: string | null
          skill_code?: string | null
          steps?: Json
          time_limit_seconds?: number | null
          total_points?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          certification_level?: Database["public"]["Enums"]["certification_level"]
          created_at?: string | null
          critical_criteria?: Json
          description?: string | null
          equipment_needed?: string[] | null
          id?: string
          is_active?: boolean | null
          name?: string
          passing_score?: number | null
          patient_scenario?: string | null
          setup_instructions?: string | null
          skill_code?: string | null
          steps?: Json
          time_limit_seconds?: number | null
          total_points?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      skills: {
        Row: {
          category_id: string
          description: string | null
          id: string
          name: string
          passing_criteria: string | null
          steps: Json | null
          tenant_id: string
        }
        Insert: {
          category_id: string
          description?: string | null
          id?: string
          name: string
          passing_criteria?: string | null
          steps?: Json | null
          tenant_id: string
        }
        Update: {
          category_id?: string
          description?: string | null
          id?: string
          name?: string
          passing_criteria?: string | null
          steps?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "skill_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      standardized_exam_templates: {
        Row: {
          allow_review: boolean | null
          cat_settings: Json | null
          category_weights: Json
          certification_level: string
          created_at: string | null
          cut_score_method: string | null
          delivery_mode: Database["public"]["Enums"]["exam_delivery_mode"]
          description: string | null
          exam_type: Database["public"]["Enums"]["standardized_exam_type"]
          id: string
          is_active: boolean | null
          is_system_template: boolean | null
          max_questions: number | null
          min_questions: number | null
          name: string
          passing_score: number
          security_level: Database["public"]["Enums"]["exam_security_level"]
          show_correct_answers: boolean | null
          show_results_immediately: boolean | null
          shuffle_options: boolean | null
          shuffle_questions: boolean | null
          tenant_id: string | null
          time_limit_minutes: number | null
          total_questions: number | null
          updated_at: string | null
        }
        Insert: {
          allow_review?: boolean | null
          cat_settings?: Json | null
          category_weights?: Json
          certification_level: string
          created_at?: string | null
          cut_score_method?: string | null
          delivery_mode?: Database["public"]["Enums"]["exam_delivery_mode"]
          description?: string | null
          exam_type: Database["public"]["Enums"]["standardized_exam_type"]
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          max_questions?: number | null
          min_questions?: number | null
          name: string
          passing_score?: number
          security_level?: Database["public"]["Enums"]["exam_security_level"]
          show_correct_answers?: boolean | null
          show_results_immediately?: boolean | null
          shuffle_options?: boolean | null
          shuffle_questions?: boolean | null
          tenant_id?: string | null
          time_limit_minutes?: number | null
          total_questions?: number | null
          updated_at?: string | null
        }
        Update: {
          allow_review?: boolean | null
          cat_settings?: Json | null
          category_weights?: Json
          certification_level?: string
          created_at?: string | null
          cut_score_method?: string | null
          delivery_mode?: Database["public"]["Enums"]["exam_delivery_mode"]
          description?: string | null
          exam_type?: Database["public"]["Enums"]["standardized_exam_type"]
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          max_questions?: number | null
          min_questions?: number | null
          name?: string
          passing_score?: number
          security_level?: Database["public"]["Enums"]["exam_security_level"]
          show_correct_answers?: boolean | null
          show_results_immediately?: boolean | null
          shuffle_options?: boolean | null
          shuffle_questions?: boolean | null
          tenant_id?: string | null
          time_limit_minutes?: number | null
          total_questions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "standardized_exam_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      standardized_exams: {
        Row: {
          available_from: string | null
          available_until: string | null
          course_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          instructions: string | null
          is_published: boolean | null
          question_ids: string[] | null
          security_level_override:
            | Database["public"]["Enums"]["exam_security_level"]
            | null
          template_id: string
          tenant_id: string
          time_limit_override: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          available_from?: string | null
          available_until?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          question_ids?: string[] | null
          security_level_override?:
            | Database["public"]["Enums"]["exam_security_level"]
            | null
          template_id: string
          tenant_id: string
          time_limit_override?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          available_from?: string | null
          available_until?: string | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          instructions?: string | null
          is_published?: boolean | null
          question_ids?: string[] | null
          security_level_override?:
            | Database["public"]["Enums"]["exam_security_level"]
            | null
          template_id?: string
          tenant_id?: string
          time_limit_override?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "standardized_exams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standardized_exams_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "standardized_exam_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standardized_exams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      standardized_questions: {
        Row: {
          average_time_seconds: number | null
          certification_level: string
          cognitive_level: Database["public"]["Enums"]["cognitive_level"]
          contributor_id: string | null
          correct_answer: Json
          created_at: string | null
          difficulty: Database["public"]["Enums"]["question_difficulty"]
          id: string
          irt_a: number | null
          irt_b: number | null
          irt_c: number | null
          is_active: boolean | null
          nremt_category_id: string | null
          options: Json
          point_biserial: number | null
          question_text: string
          question_type: string
          rationale: string | null
          references: string[] | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string | null
          tenant_id: string | null
          times_correct: number | null
          times_used: number | null
          updated_at: string | null
        }
        Insert: {
          average_time_seconds?: number | null
          certification_level: string
          cognitive_level?: Database["public"]["Enums"]["cognitive_level"]
          contributor_id?: string | null
          correct_answer: Json
          created_at?: string | null
          difficulty?: Database["public"]["Enums"]["question_difficulty"]
          id?: string
          irt_a?: number | null
          irt_b?: number | null
          irt_c?: number | null
          is_active?: boolean | null
          nremt_category_id?: string | null
          options?: Json
          point_biserial?: number | null
          question_text: string
          question_type?: string
          rationale?: string | null
          references?: string[] | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          tenant_id?: string | null
          times_correct?: number | null
          times_used?: number | null
          updated_at?: string | null
        }
        Update: {
          average_time_seconds?: number | null
          certification_level?: string
          cognitive_level?: Database["public"]["Enums"]["cognitive_level"]
          contributor_id?: string | null
          correct_answer?: Json
          created_at?: string | null
          difficulty?: Database["public"]["Enums"]["question_difficulty"]
          id?: string
          irt_a?: number | null
          irt_b?: number | null
          irt_c?: number | null
          is_active?: boolean | null
          nremt_category_id?: string | null
          options?: Json
          point_biserial?: number | null
          question_text?: string
          question_type?: string
          rationale?: string | null
          references?: string[] | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          tenant_id?: string | null
          times_correct?: number | null
          times_used?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "standardized_questions_nremt_category_id_fkey"
            columns: ["nremt_category_id"]
            isOneToOne: false
            referencedRelation: "nremt_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standardized_questions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          assignment_id: string
          attempt_number: number | null
          content: Json | null
          curved_score: number | null
          feedback: Json | null
          file_urls: Json | null
          final_score: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          raw_score: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["submission_status"] | null
          student_id: string
          submitted_at: string | null
          tenant_id: string
        }
        Insert: {
          assignment_id: string
          attempt_number?: number | null
          content?: Json | null
          curved_score?: number | null
          feedback?: Json | null
          file_urls?: Json | null
          final_score?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          raw_score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["submission_status"] | null
          student_id: string
          submitted_at?: string | null
          tenant_id: string
        }
        Update: {
          assignment_id?: string
          attempt_number?: number | null
          content?: Json | null
          curved_score?: number | null
          feedback?: Json | null
          file_urls?: Json | null
          final_score?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          raw_score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["submission_status"] | null
          student_id?: string
          submitted_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_history: {
        Row: {
          created_at: string | null
          ended_at: string | null
          id: string
          started_at: string
          stripe_invoice_id: string | null
          tenant_id: string
          tier: Database["public"]["Enums"]["subscription_tier"]
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          started_at: string
          stripe_invoice_id?: string | null
          tenant_id: string
          tier: Database["public"]["Enums"]["subscription_tier"]
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          started_at?: string
          stripe_invoice_id?: string | null
          tenant_id?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          agency_code: string
          created_at: string | null
          custom_domain: string | null
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          settings: Json | null
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          tenant_type: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          agency_code?: string
          created_at?: string | null
          custom_domain?: string | null
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          settings?: Json | null
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          tenant_type?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_code?: string
          created_at?: string | null
          custom_domain?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          settings?: Json | null
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          tenant_type?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_signatures: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          signature_data: string
          signature_type: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          signature_data: string
          signature_type?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          signature_data?: string
          signature_type?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_signatures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          emergency_contact: Json | null
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          emergency_contact?: Json | null
          full_name: string
          id: string
          is_active?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          emergency_contact?: Json | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_cycles: {
        Row: {
          created_at: string | null
          cycle_type: Database["public"]["Enums"]["verification_cycle_type"]
          end_date: string
          id: string
          is_active: boolean | null
          is_locked: boolean | null
          name: string
          start_date: string
          tenant_id: string
          updated_at: string | null
          year: number | null
        }
        Insert: {
          created_at?: string | null
          cycle_type: Database["public"]["Enums"]["verification_cycle_type"]
          end_date: string
          id?: string
          is_active?: boolean | null
          is_locked?: boolean | null
          name: string
          start_date: string
          tenant_id: string
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string | null
          cycle_type?: Database["public"]["Enums"]["verification_cycle_type"]
          end_date?: string
          id?: string
          is_active?: boolean | null
          is_locked?: boolean | null
          name?: string
          start_date?: string
          tenant_id?: string
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_cycles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      video_session_attendance: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          id: string
          join_count: number | null
          joined_at: string | null
          left_at: string | null
          session_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          join_count?: number | null
          joined_at?: string | null
          left_at?: string | null
          session_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          join_count?: number | null
          joined_at?: string | null
          left_at?: string | null
          session_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_session_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "video_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_session_attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_session_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      video_sessions: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          attendee_count: number | null
          course_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_recording_available: boolean | null
          is_recurring: boolean | null
          join_url: string | null
          manual_link: string | null
          password: string | null
          recording_password: string | null
          recording_url: string | null
          recurrence_rule: string | null
          scheduled_end: string
          scheduled_start: string
          session_type: string
          start_url: string | null
          status: string | null
          tenant_id: string
          timezone: string | null
          title: string
          updated_at: string | null
          video_platform: string | null
          zoom_meeting_id: string | null
          zoom_meeting_uuid: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          attendee_count?: number | null
          course_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_recording_available?: boolean | null
          is_recurring?: boolean | null
          join_url?: string | null
          manual_link?: string | null
          password?: string | null
          recording_password?: string | null
          recording_url?: string | null
          recurrence_rule?: string | null
          scheduled_end: string
          scheduled_start: string
          session_type?: string
          start_url?: string | null
          status?: string | null
          tenant_id: string
          timezone?: string | null
          title: string
          updated_at?: string | null
          video_platform?: string | null
          zoom_meeting_id?: string | null
          zoom_meeting_uuid?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          attendee_count?: number | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_recording_available?: boolean | null
          is_recurring?: boolean | null
          join_url?: string | null
          manual_link?: string | null
          password?: string | null
          recording_password?: string | null
          recording_url?: string | null
          recurrence_rule?: string | null
          scheduled_end?: string
          scheduled_start?: string
          session_type?: string
          start_url?: string | null
          status?: string | null
          tenant_id?: string
          timezone?: string | null
          title?: string
          updated_at?: string | null
          video_platform?: string | null
          zoom_meeting_id?: string | null
          zoom_meeting_uuid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      zoom_connections: {
        Row: {
          access_token: string
          created_at: string | null
          id: string
          is_active: boolean | null
          refresh_token: string
          scopes: string[] | null
          tenant_id: string
          token_expires_at: string
          updated_at: string | null
          user_id: string
          zoom_email: string | null
          zoom_user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          refresh_token: string
          scopes?: string[] | null
          tenant_id: string
          token_expires_at: string
          updated_at?: string | null
          user_id: string
          zoom_email?: string | null
          zoom_user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          refresh_token?: string
          scopes?: string[] | null
          tenant_id?: string
          token_expires_at?: string
          updated_at?: string | null
          user_id?: string
          zoom_email?: string | null
          zoom_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zoom_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zoom_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      available_clinical_shifts: {
        Row: {
          available_slots: number | null
          booked_count: number | null
          capacity: number | null
          course_id: string | null
          created_at: string | null
          created_by: string | null
          end_time: string | null
          id: string | null
          is_active: boolean | null
          is_available: boolean | null
          notes: string | null
          shift_date: string | null
          site_address: string | null
          site_city: string | null
          site_id: string | null
          site_name: string | null
          site_state: string | null
          site_type: Database["public"]["Enums"]["clinical_site_type"] | null
          start_time: string | null
          tenant_id: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_shifts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_shifts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_shifts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "clinical_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cat_session_analytics: {
        Row: {
          avg_ability: number | null
          avg_questions: number | null
          avg_score: number | null
          failed: number | null
          month: string | null
          passed: number | null
          tenant_id: string | null
          total_sessions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cat_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      book_clinical_shift: {
        Args: { p_shift_id: string; p_student_id: string; p_tenant_id: string }
        Returns: {
          booked_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          hours_completed: number | null
          id: string
          notes: string | null
          preceptor_name: string | null
          preceptor_signature: string | null
          preceptor_signature_credentials: string | null
          preceptor_signature_data: string | null
          preceptor_signature_name: string | null
          preceptor_signed_at: string | null
          shift_id: string
          status: Database["public"]["Enums"]["booking_status"] | null
          student_id: string
          tenant_id: string
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "clinical_shift_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      calculate_item_information: {
        Args: {
          ability: number
          difficulty: number
          discrimination: number
          guessing?: number
        }
        Returns: number
      }
      cancel_clinical_booking: {
        Args: {
          p_booking_id: string
          p_reason?: string
          p_student_id: string
          p_tenant_id: string
        }
        Returns: {
          booked_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          hours_completed: number | null
          id: string
          notes: string | null
          preceptor_name: string | null
          preceptor_signature: string | null
          preceptor_signature_credentials: string | null
          preceptor_signature_data: string | null
          preceptor_signature_name: string | null
          preceptor_signed_at: string | null
          shift_id: string
          status: Database["public"]["Enums"]["booking_status"] | null
          student_id: string
          tenant_id: string
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "clinical_shift_bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_agency_code: { Args: never; Returns: string }
      get_accreditation_compliance_summary: {
        Args: { p_tenant_id: string }
        Returns: {
          approved_documents: number
          category: Database["public"]["Enums"]["accreditation_doc_category"]
          expiring_soon: number
          pending_documents: number
          total_documents: number
        }[]
      }
      get_employee_cycle_completion: {
        Args: { p_cycle_id: string; p_employee_id: string }
        Returns: number
      }
      get_expiring_accreditation_documents: {
        Args: { p_days_ahead?: number; p_tenant_id: string }
        Returns: {
          category: Database["public"]["Enums"]["accreditation_doc_category"]
          created_at: string | null
          description: string | null
          effective_date: string | null
          expiration_date: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["accreditation_doc_status"]
          tags: string[] | null
          tenant_id: string
          title: string
          updated_at: string | null
          uploaded_by: string
          version: number
        }[]
        SetofOptions: {
          from: "*"
          to: "accreditation_documents"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_next_cat_question: {
        Args: {
          p_answered_ids: string[]
          p_category_id?: string
          p_certification_level?: string
          p_current_ability: number
          p_student_id: string
        }
        Returns: {
          correct_answer: Json
          explanation: string
          id: string
          information_value: number
          options: Json
          question_text: string
          question_type: string
        }[]
      }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_tenant_id: { Args: never; Returns: string }
      is_medical_director: { Args: { tenant_uuid: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      record_signature_verification: {
        Args: {
          p_document_id: string
          p_document_type: string
          p_ip_address?: string
          p_signature_data: string
          p_signer_credentials: string
          p_signer_id: string
          p_signer_name: string
          p_tenant_id: string
          p_user_agent?: string
        }
        Returns: {
          document_id: string
          document_type: string
          id: string
          ip_address: string | null
          signature_data: string
          signed_at: string | null
          signer_credentials: string | null
          signer_id: string | null
          signer_name: string
          tenant_id: string | null
          user_agent: string | null
          verified_hash: string | null
        }
        SetofOptions: {
          from: "*"
          to: "signature_verifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      accreditation_doc_category:
        | "program_information"
        | "personnel"
        | "curriculum"
        | "clinical_affiliations"
        | "equipment"
        | "policies"
        | "assessment"
        | "outcomes"
        | "meeting_minutes"
        | "other"
      accreditation_doc_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "expired"
        | "archived"
      assignment_type: "quiz" | "written" | "skill_checklist" | "discussion"
      attempt_status:
        | "not_started"
        | "in_progress"
        | "submitted"
        | "timed_out"
        | "abandoned"
        | "graded"
        | "invalidated"
      attendance_status: "present" | "absent" | "late" | "excused"
      booking_status: "booked" | "completed" | "cancelled" | "no_show"
      certification_level: "EMR" | "EMT" | "AEMT" | "Paramedic" | "All"
      clinical_site_type:
        | "hospital"
        | "ambulance_service"
        | "fire_department"
        | "urgent_care"
        | "other"
      cognitive_level:
        | "remember"
        | "understand"
        | "apply"
        | "analyze"
        | "evaluate"
        | "create"
      competency_status:
        | "not_started"
        | "in_progress"
        | "pending_review"
        | "verified"
        | "expired"
        | "failed"
      content_type: "video" | "document" | "text" | "embed"
      course_type: "EMR" | "EMT" | "AEMT" | "Paramedic" | "Custom"
      enrollment_status: "active" | "completed" | "dropped"
      event_type: "class" | "lab" | "clinical" | "exam" | "other"
      exam_delivery_mode: "standard" | "adaptive"
      exam_security_level: "low" | "medium" | "high"
      file_context: "course" | "assignment" | "submission" | "profile"
      log_type: "hours" | "patient_contact"
      notification_type: "assignment" | "grade" | "announcement" | "reminder"
      patient_age_range:
        | "neonate"
        | "infant"
        | "toddler"
        | "preschool"
        | "school_age"
        | "adolescent"
        | "adult"
        | "geriatric"
      question_difficulty: "easy" | "medium" | "hard" | "expert"
      question_type:
        | "multiple_choice"
        | "true_false"
        | "matching"
        | "short_answer"
      skill_status: "passed" | "failed" | "needs_practice"
      standardized_exam_type:
        | "entrance"
        | "unit"
        | "comprehensive"
        | "practice"
        | "remediation"
      submission_status: "in_progress" | "submitted" | "graded" | "returned"
      subscription_status: "active" | "canceled" | "past_due" | "trialing"
      subscription_tier: "free" | "pro" | "institution" | "enterprise"
      user_role: "admin" | "instructor" | "student"
      verification_cycle_type: "initial" | "annual" | "remedial"
      verification_status: "pending" | "verified" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      accreditation_doc_category: [
        "program_information",
        "personnel",
        "curriculum",
        "clinical_affiliations",
        "equipment",
        "policies",
        "assessment",
        "outcomes",
        "meeting_minutes",
        "other",
      ],
      accreditation_doc_status: [
        "draft",
        "pending_review",
        "approved",
        "expired",
        "archived",
      ],
      assignment_type: ["quiz", "written", "skill_checklist", "discussion"],
      attempt_status: [
        "not_started",
        "in_progress",
        "submitted",
        "timed_out",
        "abandoned",
        "graded",
        "invalidated",
      ],
      attendance_status: ["present", "absent", "late", "excused"],
      booking_status: ["booked", "completed", "cancelled", "no_show"],
      certification_level: ["EMR", "EMT", "AEMT", "Paramedic", "All"],
      clinical_site_type: [
        "hospital",
        "ambulance_service",
        "fire_department",
        "urgent_care",
        "other",
      ],
      cognitive_level: [
        "remember",
        "understand",
        "apply",
        "analyze",
        "evaluate",
        "create",
      ],
      competency_status: [
        "not_started",
        "in_progress",
        "pending_review",
        "verified",
        "expired",
        "failed",
      ],
      content_type: ["video", "document", "text", "embed"],
      course_type: ["EMR", "EMT", "AEMT", "Paramedic", "Custom"],
      enrollment_status: ["active", "completed", "dropped"],
      event_type: ["class", "lab", "clinical", "exam", "other"],
      exam_delivery_mode: ["standard", "adaptive"],
      exam_security_level: ["low", "medium", "high"],
      file_context: ["course", "assignment", "submission", "profile"],
      log_type: ["hours", "patient_contact"],
      notification_type: ["assignment", "grade", "announcement", "reminder"],
      patient_age_range: [
        "neonate",
        "infant",
        "toddler",
        "preschool",
        "school_age",
        "adolescent",
        "adult",
        "geriatric",
      ],
      question_difficulty: ["easy", "medium", "hard", "expert"],
      question_type: [
        "multiple_choice",
        "true_false",
        "matching",
        "short_answer",
      ],
      skill_status: ["passed", "failed", "needs_practice"],
      standardized_exam_type: [
        "entrance",
        "unit",
        "comprehensive",
        "practice",
        "remediation",
      ],
      submission_status: ["in_progress", "submitted", "graded", "returned"],
      subscription_status: ["active", "canceled", "past_due", "trialing"],
      subscription_tier: ["free", "pro", "institution", "enterprise"],
      user_role: ["admin", "instructor", "student"],
      verification_cycle_type: ["initial", "annual", "remedial"],
      verification_status: ["pending", "verified", "rejected"],
    },
  },
} as const
