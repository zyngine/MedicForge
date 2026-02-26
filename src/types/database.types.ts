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
      analytics_events: {
        Row: {
          course_id: string | null
          created_at: string | null
          event_category: string
          event_data: Json | null
          event_type: string
          id: string
          session_id: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          event_category: string
          event_data?: Json | null
          event_type: string
          id?: string
          session_id?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          event_category?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          session_id?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      attendance_check_in_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: string
          max_uses: number | null
          session_id: string
          use_count: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          max_uses?: number | null
          session_id: string
          use_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          max_uses?: number | null
          session_id?: string
          use_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_check_in_codes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          id: string
          minutes_present: number | null
          notes: string | null
          recorded_at: string | null
          recorded_by: string
          session_id: string
          status: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          id?: string
          minutes_present?: number | null
          notes?: string | null
          recorded_at?: string | null
          recorded_by: string
          session_id: string
          status?: string
          student_id: string
          tenant_id: string
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          id?: string
          minutes_present?: number | null
          notes?: string | null
          recorded_at?: string | null
          recorded_by?: string
          session_id?: string
          status?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          course_id: string
          created_at: string | null
          created_by: string
          end_time: string
          id: string
          is_mandatory: boolean
          location: string | null
          notes: string | null
          scheduled_date: string
          session_type: string
          start_time: string
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          created_by: string
          end_time: string
          id?: string
          is_mandatory?: boolean
          location?: string | null
          notes?: string | null
          scheduled_date: string
          session_type?: string
          start_time: string
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          created_by?: string
          end_time?: string
          id?: string
          is_mandatory?: boolean
          location?: string | null
          notes?: string | null
          scheduled_date?: string
          session_type?: string
          start_time?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_tokens: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_accessed_at: string | null
          name: string | null
          tenant_id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          name?: string | null
          tenant_id: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          name?: string | null
          tenant_id?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_tokens_tenant_id_fkey"
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
      certificate_templates: {
        Row: {
          background_image_url: string | null
          certificate_type: string
          created_at: string | null
          default_title: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          logo_position: string | null
          name: string
          show_date: boolean | null
          show_grade: boolean | null
          show_hours: boolean | null
          show_verification_code: boolean | null
          signature_image_url: string | null
          signature_name: string | null
          signature_title: string | null
          styles: string | null
          template_html: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          background_image_url?: string | null
          certificate_type?: string
          created_at?: string | null
          default_title?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          logo_position?: string | null
          name: string
          show_date?: boolean | null
          show_grade?: boolean | null
          show_hours?: boolean | null
          show_verification_code?: boolean | null
          signature_image_url?: string | null
          signature_name?: string | null
          signature_title?: string | null
          styles?: string | null
          template_html: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          background_image_url?: string | null
          certificate_type?: string
          created_at?: string | null
          default_title?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          logo_position?: string | null
          name?: string
          show_date?: boolean | null
          show_grade?: boolean | null
          show_hours?: boolean | null
          show_verification_code?: boolean | null
          signature_image_url?: string | null
          signature_name?: string | null
          signature_title?: string | null
          styles?: string | null
          template_html?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_number: string
          certificate_type: string
          completion_date: string
          course_id: string
          created_at: string | null
          custom_data: Json | null
          expires_at: string | null
          final_grade: number | null
          hours_completed: number | null
          id: string
          is_revoked: boolean | null
          issued_at: string
          issued_by: string | null
          pdf_url: string | null
          revoked_at: string | null
          revoked_reason: string | null
          student_id: string
          template_id: string | null
          tenant_id: string
          title: string
          updated_at: string | null
          verification_code: string
        }
        Insert: {
          certificate_number: string
          certificate_type?: string
          completion_date: string
          course_id: string
          created_at?: string | null
          custom_data?: Json | null
          expires_at?: string | null
          final_grade?: number | null
          hours_completed?: number | null
          id?: string
          is_revoked?: boolean | null
          issued_at?: string
          issued_by?: string | null
          pdf_url?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          student_id: string
          template_id?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
          verification_code: string
        }
        Update: {
          certificate_number?: string
          certificate_type?: string
          completion_date?: string
          course_id?: string
          created_at?: string | null
          custom_data?: Json | null
          expires_at?: string | null
          final_grade?: number | null
          hours_completed?: number | null
          id?: string
          is_revoked?: boolean | null
          issued_at?: string
          issued_by?: string | null
          pdf_url?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          student_id?: string
          template_id?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "certificate_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_tenant_id_fkey"
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
      cohort_courses: {
        Row: {
          cohort_id: string
          course_id: string
          enrolled_at: string | null
          enrolled_by: string | null
          id: string
        }
        Insert: {
          cohort_id: string
          course_id: string
          enrolled_at?: string | null
          enrolled_by?: string | null
          id?: string
        }
        Update: {
          cohort_id?: string
          course_id?: string
          enrolled_at?: string | null
          enrolled_by?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_courses_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_courses_enrolled_by_fkey"
            columns: ["enrolled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_members: {
        Row: {
          cohort_id: string
          id: string
          joined_at: string | null
          left_at: string | null
          notes: string | null
          status: string
          student_id: string
        }
        Insert: {
          cohort_id: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          notes?: string | null
          status?: string
          student_id: string
        }
        Update: {
          cohort_id?: string
          id?: string
          joined_at?: string | null
          left_at?: string | null
          notes?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohort_members_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohort_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cohorts: {
        Row: {
          course_type: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expected_graduation: string | null
          id: string
          is_active: boolean | null
          max_students: number | null
          name: string
          settings: Json | null
          start_date: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          course_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expected_graduation?: string | null
          id?: string
          is_active?: boolean | null
          max_students?: number | null
          name: string
          settings?: Json | null
          start_date?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          course_type?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expected_graduation?: string | null
          id?: string
          is_active?: boolean | null
          max_students?: number | null
          name?: string
          settings?: Json | null
          start_date?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cohorts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cohorts_tenant_id_fkey"
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
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          is_muted: boolean | null
          joined_at: string | null
          last_read_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_muted?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          is_group: boolean | null
          last_message_at: string | null
          tenant_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          is_group?: boolean | null
          last_message_at?: string | null
          tenant_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          is_group?: boolean | null
          last_message_at?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      course_instructors: {
        Row: {
          added_at: string | null
          added_by: string | null
          can_edit: boolean | null
          can_grade: boolean | null
          can_manage_students: boolean | null
          course_id: string
          id: string
          instructor_id: string
          role: string
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          can_edit?: boolean | null
          can_grade?: boolean | null
          can_manage_students?: boolean | null
          course_id: string
          id?: string
          instructor_id: string
          role?: string
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          can_edit?: boolean | null
          can_grade?: boolean | null
          can_manage_students?: boolean | null
          course_id?: string
          id?: string
          instructor_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_instructors_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
      daily_metrics: {
        Row: {
          active_users: number | null
          average_score: number | null
          content_views: number | null
          course_id: string | null
          created_at: string | null
          id: string
          metric_date: string
          new_enrollments: number | null
          submissions_count: number | null
          tenant_id: string
          time_spent_minutes: number | null
        }
        Insert: {
          active_users?: number | null
          average_score?: number | null
          content_views?: number | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          metric_date: string
          new_enrollments?: number | null
          submissions_count?: number | null
          tenant_id: string
          time_spent_minutes?: number | null
        }
        Update: {
          active_users?: number | null
          average_score?: number | null
          content_views?: number | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          metric_date?: string
          new_enrollments?: number | null
          submissions_count?: number | null
          tenant_id?: string
          time_spent_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_metrics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      gradebook_export_templates: {
        Row: {
          columns: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          filters: Json | null
          format: string | null
          id: string
          is_default: boolean | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          columns?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filters?: Json | null
          format?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          columns?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filters?: Json | null
          format?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gradebook_export_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradebook_export_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_outcomes: {
        Row: {
          category: string | null
          code: string | null
          course_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          level: string | null
          parent_id: string | null
          sort_order: number | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          code?: string | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          parent_id?: string | null
          sort_order?: number | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          code?: string | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          parent_id?: string | null
          sort_order?: number | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_outcomes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_outcomes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_outcomes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          last_position: Json | null
          lesson_id: string
          notes: string | null
          started_at: string | null
          student_id: string
          tenant_id: string
          time_spent_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_position?: Json | null
          lesson_id: string
          notes?: string | null
          started_at?: string | null
          student_id: string
          tenant_id: string
          time_spent_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_position?: Json | null
          lesson_id?: string
          notes?: string | null
          started_at?: string | null
          student_id?: string
          tenant_id?: string
          time_spent_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      medical_director_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invite_code: string
          invited_by: string
          is_primary: boolean | null
          md_credentials: string | null
          md_license_number: string | null
          md_name: string
          tenant_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invite_code: string
          invited_by: string
          is_primary?: boolean | null
          md_credentials?: string | null
          md_license_number?: string | null
          md_name: string
          tenant_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invite_code?: string
          invited_by?: string
          is_primary?: boolean | null
          md_credentials?: string | null
          md_license_number?: string | null
          md_name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_director_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_director_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_director_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          content_type: string | null
          conversation_id: string
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          reply_to_id: string | null
          sender_id: string
          tenant_id: string
        }
        Insert: {
          content: string
          content_type?: string | null
          conversation_id: string
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          reply_to_id?: string | null
          sender_id: string
          tenant_id: string
        }
        Update: {
          content?: string
          content_type?: string | null
          conversation_id?: string
          created_at?: string | null
          deleted_at?: string | null
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          reply_to_id?: string | null
          sender_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      outcome_alignments: {
        Row: {
          alignable_id: string
          alignable_type: string
          created_at: string | null
          id: string
          outcome_id: string
          weight: number | null
        }
        Insert: {
          alignable_id: string
          alignable_type: string
          created_at?: string | null
          id?: string
          outcome_id: string
          weight?: number | null
        }
        Update: {
          alignable_id?: string
          alignable_type?: string
          created_at?: string | null
          id?: string
          outcome_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "outcome_alignments_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
        ]
      }
      plagiarism_checks: {
        Row: {
          checked_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          matches: Json | null
          original_content: string | null
          requested_by: string
          similarity_score: number | null
          status: string | null
          submission_id: string
          tenant_id: string
          updated_at: string | null
          word_count: number | null
        }
        Insert: {
          checked_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          matches?: Json | null
          original_content?: string | null
          requested_by: string
          similarity_score?: number | null
          status?: string | null
          submission_id: string
          tenant_id: string
          updated_at?: string | null
          word_count?: number | null
        }
        Update: {
          checked_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          matches?: Json | null
          original_content?: string | null
          requested_by?: string
          similarity_score?: number | null
          status?: string | null
          submission_id?: string
          tenant_id?: string
          updated_at?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plagiarism_checks_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plagiarism_checks_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plagiarism_checks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plagiarism_sources: {
        Row: {
          content: string
          content_hash: string
          created_at: string | null
          id: string
          is_active: boolean | null
          source_id: string | null
          source_type: string
          tenant_id: string
          title: string
          word_count: number | null
        }
        Insert: {
          content: string
          content_hash: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          source_id?: string | null
          source_type: string
          tenant_id: string
          title: string
          word_count?: number | null
        }
        Update: {
          content?: string
          content_hash?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          source_id?: string | null
          source_type?: string
          tenant_id?: string
          title?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plagiarism_sources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          excluded_at: string | null
          excluded_by: string | null
          exclusion_reason: string | null
          explanation: string | null
          id: string
          is_excluded: boolean | null
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
          excluded_at?: string | null
          excluded_by?: string | null
          exclusion_reason?: string | null
          explanation?: string | null
          id?: string
          is_excluded?: boolean | null
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
          excluded_at?: string | null
          excluded_by?: string | null
          exclusion_reason?: string | null
          explanation?: string | null
          id?: string
          is_excluded?: boolean | null
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
            foreignKeyName: "quiz_questions_excluded_by_fkey"
            columns: ["excluded_by"]
            isOneToOne: false
            referencedRelation: "users"
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
      quiz_templates: {
        Row: {
          certification_level: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          max_attempts: number | null
          name: string
          passing_score: number | null
          question_count: number | null
          questions: Json
          show_correct_answers: boolean | null
          shuffle_options: boolean | null
          shuffle_questions: boolean | null
          tags: string[] | null
          tenant_id: string
          time_limit_minutes: number | null
          times_used: number | null
          total_points: number | null
          updated_at: string | null
        }
        Insert: {
          certification_level?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_attempts?: number | null
          name: string
          passing_score?: number | null
          question_count?: number | null
          questions?: Json
          show_correct_answers?: boolean | null
          shuffle_options?: boolean | null
          shuffle_questions?: boolean | null
          tags?: string[] | null
          tenant_id: string
          time_limit_minutes?: number | null
          times_used?: number | null
          total_points?: number | null
          updated_at?: string | null
        }
        Update: {
          certification_level?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_attempts?: number | null
          name?: string
          passing_score?: number | null
          question_count?: number | null
          questions?: Json
          show_correct_answers?: boolean | null
          shuffle_options?: boolean | null
          shuffle_questions?: boolean | null
          tags?: string[] | null
          tenant_id?: string
          time_limit_minutes?: number | null
          times_used?: number | null
          total_points?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rubric_assessment_scores: {
        Row: {
          assessment_id: string
          comments: string | null
          created_at: string | null
          criterion_id: string
          custom_points: number | null
          id: string
          rating_id: string | null
          tenant_id: string
        }
        Insert: {
          assessment_id: string
          comments?: string | null
          created_at?: string | null
          criterion_id: string
          custom_points?: number | null
          id?: string
          rating_id?: string | null
          tenant_id: string
        }
        Update: {
          assessment_id?: string
          comments?: string | null
          created_at?: string | null
          criterion_id?: string
          custom_points?: number | null
          id?: string
          rating_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rubric_assessment_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "rubric_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubric_assessment_scores_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "rubric_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubric_assessment_scores_rating_id_fkey"
            columns: ["rating_id"]
            isOneToOne: false
            referencedRelation: "rubric_ratings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubric_assessment_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rubric_assessments: {
        Row: {
          assessed_at: string | null
          assessor_id: string
          created_at: string | null
          id: string
          is_draft: boolean | null
          overall_comments: string | null
          rubric_id: string
          submission_id: string
          tenant_id: string
          total_score: number | null
          updated_at: string | null
        }
        Insert: {
          assessed_at?: string | null
          assessor_id: string
          created_at?: string | null
          id?: string
          is_draft?: boolean | null
          overall_comments?: string | null
          rubric_id: string
          submission_id: string
          tenant_id: string
          total_score?: number | null
          updated_at?: string | null
        }
        Update: {
          assessed_at?: string | null
          assessor_id?: string
          created_at?: string | null
          id?: string
          is_draft?: boolean | null
          overall_comments?: string | null
          rubric_id?: string
          submission_id?: string
          tenant_id?: string
          total_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rubric_assessments_assessor_id_fkey"
            columns: ["assessor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubric_assessments_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "rubrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubric_assessments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubric_assessments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rubric_criteria: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          long_description: string | null
          order_index: number
          points: number
          rubric_id: string
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          long_description?: string | null
          order_index?: number
          points: number
          rubric_id: string
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          long_description?: string | null
          order_index?: number
          points?: number
          rubric_id?: string
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "rubric_criteria_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "rubrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubric_criteria_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rubric_ratings: {
        Row: {
          created_at: string | null
          criterion_id: string
          description: string
          id: string
          order_index: number
          points: number
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          criterion_id: string
          description: string
          id?: string
          order_index?: number
          points: number
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          criterion_id?: string
          description?: string
          id?: string
          order_index?: number
          points?: number
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "rubric_ratings_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "rubric_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubric_ratings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rubrics: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          free_form_comments_enabled: boolean | null
          hide_score_from_students: boolean | null
          id: string
          is_shared: boolean | null
          is_template: boolean | null
          rubric_type: string | null
          tenant_id: string
          title: string
          total_points: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          free_form_comments_enabled?: boolean | null
          hide_score_from_students?: boolean | null
          id?: string
          is_shared?: boolean | null
          is_template?: boolean | null
          rubric_type?: string | null
          tenant_id: string
          title: string
          total_points?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          free_form_comments_enabled?: boolean | null
          hide_score_from_students?: boolean | null
          id?: string
          is_shared?: boolean | null
          is_template?: boolean | null
          rubric_type?: string | null
          tenant_id?: string
          title?: string
          total_points?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rubrics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubrics_tenant_id_fkey"
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
      sso_configurations: {
        Row: {
          allowed_domains: string[] | null
          attribute_mapping: Json | null
          auto_provision_users: boolean | null
          created_at: string | null
          default_role: string | null
          id: string
          is_default: boolean | null
          is_enabled: boolean | null
          name: string
          oidc_client_id: string | null
          oidc_client_secret: string | null
          oidc_discovery_url: string | null
          oidc_issuer: string | null
          oidc_scopes: string[] | null
          provider: string
          saml_certificate: string | null
          saml_entity_id: string | null
          saml_signature_algorithm: string | null
          saml_slo_url: string | null
          saml_sso_url: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          allowed_domains?: string[] | null
          attribute_mapping?: Json | null
          auto_provision_users?: boolean | null
          created_at?: string | null
          default_role?: string | null
          id?: string
          is_default?: boolean | null
          is_enabled?: boolean | null
          name: string
          oidc_client_id?: string | null
          oidc_client_secret?: string | null
          oidc_discovery_url?: string | null
          oidc_issuer?: string | null
          oidc_scopes?: string[] | null
          provider: string
          saml_certificate?: string | null
          saml_entity_id?: string | null
          saml_signature_algorithm?: string | null
          saml_slo_url?: string | null
          saml_sso_url?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          allowed_domains?: string[] | null
          attribute_mapping?: Json | null
          auto_provision_users?: boolean | null
          created_at?: string | null
          default_role?: string | null
          id?: string
          is_default?: boolean | null
          is_enabled?: boolean | null
          name?: string
          oidc_client_id?: string | null
          oidc_client_secret?: string | null
          oidc_discovery_url?: string | null
          oidc_issuer?: string | null
          oidc_scopes?: string[] | null
          provider?: string
          saml_certificate?: string | null
          saml_entity_id?: string | null
          saml_signature_algorithm?: string | null
          saml_slo_url?: string | null
          saml_sso_url?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sso_configurations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_sessions: {
        Row: {
          attributes: Json | null
          created_at: string | null
          expires_at: string
          id: string
          provider_user_id: string | null
          session_id: string
          sso_config_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          attributes?: Json | null
          created_at?: string | null
          expires_at: string
          id?: string
          provider_user_id?: string | null
          session_id: string
          sso_config_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          attributes?: Json | null
          created_at?: string | null
          expires_at?: string
          id?: string
          provider_user_id?: string | null
          session_id?: string
          sso_config_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sso_sessions_sso_config_id_fkey"
            columns: ["sso_config_id"]
            isOneToOne: false
            referencedRelation: "sso_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sso_sessions_tenant_id_fkey"
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
      student_engagement: {
        Row: {
          assignments_submitted: number | null
          content_views: number | null
          course_id: string
          created_at: string | null
          discussion_posts: number | null
          engagement_score: number | null
          id: string
          logins: number | null
          student_id: string
          tenant_id: string
          time_spent_minutes: number | null
          updated_at: string | null
          week_start: string
        }
        Insert: {
          assignments_submitted?: number | null
          content_views?: number | null
          course_id: string
          created_at?: string | null
          discussion_posts?: number | null
          engagement_score?: number | null
          id?: string
          logins?: number | null
          student_id: string
          tenant_id: string
          time_spent_minutes?: number | null
          updated_at?: string | null
          week_start: string
        }
        Update: {
          assignments_submitted?: number | null
          content_views?: number | null
          course_id?: string
          created_at?: string | null
          discussion_posts?: number | null
          engagement_score?: number | null
          id?: string
          logins?: number | null
          student_id?: string
          tenant_id?: string
          time_spent_minutes?: number | null
          updated_at?: string | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_engagement_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_engagement_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_engagement_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_outcome_progress: {
        Row: {
          course_id: string
          created_at: string | null
          evidence_count: number | null
          id: string
          last_assessed_at: string | null
          mastery_level: string | null
          mastery_score: number | null
          outcome_id: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          evidence_count?: number | null
          id?: string
          last_assessed_at?: string | null
          mastery_level?: string | null
          mastery_score?: number | null
          outcome_id: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          evidence_count?: number | null
          id?: string
          last_assessed_at?: string | null
          mastery_level?: string | null
          mastery_score?: number | null
          outcome_id?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_outcome_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_outcome_progress_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_outcome_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          payment_method: string | null
          primary_color: string | null
          settings: Json | null
          slug: string
          storage_used_bytes: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_notes: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          tenant_type: string | null
          trial_ends_at: string | null
          updated_at: string | null
          white_label_enabled: boolean | null
        }
        Insert: {
          agency_code?: string
          created_at?: string | null
          custom_domain?: string | null
          id?: string
          logo_url?: string | null
          name: string
          payment_method?: string | null
          primary_color?: string | null
          settings?: Json | null
          slug: string
          storage_used_bytes?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_notes?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          tenant_type?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          white_label_enabled?: boolean | null
        }
        Update: {
          agency_code?: string
          created_at?: string | null
          custom_domain?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          payment_method?: string | null
          primary_color?: string | null
          settings?: Json | null
          slug?: string
          storage_used_bytes?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_notes?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          tenant_type?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          white_label_enabled?: boolean | null
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
          agency_role: Database["public"]["Enums"]["agency_role"] | null
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
          agency_role?: Database["public"]["Enums"]["agency_role"] | null
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
          agency_role?: Database["public"]["Enums"]["agency_role"] | null
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
      calculate_engagement_score: {
        Args: {
          p_course_id: string
          p_student_id: string
          p_week_start: string
        }
        Returns: number
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
      calculate_tenant_storage: {
        Args: { p_tenant_id: string }
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
      check_storage_quota: {
        Args: { p_file_size_bytes: number; p_tenant_id: string }
        Returns: Json
      }
      cleanup_expired_sso_sessions: { Args: never; Returns: number }
      generate_agency_code: { Args: never; Returns: string }
      generate_invite_code: { Args: never; Returns: string }
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
      get_instructor_course_ids: {
        Args: { p_user_id?: string }
        Returns: string[]
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
      get_or_create_direct_conversation: {
        Args: { p_tenant_id: string; p_user1_id: string; p_user2_id: string }
        Returns: {
          created_at: string | null
          created_by: string
          id: string
          is_group: boolean | null
          last_message_at: string | null
          tenant_id: string
          title: string | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_storage_usage: { Args: { p_tenant_id: string }; Returns: Json }
      get_user_agency_role: {
        Args: never
        Returns: Database["public"]["Enums"]["agency_role"]
      }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_tenant_id: { Args: never; Returns: string }
      increment_quiz_template_usage: {
        Args: { template_id: string }
        Returns: undefined
      }
      is_agency_admin: { Args: never; Returns: boolean }
      is_conversation_member: { Args: { conv_id: string }; Returns: boolean }
      is_course_instructor: {
        Args: { p_course_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_medical_director: { Args: { tenant_uuid: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      recalculate_quiz_scores: {
        Args: { p_assignment_id: string }
        Returns: number
      }
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
      send_message: {
        Args: {
          p_content: string
          p_content_type?: string
          p_conversation_id: string
          p_file_name?: string
          p_file_size?: number
          p_file_url?: string
          p_reply_to_id?: string
          p_sender_id: string
          p_tenant_id: string
        }
        Returns: {
          content: string
          content_type: string | null
          conversation_id: string
          created_at: string | null
          deleted_at: string | null
          edited_at: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          reply_to_id: string | null
          sender_id: string
          tenant_id: string
        }
        SetofOptions: {
          from: "*"
          to: "messages"
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
      agency_role: "agency_admin" | "medical_director"
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
      plagiarism_status: "pending" | "processing" | "completed" | "failed"
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
      agency_role: ["agency_admin", "medical_director"],
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
      plagiarism_status: ["pending", "processing", "completed", "failed"],
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
