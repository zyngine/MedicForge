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
          created_by: string | null
          expires_at: string
          id: string
          max_uses: number | null
          session_id: string
          tenant_id: string | null
          use_count: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          expires_at: string
          id?: string
          max_uses?: number | null
          session_id: string
          tenant_id?: string | null
          use_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string
          id?: string
          max_uses?: number | null
          session_id?: string
          tenant_id?: string | null
          use_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_check_in_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_check_in_codes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_check_in_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          was_late: boolean | null
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
          was_late?: boolean | null
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
          was_late?: boolean | null
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
          allow_late_checkin: boolean | null
          course_id: string
          created_at: string | null
          created_by: string
          end_time: string
          id: string
          is_generated: boolean | null
          is_mandatory: boolean
          location: string | null
          notes: string | null
          program_id: string | null
          schedule_id: string | null
          scheduled_date: string
          session_status: string | null
          session_type: string
          start_time: string
          tardy_window_minutes: number | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          allow_late_checkin?: boolean | null
          course_id: string
          created_at?: string | null
          created_by: string
          end_time: string
          id?: string
          is_generated?: boolean | null
          is_mandatory?: boolean
          location?: string | null
          notes?: string | null
          program_id?: string | null
          schedule_id?: string | null
          scheduled_date: string
          session_status?: string | null
          session_type?: string
          start_time: string
          tardy_window_minutes?: number | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          allow_late_checkin?: boolean | null
          course_id?: string
          created_at?: string | null
          created_by?: string
          end_time?: string
          id?: string
          is_generated?: boolean | null
          is_mandatory?: boolean
          location?: string | null
          notes?: string | null
          program_id?: string | null
          schedule_id?: string | null
          scheduled_date?: string
          session_status?: string | null
          session_type?: string
          start_time?: string
          tardy_window_minutes?: number | null
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
            foreignKeyName: "attendance_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "program_schedules"
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
      blueprint_courses: {
        Row: {
          course_id: string
          created_at: string
          id: string
          last_synced_at: string | null
          sync_enabled: boolean
          sync_settings: Json | null
          template_id: string
          tenant_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          sync_enabled?: boolean
          sync_settings?: Json | null
          template_id: string
          tenant_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          sync_enabled?: boolean
          sync_settings?: Json | null
          template_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blueprint_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blueprint_courses_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "course_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blueprint_courses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      blueprint_sync_history: {
        Row: {
          blueprint_id: string
          changes_applied: Json | null
          id: string
          sync_type: string
          synced_at: string
          synced_by: string
        }
        Insert: {
          blueprint_id: string
          changes_applied?: Json | null
          id?: string
          sync_type: string
          synced_at?: string
          synced_by: string
        }
        Update: {
          blueprint_id?: string
          changes_applied?: Json | null
          id?: string
          sync_type?: string
          synced_at?: string
          synced_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "blueprint_sync_history_blueprint_id_fkey"
            columns: ["blueprint_id"]
            isOneToOne: false
            referencedRelation: "blueprint_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blueprint_sync_history_synced_by_fkey"
            columns: ["synced_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_subscriptions: {
        Row: {
          calendar_type: string
          created_at: string | null
          id: string
          last_accessed_at: string | null
          tenant_id: string
          token: string | null
          user_id: string
        }
        Insert: {
          calendar_type?: string
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          tenant_id: string
          token?: string | null
          user_id: string
        }
        Update: {
          calendar_type?: string
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          tenant_id?: string
          token?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      ce_agencies: {
        Row: {
          address: string | null
          admin_user_id: string | null
          city: string | null
          created_at: string | null
          id: string
          invite_code: string | null
          name: string
          phone: string | null
          state: string | null
          subscription_end: string | null
          subscription_start: string | null
          subscription_tier: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          admin_user_id?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          invite_code?: string | null
          name: string
          phone?: string | null
          state?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_tier?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          admin_user_id?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          invite_code?: string | null
          name?: string
          phone?: string | null
          state?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_tier?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      ce_agency_invite_codes: {
        Row: {
          agency_id: string
          code: string
          created_at: string | null
          expires_at: string | null
          id: string
          max_uses: number | null
          uses_count: number | null
        }
        Insert: {
          agency_id: string
          code: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          uses_count?: number | null
        }
        Update: {
          agency_id?: string
          code?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          uses_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_agency_invite_codes_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "ce_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_agency_subscriptions: {
        Row: {
          agency_id: string
          created_at: string | null
          employee_count: number | null
          expires_at: string
          id: string
          notes: string | null
          payment_received_at: string | null
          payment_status: string | null
          plan_type: string | null
          price: number
          starts_at: string
          tier: string
          wave_invoice_id: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          employee_count?: number | null
          expires_at: string
          id?: string
          notes?: string | null
          payment_received_at?: string | null
          payment_status?: string | null
          plan_type?: string | null
          price: number
          starts_at: string
          tier: string
          wave_invoice_id?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          employee_count?: number | null
          expires_at?: string
          id?: string
          notes?: string | null
          payment_received_at?: string | null
          payment_status?: string | null
          plan_type?: string | null
          price?: number
          starts_at?: string
          tier?: string
          wave_invoice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_agency_subscriptions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "ce_agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_capce_submission_records: {
        Row: {
          ceh_hours: number
          completion_date: string
          course_number: string
          course_title: string
          enrollment_id: string
          error_message: string | null
          id: string
          status: string | null
          submission_id: string
          user_name: string
          user_nremt_id: string
        }
        Insert: {
          ceh_hours: number
          completion_date: string
          course_number: string
          course_title: string
          enrollment_id: string
          error_message?: string | null
          id?: string
          status?: string | null
          submission_id: string
          user_name: string
          user_nremt_id: string
        }
        Update: {
          ceh_hours?: number
          completion_date?: string
          course_number?: string
          course_title?: string
          enrollment_id?: string
          error_message?: string | null
          id?: string
          status?: string | null
          submission_id?: string
          user_name?: string
          user_nremt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ce_capce_submission_records_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "ce_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_capce_submission_records_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "ce_capce_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_capce_submissions: {
        Row: {
          confirmation_number: string | null
          created_at: string | null
          error_message: string | null
          file_url: string | null
          id: string
          period_end: string
          period_start: string
          status: string | null
          submission_date: string
          submission_type: string | null
          submitted_by: string | null
          total_records: number | null
        }
        Insert: {
          confirmation_number?: string | null
          created_at?: string | null
          error_message?: string | null
          file_url?: string | null
          id?: string
          period_end: string
          period_start: string
          status?: string | null
          submission_date: string
          submission_type?: string | null
          submitted_by?: string | null
          total_records?: number | null
        }
        Update: {
          confirmation_number?: string | null
          created_at?: string | null
          error_message?: string | null
          file_url?: string | null
          id?: string
          period_end?: string
          period_start?: string
          status?: string | null
          submission_date?: string
          submission_type?: string | null
          submitted_by?: string | null
          total_records?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_capce_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "ce_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_certificates: {
        Row: {
          capce_course_number: string | null
          ceh_hours: number
          certificate_number: string
          completion_date: string
          course_id: string
          course_number: string
          course_title: string
          enrollment_id: string
          expires_at: string | null
          id: string
          is_capce_accredited: boolean | null
          issued_at: string | null
          last_verified_at: string | null
          medical_director_name: string | null
          pdf_url: string | null
          provider_address: string | null
          provider_name: string | null
          user_id: string
          user_name: string
          user_nremt_id: string | null
          verification_code: string
          verified_count: number | null
        }
        Insert: {
          capce_course_number?: string | null
          ceh_hours: number
          certificate_number: string
          completion_date: string
          course_id: string
          course_number: string
          course_title: string
          enrollment_id: string
          expires_at?: string | null
          id?: string
          is_capce_accredited?: boolean | null
          issued_at?: string | null
          last_verified_at?: string | null
          medical_director_name?: string | null
          pdf_url?: string | null
          provider_address?: string | null
          provider_name?: string | null
          user_id: string
          user_name: string
          user_nremt_id?: string | null
          verification_code: string
          verified_count?: number | null
        }
        Update: {
          capce_course_number?: string | null
          ceh_hours?: number
          certificate_number?: string
          completion_date?: string
          course_id?: string
          course_number?: string
          course_title?: string
          enrollment_id?: string
          expires_at?: string | null
          id?: string
          is_capce_accredited?: boolean | null
          issued_at?: string | null
          last_verified_at?: string | null
          medical_director_name?: string | null
          pdf_url?: string | null
          provider_address?: string | null
          provider_name?: string | null
          user_id?: string
          user_name?: string
          user_nremt_id?: string | null
          verification_code?: string
          verified_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ce_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_certificates_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "ce_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ce_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_committee_action_items: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          description: string
          due_date: string | null
          id: string
          meeting_id: string
          notes: string | null
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          description: string
          due_date?: string | null
          id?: string
          meeting_id: string
          notes?: string | null
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          description?: string
          due_date?: string | null
          id?: string
          meeting_id?: string
          notes?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_committee_action_items_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "ce_committee_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_committee_action_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "ce_committee_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_committee_course_reviews: {
        Row: {
          committee_decision: string | null
          committee_notes: string | null
          committee_vote_abstain: number | null
          committee_vote_against: number | null
          committee_vote_for: number | null
          course_id: string
          created_at: string | null
          id: string
          medical_director_approved: boolean | null
          medical_director_id: string | null
          medical_director_notes: string | null
          medical_director_reviewed_at: string | null
          meeting_id: string | null
          review_type: string | null
          reviewed_by_medical_director: boolean | null
          revisions_required: string | null
        }
        Insert: {
          committee_decision?: string | null
          committee_notes?: string | null
          committee_vote_abstain?: number | null
          committee_vote_against?: number | null
          committee_vote_for?: number | null
          course_id: string
          created_at?: string | null
          id?: string
          medical_director_approved?: boolean | null
          medical_director_id?: string | null
          medical_director_notes?: string | null
          medical_director_reviewed_at?: string | null
          meeting_id?: string | null
          review_type?: string | null
          reviewed_by_medical_director?: boolean | null
          revisions_required?: string | null
        }
        Update: {
          committee_decision?: string | null
          committee_notes?: string | null
          committee_vote_abstain?: number | null
          committee_vote_against?: number | null
          committee_vote_for?: number | null
          course_id?: string
          created_at?: string | null
          id?: string
          medical_director_approved?: boolean | null
          medical_director_id?: string | null
          medical_director_notes?: string | null
          medical_director_reviewed_at?: string | null
          meeting_id?: string | null
          review_type?: string | null
          reviewed_by_medical_director?: boolean | null
          revisions_required?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_committee_course_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ce_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_committee_course_reviews_medical_director_id_fkey"
            columns: ["medical_director_id"]
            isOneToOne: false
            referencedRelation: "ce_committee_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_committee_course_reviews_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "ce_committee_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_committee_documents: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          document_url: string
          effective_date: string | null
          id: string
          review_date: string | null
          title: string
          uploaded_by: string | null
          version: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          document_url: string
          effective_date?: string | null
          id?: string
          review_date?: string | null
          title: string
          uploaded_by?: string | null
          version?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          document_url?: string
          effective_date?: string | null
          id?: string
          review_date?: string | null
          title?: string
          uploaded_by?: string | null
          version?: string | null
        }
        Relationships: []
      }
      ce_committee_meeting_attendance: {
        Row: {
          id: string
          meeting_id: string
          member_id: string
          notes: string | null
          present: boolean | null
        }
        Insert: {
          id?: string
          meeting_id: string
          member_id: string
          notes?: string | null
          present?: boolean | null
        }
        Update: {
          id?: string
          meeting_id?: string
          member_id?: string
          notes?: string | null
          present?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_committee_meeting_attendance_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "ce_committee_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_committee_meeting_attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "ce_committee_members"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_committee_meeting_motions: {
        Row: {
          created_at: string | null
          id: string
          meeting_id: string
          motion_text: string
          motion_type: string | null
          moved_by: string | null
          notes: string | null
          passed: boolean | null
          related_course_id: string | null
          seconded_by: string | null
          votes_abstain: number | null
          votes_against: number | null
          votes_for: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          meeting_id: string
          motion_text: string
          motion_type?: string | null
          moved_by?: string | null
          notes?: string | null
          passed?: boolean | null
          related_course_id?: string | null
          seconded_by?: string | null
          votes_abstain?: number | null
          votes_against?: number | null
          votes_for?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          meeting_id?: string
          motion_text?: string
          motion_type?: string | null
          moved_by?: string | null
          notes?: string | null
          passed?: boolean | null
          related_course_id?: string | null
          seconded_by?: string | null
          votes_abstain?: number | null
          votes_against?: number | null
          votes_for?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_committee_meeting_motions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "ce_committee_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_committee_meeting_motions_moved_by_fkey"
            columns: ["moved_by"]
            isOneToOne: false
            referencedRelation: "ce_committee_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_committee_meeting_motions_related_course_id_fkey"
            columns: ["related_course_id"]
            isOneToOne: false
            referencedRelation: "ce_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_committee_meeting_motions_seconded_by_fkey"
            columns: ["seconded_by"]
            isOneToOne: false
            referencedRelation: "ce_committee_members"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_committee_meetings: {
        Row: {
          adjourned_at: string | null
          created_at: string | null
          created_by: string | null
          end_time: string | null
          id: string
          location: string | null
          meeting_date: string
          meeting_type: string | null
          minutes_approved: boolean | null
          minutes_approved_date: string | null
          needs_assessment_notes: string | null
          new_business: string | null
          next_meeting_date: string | null
          old_business: string | null
          previous_minutes_approved: boolean | null
          quorum_present: boolean | null
          start_time: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          adjourned_at?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          meeting_date: string
          meeting_type?: string | null
          minutes_approved?: boolean | null
          minutes_approved_date?: string | null
          needs_assessment_notes?: string | null
          new_business?: string | null
          next_meeting_date?: string | null
          old_business?: string | null
          previous_minutes_approved?: boolean | null
          quorum_present?: boolean | null
          start_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          adjourned_at?: string | null
          created_at?: string | null
          created_by?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          meeting_date?: string
          meeting_type?: string | null
          minutes_approved?: boolean | null
          minutes_approved_date?: string | null
          needs_assessment_notes?: string | null
          new_business?: string | null
          next_meeting_date?: string | null
          old_business?: string | null
          previous_minutes_approved?: boolean | null
          quorum_present?: boolean | null
          start_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_committee_meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "ce_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_committee_members: {
        Row: {
          bio: string | null
          created_at: string | null
          credentials: string | null
          cv_url: string | null
          email: string
          employer: string | null
          id: string
          name: string
          role: string
          status: string | null
          term_end: string | null
          term_start: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          credentials?: string | null
          cv_url?: string | null
          email: string
          employer?: string | null
          id?: string
          name: string
          role?: string
          status?: string | null
          term_end?: string | null
          term_start?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          credentials?: string | null
          cv_url?: string | null
          email?: string
          employer?: string | null
          id?: string
          name?: string
          role?: string
          status?: string | null
          term_end?: string | null
          term_start?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_committee_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ce_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_committee_reviews: {
        Row: {
          course_id: string
          created_at: string | null
          decision: string | null
          id: string
          medical_director_approved: boolean | null
          notes: string | null
          reviewed_at: string | null
          revisions_required: string | null
          votes_abstain: number | null
          votes_against: number | null
          votes_for: number | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          decision?: string | null
          id?: string
          medical_director_approved?: boolean | null
          notes?: string | null
          reviewed_at?: string | null
          revisions_required?: string | null
          votes_abstain?: number | null
          votes_against?: number | null
          votes_for?: number | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          decision?: string | null
          id?: string
          medical_director_approved?: boolean | null
          notes?: string | null
          reviewed_at?: string | null
          revisions_required?: string | null
          votes_abstain?: number | null
          votes_against?: number | null
          votes_for?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_committee_reviews_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ce_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_conflict_of_interest: {
        Row: {
          attestation_date: string | null
          attestation_signed: boolean | null
          competing_ce_details: string | null
          conflict_status: string | null
          created_at: string | null
          disclosure_date: string
          expires_at: string | null
          has_competing_ce_interest: boolean | null
          has_other_conflict: boolean | null
          has_ownership_interest: boolean | null
          has_pharma_relationship: boolean | null
          has_royalties: boolean | null
          id: string
          instructor_id: string | null
          member_id: string | null
          other_conflict_details: string | null
          ownership_details: string | null
          pharma_details: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          royalties_details: string | null
        }
        Insert: {
          attestation_date?: string | null
          attestation_signed?: boolean | null
          competing_ce_details?: string | null
          conflict_status?: string | null
          created_at?: string | null
          disclosure_date: string
          expires_at?: string | null
          has_competing_ce_interest?: boolean | null
          has_other_conflict?: boolean | null
          has_ownership_interest?: boolean | null
          has_pharma_relationship?: boolean | null
          has_royalties?: boolean | null
          id?: string
          instructor_id?: string | null
          member_id?: string | null
          other_conflict_details?: string | null
          ownership_details?: string | null
          pharma_details?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          royalties_details?: string | null
        }
        Update: {
          attestation_date?: string | null
          attestation_signed?: boolean | null
          competing_ce_details?: string | null
          conflict_status?: string | null
          created_at?: string | null
          disclosure_date?: string
          expires_at?: string | null
          has_competing_ce_interest?: boolean | null
          has_other_conflict?: boolean | null
          has_ownership_interest?: boolean | null
          has_pharma_relationship?: boolean | null
          has_royalties?: boolean | null
          id?: string
          instructor_id?: string | null
          member_id?: string | null
          other_conflict_details?: string | null
          ownership_details?: string | null
          pharma_details?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          royalties_details?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_conflict_of_interest_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "ce_instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_conflict_of_interest_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "ce_committee_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_conflict_of_interest_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "ce_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_course_instructors: {
        Row: {
          compensation_details: string | null
          compensation_received: boolean | null
          course_id: string
          id: string
          instructor_id: string
          role: string | null
        }
        Insert: {
          compensation_details?: string | null
          compensation_received?: boolean | null
          course_id: string
          id?: string
          instructor_id: string
          role?: string | null
        }
        Update: {
          compensation_details?: string | null
          compensation_received?: boolean | null
          course_id?: string
          id?: string
          instructor_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_course_instructors_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ce_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_course_instructors_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "ce_instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_course_modules: {
        Row: {
          course_id: string
          created_at: string | null
          duration_minutes: number | null
          id: string
          module_number: number
          sort_order: number | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          module_number: number
          sort_order?: number | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          module_number?: number
          sort_order?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ce_course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ce_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_course_objectives: {
        Row: {
          bloom_level: string | null
          course_id: string
          created_at: string | null
          id: string
          objective_text: string
          sort_order: number | null
        }
        Insert: {
          bloom_level?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          objective_text: string
          sort_order?: number | null
        }
        Update: {
          bloom_level?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          objective_text?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_course_objectives_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ce_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_course_references: {
        Row: {
          accessed_date: string | null
          citation: string
          course_id: string
          id: string
          reference_type: string | null
          sort_order: number | null
          url: string | null
        }
        Insert: {
          accessed_date?: string | null
          citation: string
          course_id: string
          id?: string
          reference_type?: string | null
          sort_order?: number | null
          url?: string | null
        }
        Update: {
          accessed_date?: string | null
          citation?: string
          course_id?: string
          id?: string
          reference_type?: string | null
          sort_order?: number | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_course_references_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ce_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_courses: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          beta_feedback_enabled: boolean | null
          capce_course_number: string | null
          category: string | null
          ceh_hours: number
          certification_levels: Json | null
          commercial_support_disclosure: string | null
          commercial_supporter_name: string | null
          committee_decision: string | null
          committee_notes: string | null
          committee_reviewed_at: string | null
          course_number: string | null
          course_type: string | null
          created_at: string | null
          created_by: string | null
          created_by_agency_id: string | null
          delivery_method: string | null
          description: string | null
          disclosure_statement: string | null
          evidence_basis: string | null
          expiration_months: number | null
          has_commercial_support: boolean | null
          id: string
          is_agency_custom: boolean | null
          is_beta: boolean | null
          is_capce_accredited: boolean | null
          is_free: boolean | null
          language: string | null
          medical_director_approved: boolean | null
          medical_director_approved_at: string | null
          medical_director_notes: string | null
          nremt_category: string | null
          off_label_use_disclosure: string | null
          passing_score: number | null
          prerequisites: string | null
          previous_version_id: string | null
          price: number | null
          published_at: string | null
          requires_retake_on_update: boolean | null
          status: string | null
          subcategory: string | null
          submitted_for_review_at: string | null
          target_audience: string | null
          title: string
          translated_from_course_id: string | null
          updated_at: string | null
          version: number | null
          version_notes: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          beta_feedback_enabled?: boolean | null
          capce_course_number?: string | null
          category?: string | null
          ceh_hours?: number
          certification_levels?: Json | null
          commercial_support_disclosure?: string | null
          commercial_supporter_name?: string | null
          committee_decision?: string | null
          committee_notes?: string | null
          committee_reviewed_at?: string | null
          course_number?: string | null
          course_type?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_agency_id?: string | null
          delivery_method?: string | null
          description?: string | null
          disclosure_statement?: string | null
          evidence_basis?: string | null
          expiration_months?: number | null
          has_commercial_support?: boolean | null
          id?: string
          is_agency_custom?: boolean | null
          is_beta?: boolean | null
          is_capce_accredited?: boolean | null
          is_free?: boolean | null
          language?: string | null
          medical_director_approved?: boolean | null
          medical_director_approved_at?: string | null
          medical_director_notes?: string | null
          nremt_category?: string | null
          off_label_use_disclosure?: string | null
          passing_score?: number | null
          prerequisites?: string | null
          previous_version_id?: string | null
          price?: number | null
          published_at?: string | null
          requires_retake_on_update?: boolean | null
          status?: string | null
          subcategory?: string | null
          submitted_for_review_at?: string | null
          target_audience?: string | null
          title: string
          translated_from_course_id?: string | null
          updated_at?: string | null
          version?: number | null
          version_notes?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          beta_feedback_enabled?: boolean | null
          capce_course_number?: string | null
          category?: string | null
          ceh_hours?: number
          certification_levels?: Json | null
          commercial_support_disclosure?: string | null
          commercial_supporter_name?: string | null
          committee_decision?: string | null
          committee_notes?: string | null
          committee_reviewed_at?: string | null
          course_number?: string | null
          course_type?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_agency_id?: string | null
          delivery_method?: string | null
          description?: string | null
          disclosure_statement?: string | null
          evidence_basis?: string | null
          expiration_months?: number | null
          has_commercial_support?: boolean | null
          id?: string
          is_agency_custom?: boolean | null
          is_beta?: boolean | null
          is_capce_accredited?: boolean | null
          is_free?: boolean | null
          language?: string | null
          medical_director_approved?: boolean | null
          medical_director_approved_at?: string | null
          medical_director_notes?: string | null
          nremt_category?: string | null
          off_label_use_disclosure?: string | null
          passing_score?: number | null
          prerequisites?: string | null
          previous_version_id?: string | null
          price?: number | null
          published_at?: string | null
          requires_retake_on_update?: boolean | null
          status?: string | null
          subcategory?: string | null
          submitted_for_review_at?: string | null
          target_audience?: string | null
          title?: string
          translated_from_course_id?: string | null
          updated_at?: string | null
          version?: number | null
          version_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_courses_created_by_agency_id_fkey"
            columns: ["created_by_agency_id"]
            isOneToOne: false
            referencedRelation: "ce_agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "ce_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_courses_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "ce_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_courses_translated_from_course_id_fkey"
            columns: ["translated_from_course_id"]
            isOneToOne: false
            referencedRelation: "ce_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_discussion_likes: {
        Row: {
          created_at: string | null
          discussion_id: string | null
          id: string
          reply_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          discussion_id?: string | null
          id?: string
          reply_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          discussion_id?: string | null
          id?: string
          reply_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ce_discussion_likes_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "ce_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_discussion_likes_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "ce_discussion_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_discussion_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ce_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_discussion_replies: {
        Row: {
          body: string
          created_at: string | null
          discussion_id: string
          id: string
          is_instructor_response: boolean | null
          like_count: number | null
          parent_reply_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          discussion_id: string
          id?: string
          is_instructor_response?: boolean | null
          like_count?: number | null
          parent_reply_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          discussion_id?: string
          id?: string
          is_instructor_response?: boolean | null
          like_count?: number | null
          parent_reply_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ce_discussion_replies_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "ce_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_discussion_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "ce_discussion_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_discussion_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ce_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_discussions: {
        Row: {
          body: string
          course_id: string
          created_at: string | null
          id: string
          is_locked: boolean | null
          is_pinned: boolean | null
          like_count: number | null
          reply_count: number | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          course_id: string
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          like_count?: number | null
          reply_count?: number | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          course_id?: string
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          like_count?: number | null
          reply_count?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ce_discussions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ce_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_discussions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ce_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_email_log: {
        Row: {
          email_type: string
          id: string
          resend_message_id: string | null
          sent_at: string | null
          status: string | null
          subject: string
          user_id: string | null
        }
        Insert: {
          email_type: string
          id?: string
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
          user_id?: string | null
        }
        Update: {
          email_type?: string
          id?: string
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_email_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ce_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_enrollments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          completed_at: string | null
          completion_status: string | null
          course_id: string
          due_date: string | null
          enrolled_at: string | null
          id: string
          progress_percentage: number | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          completed_at?: string | null
          completion_status?: string | null
          course_id: string
          due_date?: string | null
          enrolled_at?: string | null
          id?: string
          progress_percentage?: number | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          completed_at?: string | null
          completion_status?: string | null
          course_id?: string
          due_date?: string | null
          enrolled_at?: string | null
          id?: string
          progress_percentage?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ce_enrollments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "ce_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ce_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ce_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_evaluation_summary: {
        Row: {
          avg_assessment_appropriate: number | null
          avg_content_current: number | null
          avg_content_relevant: number | null
          avg_instructor_effective: number | null
          avg_materials_quality: number | null
          avg_objectives_met: number | null
          avg_overall_rating: number | null
          avg_would_recommend: number | null
          bias_reports_count: number | null
          commercial_influence_reports_count: number | null
          course_id: string
          generated_at: string | null
          id: string
          period_end: string
          period_start: string
          total_responses: number | null
        }
        Insert: {
          avg_assessment_appropriate?: number | null
          avg_content_current?: number | null
          avg_content_relevant?: number | null
          avg_instructor_effective?: number | null
          avg_materials_quality?: number | null
          avg_objectives_met?: number | null
          avg_overall_rating?: number | null
          avg_would_recommend?: number | null
          bias_reports_count?: number | null
          commercial_influence_reports_count?: number | null
          course_id: string
          generated_at?: string | null
          id?: string
          period_end: string
          period_start: string
          total_responses?: number | null
        }
        Update: {
          avg_assessment_appropriate?: number | null
          avg_content_current?: number | null
          avg_content_relevant?: number | null
          avg_instructor_effective?: number | null
          avg_materials_quality?: number | null
          avg_objectives_met?: number | null
          avg_overall_rating?: number | null
          avg_would_recommend?: number | null
          bias_reports_count?: number | null
          commercial_influence_reports_count?: number | null
          course_id?: string
          generated_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          total_responses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_evaluation_summary_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ce_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_evaluations: {
        Row: {
          additional_topics: string | null
          assessment_appropriate: number | null
          bias_description: string | null
          comments: string | null
          commercial_influence_description: string | null
          commercial_influence_perceived: boolean | null
          content_current: number | null
          content_relevant: number | null
          course_id: string
          created_at: string | null
          enrollment_id: string
          id: string
          instructor_effective: number | null
          materials_quality: number | null
          most_valuable: string | null
          objectives_met: number | null
          overall_rating: number | null
          perceived_bias: boolean | null
          submitted_at: string | null
          suggestions: string | null
          user_id: string
          would_recommend: number | null
        }
        Insert: {
          additional_topics?: string | null
          assessment_appropriate?: number | null
          bias_description?: string | null
          comments?: string | null
          commercial_influence_description?: string | null
          commercial_influence_perceived?: boolean | null
          content_current?: number | null
          content_relevant?: number | null
          course_id: string
          created_at?: string | null
          enrollment_id: string
          id?: string
          instructor_effective?: number | null
          materials_quality?: number | null
          most_valuable?: string | null
          objectives_met?: number | null
          overall_rating?: number | null
          perceived_bias?: boolean | null
          submitted_at?: string | null
          suggestions?: string | null
          user_id: string
          would_recommend?: number | null
        }
        Update: {
          additional_topics?: string | null
          assessment_appropriate?: number | null
          bias_description?: string | null
          comments?: string | null
          commercial_influence_description?: string | null
          commercial_influence_perceived?: boolean | null
          content_current?: number | null
          content_relevant?: number | null
          course_id?: string
          created_at?: string | null
          enrollment_id?: string
          id?: string
          instructor_effective?: number | null
          materials_quality?: number | null
          most_valuable?: string | null
          objectives_met?: number | null
          overall_rating?: number | null
          perceived_bias?: boolean | null
          submitted_at?: string | null
          suggestions?: string | null
          user_id?: string
          would_recommend?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_evaluations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ce_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_evaluations_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "ce_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ce_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_instructors: {
        Row: {
          bio: string | null
          coi_expires_at: string | null
          coi_form_id: string | null
          created_at: string | null
          credentials: string | null
          cv_url: string | null
          email: string
          employer: string | null
          expertise_areas: Json | null
          headshot_url: string | null
          id: string
          is_medical_director: boolean | null
          name: string
          status: string | null
          updated_at: string | null
          user_id: string | null
          years_experience: number | null
        }
        Insert: {
          bio?: string | null
          coi_expires_at?: string | null
          coi_form_id?: string | null
          created_at?: string | null
          credentials?: string | null
          cv_url?: string | null
          email: string
          employer?: string | null
          expertise_areas?: Json | null
          headshot_url?: string | null
          id?: string
          is_medical_director?: boolean | null
          name: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          years_experience?: number | null
        }
        Update: {
          bio?: string | null
          coi_expires_at?: string | null
          coi_form_id?: string | null
          created_at?: string | null
          credentials?: string | null
          cv_url?: string | null
          email?: string
          employer?: string | null
          expertise_areas?: Json | null
          headshot_url?: string | null
          id?: string
          is_medical_director?: boolean | null
          name?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_instructors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ce_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_module_content: {
        Row: {
          body: string | null
          content_order: number | null
          content_type: string
          id: string
          image_url: string | null
          module_id: string
          pdf_url: string | null
          title: string | null
          transcript: string | null
          video_url: string | null
        }
        Insert: {
          body?: string | null
          content_order?: number | null
          content_type: string
          id?: string
          image_url?: string | null
          module_id: string
          pdf_url?: string | null
          title?: string | null
          transcript?: string | null
          video_url?: string | null
        }
        Update: {
          body?: string | null
          content_order?: number | null
          content_type?: string
          id?: string
          image_url?: string | null
          module_id?: string
          pdf_url?: string | null
          title?: string | null
          transcript?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_module_content_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "ce_course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_module_progress: {
        Row: {
          completed_at: string | null
          enrollment_id: string
          id: string
          last_accessed_at: string | null
          module_id: string
          progress_percentage: number | null
          started_at: string | null
          time_spent_minutes: number | null
        }
        Insert: {
          completed_at?: string | null
          enrollment_id: string
          id?: string
          last_accessed_at?: string | null
          module_id: string
          progress_percentage?: number | null
          started_at?: string | null
          time_spent_minutes?: number | null
        }
        Update: {
          completed_at?: string | null
          enrollment_id?: string
          id?: string
          last_accessed_at?: string | null
          module_id?: string
          progress_percentage?: number | null
          started_at?: string | null
          time_spent_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_module_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "ce_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_module_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "ce_course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_needs_assessments: {
        Row: {
          addressed_by_courses: Json | null
          assessment_date: string
          assessment_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          findings: string | null
          id: string
          methodology: string | null
          priority: string | null
          recommended_topics: Json | null
          sample_size: number | null
          title: string
        }
        Insert: {
          addressed_by_courses?: Json | null
          assessment_date: string
          assessment_type: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          findings?: string | null
          id?: string
          methodology?: string | null
          priority?: string | null
          recommended_topics?: Json | null
          sample_size?: number | null
          title: string
        }
        Update: {
          addressed_by_courses?: Json | null
          assessment_date?: string
          assessment_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          findings?: string | null
          id?: string
          methodology?: string | null
          priority?: string | null
          recommended_topics?: Json | null
          sample_size?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ce_needs_assessments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "ce_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string
          read: boolean | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          read?: boolean | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ce_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ce_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_purchases: {
        Row: {
          amount: number
          course_id: string
          id: string
          purchased_at: string | null
          refund_reason: string | null
          refunded: boolean | null
          refunded_at: string | null
          square_payment_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          course_id: string
          id?: string
          purchased_at?: string | null
          refund_reason?: string | null
          refunded?: boolean | null
          refunded_at?: string | null
          square_payment_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          course_id?: string
          id?: string
          purchased_at?: string | null
          refund_reason?: string | null
          refunded?: boolean | null
          refunded_at?: string | null
          square_payment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ce_purchases_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ce_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ce_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_quiz_attempts: {
        Row: {
          answers: Json | null
          attempt_number: number
          completed_at: string | null
          enrollment_id: string
          id: string
          is_passing: boolean | null
          quiz_id: string
          score: number | null
          started_at: string | null
        }
        Insert: {
          answers?: Json | null
          attempt_number: number
          completed_at?: string | null
          enrollment_id: string
          id?: string
          is_passing?: boolean | null
          quiz_id: string
          score?: number | null
          started_at?: string | null
        }
        Update: {
          answers?: Json | null
          attempt_number?: number
          completed_at?: string | null
          enrollment_id?: string
          id?: string
          is_passing?: boolean | null
          quiz_id?: string
          score?: number | null
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_quiz_attempts_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "ce_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ce_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "ce_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_quiz_question_options: {
        Row: {
          id: string
          option_order: number | null
          option_text: string
          question_id: string
        }
        Insert: {
          id?: string
          option_order?: number | null
          option_text: string
          question_id: string
        }
        Update: {
          id?: string
          option_order?: number | null
          option_text?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ce_quiz_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "ce_quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string | null
          difficulty: string | null
          explanation: string | null
          id: string
          question_text: string
          question_type: string | null
          quiz_id: string
          sort_order: number | null
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          question_text: string
          question_type?: string | null
          quiz_id: string
          sort_order?: number | null
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          question_text?: string
          question_type?: string | null
          quiz_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "ce_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_quizzes: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          max_attempts: number | null
          passing_score: number | null
          quiz_type: string | null
          randomize_questions: boolean | null
          show_answers_after: string | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          max_attempts?: number | null
          passing_score?: number | null
          quiz_type?: string | null
          randomize_questions?: boolean | null
          show_answers_after?: string | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          max_attempts?: number | null
          passing_score?: number | null
          quiz_type?: string | null
          randomize_questions?: boolean | null
          show_answers_after?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ce_quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "ce_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_user_subscriptions: {
        Row: {
          auto_renew: boolean | null
          created_at: string | null
          expires_at: string
          id: string
          plan: string
          price: number
          square_subscription_id: string | null
          starts_at: string
          status: string | null
          user_id: string
        }
        Insert: {
          auto_renew?: boolean | null
          created_at?: string | null
          expires_at: string
          id?: string
          plan: string
          price: number
          square_subscription_id?: string | null
          starts_at: string
          status?: string | null
          user_id: string
        }
        Update: {
          auto_renew?: boolean | null
          created_at?: string | null
          expires_at?: string
          id?: string
          plan?: string
          price?: number
          square_subscription_id?: string | null
          starts_at?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ce_user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "ce_users"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_users: {
        Row: {
          agency_id: string | null
          certification_level: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          nremt_id: string | null
          preferred_language: string | null
          privacy_accepted_at: string | null
          role: string
          state: string | null
          terms_accepted_at: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id?: string | null
          certification_level?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          nremt_id?: string | null
          preferred_language?: string | null
          privacy_accepted_at?: string | null
          role?: string
          state?: string | null
          terms_accepted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string | null
          certification_level?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          nremt_id?: string | null
          preferred_language?: string | null
          privacy_accepted_at?: string | null
          role?: string
          state?: string | null
          terms_accepted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_users_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "ce_agencies"
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
      clinical_booking_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string | null
          booking_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: string | null
          booking_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string | null
          booking_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_booking_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_booking_audit_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "clinical_shift_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_booking_audit_log_tenant_id_fkey"
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
      clinical_poc_tokens: {
        Row: {
          action_taken: string | null
          action_taken_at: string | null
          booking_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          tenant_id: string
          token: string | null
        }
        Insert: {
          action_taken?: string | null
          action_taken_at?: string | null
          booking_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          tenant_id: string
          token?: string | null
        }
        Update: {
          action_taken?: string | null
          action_taken_at?: string | null
          booking_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          tenant_id?: string
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_poc_tokens_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "clinical_shift_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_poc_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_shift_bookings: {
        Row: {
          booked_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          hours_completed: number | null
          id: string
          notes: string | null
          poc_response_notes: string | null
          preceptor_name: string | null
          preceptor_signature: string | null
          preceptor_signature_credentials: string | null
          preceptor_signature_data: string | null
          preceptor_signature_name: string | null
          preceptor_signed_at: string | null
          request_notes: string | null
          requested_at: string | null
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
          cancelled_by?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          hours_completed?: number | null
          id?: string
          notes?: string | null
          poc_response_notes?: string | null
          preceptor_name?: string | null
          preceptor_signature?: string | null
          preceptor_signature_credentials?: string | null
          preceptor_signature_data?: string | null
          preceptor_signature_name?: string | null
          preceptor_signed_at?: string | null
          request_notes?: string | null
          requested_at?: string | null
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
          cancelled_by?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          hours_completed?: number | null
          id?: string
          notes?: string | null
          poc_response_notes?: string | null
          preceptor_name?: string | null
          preceptor_signature?: string | null
          preceptor_signature_credentials?: string | null
          preceptor_signature_data?: string | null
          preceptor_signature_name?: string | null
          preceptor_signed_at?: string | null
          request_notes?: string | null
          requested_at?: string | null
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
      course_clones: {
        Row: {
          cloned_at: string | null
          cloned_by_tenant_id: string
          cloned_by_user_id: string
          cloned_course_id: string
          id: string
          original_course_id: string
          original_tenant_id: string
        }
        Insert: {
          cloned_at?: string | null
          cloned_by_tenant_id: string
          cloned_by_user_id: string
          cloned_course_id: string
          id?: string
          original_course_id: string
          original_tenant_id: string
        }
        Update: {
          cloned_at?: string | null
          cloned_by_tenant_id?: string
          cloned_by_user_id?: string
          cloned_course_id?: string
          id?: string
          original_course_id?: string
          original_tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_clones_cloned_by_tenant_id_fkey"
            columns: ["cloned_by_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_clones_cloned_by_user_id_fkey"
            columns: ["cloned_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_clones_cloned_course_id_fkey"
            columns: ["cloned_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_clones_original_course_id_fkey"
            columns: ["original_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
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
      course_templates: {
        Row: {
          course_type: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_shared: boolean
          template_data: Json | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          course_type?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_shared?: boolean
          template_data?: Json | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          course_type?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_shared?: boolean
          template_data?: Json | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          clone_count: number | null
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
          is_official: boolean | null
          is_shareable: boolean | null
          max_students: number | null
          original_course_id: string | null
          original_tenant_id: string | null
          original_tenant_name: string | null
          required_clinical_hours: number | null
          required_patient_contacts: number | null
          settings: Json | null
          share_description: string | null
          share_preview_enabled: boolean | null
          share_tags: string[] | null
          shared_at: string | null
          start_date: string | null
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          clone_count?: number | null
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
          is_official?: boolean | null
          is_shareable?: boolean | null
          max_students?: number | null
          original_course_id?: string | null
          original_tenant_id?: string | null
          original_tenant_name?: string | null
          required_clinical_hours?: number | null
          required_patient_contacts?: number | null
          settings?: Json | null
          share_description?: string | null
          share_preview_enabled?: boolean | null
          share_tags?: string[] | null
          shared_at?: string | null
          start_date?: string | null
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          clone_count?: number | null
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
          is_official?: boolean | null
          is_shareable?: boolean | null
          max_students?: number | null
          original_course_id?: string | null
          original_tenant_id?: string | null
          original_tenant_name?: string | null
          required_clinical_hours?: number | null
          required_patient_contacts?: number | null
          settings?: Json | null
          share_description?: string | null
          share_preview_enabled?: boolean | null
          share_tags?: string[] | null
          shared_at?: string | null
          start_date?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
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
      direct_messages: {
        Row: {
          content: string
          content_type: string | null
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          from_user_id: string
          from_user_name: string
          id: string
          is_deleted: boolean | null
          is_read: boolean | null
          tenant_id: string
          to_user_id: string | null
          to_user_name: string | null
        }
        Insert: {
          content: string
          content_type?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          from_user_id: string
          from_user_name: string
          id?: string
          is_deleted?: boolean | null
          is_read?: boolean | null
          tenant_id: string
          to_user_id?: string | null
          to_user_name?: string | null
        }
        Update: {
          content?: string
          content_type?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_url?: string | null
          from_user_id?: string
          from_user_name?: string
          id?: string
          is_deleted?: boolean | null
          is_read?: boolean | null
          tenant_id?: string
          to_user_id?: string | null
          to_user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_to_user_id_fkey"
            columns: ["to_user_id"]
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
          mastery_threshold: number | null
          outcome_code: string | null
          outcome_type: Database["public"]["Enums"]["outcome_type"] | null
          parent_id: string | null
          parent_outcome_id: string | null
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
          mastery_threshold?: number | null
          outcome_code?: string | null
          outcome_type?: Database["public"]["Enums"]["outcome_type"] | null
          parent_id?: string | null
          parent_outcome_id?: string | null
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
          mastery_threshold?: number | null
          outcome_code?: string | null
          outcome_type?: Database["public"]["Enums"]["outcome_type"] | null
          parent_id?: string | null
          parent_outcome_id?: string | null
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
            foreignKeyName: "learning_outcomes_parent_outcome_id_fkey"
            columns: ["parent_outcome_id"]
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
      program_excluded_dates: {
        Row: {
          created_at: string | null
          created_by: string | null
          excluded_date: string
          id: string
          program_id: string
          reason: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          excluded_date: string
          id?: string
          program_id: string
          reason?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          excluded_date?: string
          id?: string
          program_id?: string
          reason?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_excluded_dates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_excluded_dates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_excluded_dates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      program_links: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          program_id: string
          sort_order: number | null
          tenant_id: string
          title: string
          updated_at: string | null
          url: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          program_id: string
          sort_order?: number | null
          tenant_id: string
          title: string
          updated_at?: string | null
          url: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          program_id?: string
          sort_order?: number | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_links_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      program_schedules: {
        Row: {
          created_at: string | null
          created_by: string | null
          day_of_week: number
          end_time: string
          id: string
          instructor_id: string | null
          is_active: boolean | null
          location: string | null
          program_id: string
          session_type: string | null
          start_time: string
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          day_of_week: number
          end_time: string
          id?: string
          instructor_id?: string | null
          is_active?: boolean | null
          location?: string | null
          program_id: string
          session_type?: string | null
          start_time: string
          tenant_id: string
          title?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          instructor_id?: string | null
          is_active?: boolean | null
          location?: string | null
          program_id?: string
          session_type?: string | null
          start_time?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_schedules_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_schedules_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      program_videos: {
        Row: {
          coursework_assignment_id: string | null
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          grants_virtual_attendance: boolean | null
          id: string
          is_active: boolean | null
          minimum_watch_percentage: number | null
          prevent_skipping: boolean | null
          program_id: string
          requires_coursework: boolean | null
          session_id: string | null
          sort_order: number | null
          tenant_id: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          uploaded_by: string | null
          video_source: string | null
          video_url: string
        }
        Insert: {
          coursework_assignment_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          grants_virtual_attendance?: boolean | null
          id?: string
          is_active?: boolean | null
          minimum_watch_percentage?: number | null
          prevent_skipping?: boolean | null
          program_id: string
          requires_coursework?: boolean | null
          session_id?: string | null
          sort_order?: number | null
          tenant_id: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
          video_source?: string | null
          video_url: string
        }
        Update: {
          coursework_assignment_id?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          grants_virtual_attendance?: boolean | null
          id?: string
          is_active?: boolean | null
          minimum_watch_percentage?: number | null
          prevent_skipping?: boolean | null
          program_id?: string
          requires_coursework?: boolean | null
          session_id?: string | null
          sort_order?: number | null
          tenant_id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
          video_source?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_videos_coursework_assignment_id_fkey"
            columns: ["coursework_assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_videos_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_videos_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_videos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_videos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
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
      quiz_integrity_events: {
        Row: {
          attempt_id: string
          created_at: string | null
          event_data: Json | null
          event_type: Database["public"]["Enums"]["integrity_event_type"]
          id: string
          question_id: string | null
          question_number: number | null
          suspicion_level: Database["public"]["Enums"]["suspicion_level"] | null
          tenant_id: string
          timestamp: string | null
          user_id: string
        }
        Insert: {
          attempt_id: string
          created_at?: string | null
          event_data?: Json | null
          event_type: Database["public"]["Enums"]["integrity_event_type"]
          id?: string
          question_id?: string | null
          question_number?: number | null
          suspicion_level?:
            | Database["public"]["Enums"]["suspicion_level"]
            | null
          tenant_id: string
          timestamp?: string | null
          user_id: string
        }
        Update: {
          attempt_id?: string
          created_at?: string | null
          event_data?: Json | null
          event_type?: Database["public"]["Enums"]["integrity_event_type"]
          id?: string
          question_id?: string | null
          question_number?: number | null
          suspicion_level?:
            | Database["public"]["Enums"]["suspicion_level"]
            | null
          tenant_id?: string
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_integrity_events_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_integrity_events_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_integrity_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_integrity_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_integrity_summary: {
        Row: {
          attempt_id: string
          auto_flagged: boolean | null
          blur_count: number | null
          copy_count: number | null
          created_at: string | null
          devtools_count: number | null
          flagged: boolean | null
          flagged_at: string | null
          flagged_reason: string | null
          high_suspicion_events: number | null
          id: string
          low_suspicion_events: number | null
          medium_suspicion_events: number | null
          paste_count: number | null
          review_decision:
            | Database["public"]["Enums"]["integrity_review_decision"]
            | null
          review_notes: string | null
          reviewed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          right_click_count: number | null
          shortcut_count: number | null
          tenant_id: string
          total_events: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attempt_id: string
          auto_flagged?: boolean | null
          blur_count?: number | null
          copy_count?: number | null
          created_at?: string | null
          devtools_count?: number | null
          flagged?: boolean | null
          flagged_at?: string | null
          flagged_reason?: string | null
          high_suspicion_events?: number | null
          id?: string
          low_suspicion_events?: number | null
          medium_suspicion_events?: number | null
          paste_count?: number | null
          review_decision?:
            | Database["public"]["Enums"]["integrity_review_decision"]
            | null
          review_notes?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          right_click_count?: number | null
          shortcut_count?: number | null
          tenant_id: string
          total_events?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attempt_id?: string
          auto_flagged?: boolean | null
          blur_count?: number | null
          copy_count?: number | null
          created_at?: string | null
          devtools_count?: number | null
          flagged?: boolean | null
          flagged_at?: string | null
          flagged_reason?: string | null
          high_suspicion_events?: number | null
          id?: string
          low_suspicion_events?: number | null
          medium_suspicion_events?: number | null
          paste_count?: number | null
          review_decision?:
            | Database["public"]["Enums"]["integrity_review_decision"]
            | null
          review_notes?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          right_click_count?: number | null
          shortcut_count?: number | null
          tenant_id?: string
          total_events?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_integrity_summary_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_integrity_summary_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_integrity_summary_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_integrity_summary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
          completed_at: string | null
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
          started_at: string | null
          status: string | null
          step_results: Json
          student_id: string
          student_notes: string | null
          student_reflection: string | null
          student_signature_data: string | null
          student_signed_at: string | null
          template_id: string
          tenant_id: string
          time_taken_seconds: number | null
          total_score: number | null
          updated_at: string | null
          verified_at: string | null
          video_url: string | null
        }
        Insert: {
          attempt_date?: string | null
          attempt_number?: number | null
          completed_at?: string | null
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
          started_at?: string | null
          status?: string | null
          step_results?: Json
          student_id: string
          student_notes?: string | null
          student_reflection?: string | null
          student_signature_data?: string | null
          student_signed_at?: string | null
          template_id: string
          tenant_id: string
          time_taken_seconds?: number | null
          total_score?: number | null
          updated_at?: string | null
          verified_at?: string | null
          video_url?: string | null
        }
        Update: {
          attempt_date?: string | null
          attempt_number?: number | null
          completed_at?: string | null
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
          started_at?: string | null
          status?: string | null
          step_results?: Json
          student_id?: string
          student_notes?: string | null
          student_reflection?: string | null
          student_signature_data?: string | null
          student_signed_at?: string | null
          template_id?: string
          tenant_id?: string
          time_taken_seconds?: number | null
          total_score?: number | null
          updated_at?: string | null
          verified_at?: string | null
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
          is_nremt_official: boolean | null
          name: string
          passing_score: number | null
          patient_scenario: string | null
          setup_instructions: string | null
          skill_code: string | null
          steps: Json
          tenant_id: string | null
          time_limit_seconds: number | null
          total_points: number | null
          updated_at: string | null
          version: number | null
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
          is_nremt_official?: boolean | null
          name: string
          passing_score?: number | null
          patient_scenario?: string | null
          setup_instructions?: string | null
          skill_code?: string | null
          steps?: Json
          tenant_id?: string | null
          time_limit_seconds?: number | null
          total_points?: number | null
          updated_at?: string | null
          version?: number | null
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
          is_nremt_official?: boolean | null
          name?: string
          passing_score?: number | null
          patient_scenario?: string | null
          setup_instructions?: string | null
          skill_code?: string | null
          steps?: Json
          tenant_id?: string | null
          time_limit_seconds?: number | null
          total_points?: number | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_sheet_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          auto_flag_threshold: number | null
          block_right_click: boolean | null
          cat_settings: Json | null
          category_weights: Json
          certification_level: string
          created_at: string | null
          cut_score_method: string | null
          delivery_mode: Database["public"]["Enums"]["exam_delivery_mode"]
          description: string | null
          exam_type: Database["public"]["Enums"]["standardized_exam_type"]
          id: string
          integrity_monitoring_enabled: boolean | null
          is_active: boolean | null
          is_system_template: boolean | null
          lockdown_mode: boolean | null
          max_questions: number | null
          min_questions: number | null
          name: string
          passing_score: number
          prevent_copy_paste: boolean | null
          security_level: Database["public"]["Enums"]["exam_security_level"]
          show_correct_answers: boolean | null
          show_results_immediately: boolean | null
          shuffle_options: boolean | null
          shuffle_questions: boolean | null
          tenant_id: string | null
          time_limit_minutes: number | null
          total_questions: number | null
          updated_at: string | null
          warn_on_blur: boolean | null
        }
        Insert: {
          allow_review?: boolean | null
          auto_flag_threshold?: number | null
          block_right_click?: boolean | null
          cat_settings?: Json | null
          category_weights?: Json
          certification_level: string
          created_at?: string | null
          cut_score_method?: string | null
          delivery_mode?: Database["public"]["Enums"]["exam_delivery_mode"]
          description?: string | null
          exam_type: Database["public"]["Enums"]["standardized_exam_type"]
          id?: string
          integrity_monitoring_enabled?: boolean | null
          is_active?: boolean | null
          is_system_template?: boolean | null
          lockdown_mode?: boolean | null
          max_questions?: number | null
          min_questions?: number | null
          name: string
          passing_score?: number
          prevent_copy_paste?: boolean | null
          security_level?: Database["public"]["Enums"]["exam_security_level"]
          show_correct_answers?: boolean | null
          show_results_immediately?: boolean | null
          shuffle_options?: boolean | null
          shuffle_questions?: boolean | null
          tenant_id?: string | null
          time_limit_minutes?: number | null
          total_questions?: number | null
          updated_at?: string | null
          warn_on_blur?: boolean | null
        }
        Update: {
          allow_review?: boolean | null
          auto_flag_threshold?: number | null
          block_right_click?: boolean | null
          cat_settings?: Json | null
          category_weights?: Json
          certification_level?: string
          created_at?: string | null
          cut_score_method?: string | null
          delivery_mode?: Database["public"]["Enums"]["exam_delivery_mode"]
          description?: string | null
          exam_type?: Database["public"]["Enums"]["standardized_exam_type"]
          id?: string
          integrity_monitoring_enabled?: boolean | null
          is_active?: boolean | null
          is_system_template?: boolean | null
          lockdown_mode?: boolean | null
          max_questions?: number | null
          min_questions?: number | null
          name?: string
          passing_score?: number
          prevent_copy_paste?: boolean | null
          security_level?: Database["public"]["Enums"]["exam_security_level"]
          show_correct_answers?: boolean | null
          show_results_immediately?: boolean | null
          shuffle_options?: boolean | null
          shuffle_questions?: boolean | null
          tenant_id?: string | null
          time_limit_minutes?: number | null
          total_questions?: number | null
          updated_at?: string | null
          warn_on_blur?: boolean | null
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
          auto_flag_threshold: number | null
          available_from: string | null
          available_until: string | null
          block_right_click: boolean | null
          course_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          instructions: string | null
          integrity_monitoring_enabled: boolean | null
          is_published: boolean | null
          prevent_copy_paste: boolean | null
          question_ids: string[] | null
          security_level_override:
            | Database["public"]["Enums"]["exam_security_level"]
            | null
          template_id: string
          tenant_id: string
          time_limit_override: number | null
          title: string
          updated_at: string | null
          warn_on_blur: boolean | null
        }
        Insert: {
          auto_flag_threshold?: number | null
          available_from?: string | null
          available_until?: string | null
          block_right_click?: boolean | null
          course_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          instructions?: string | null
          integrity_monitoring_enabled?: boolean | null
          is_published?: boolean | null
          prevent_copy_paste?: boolean | null
          question_ids?: string[] | null
          security_level_override?:
            | Database["public"]["Enums"]["exam_security_level"]
            | null
          template_id: string
          tenant_id: string
          time_limit_override?: number | null
          title: string
          updated_at?: string | null
          warn_on_blur?: boolean | null
        }
        Update: {
          auto_flag_threshold?: number | null
          available_from?: string | null
          available_until?: string | null
          block_right_click?: boolean | null
          course_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          instructions?: string | null
          integrity_monitoring_enabled?: boolean | null
          is_published?: boolean | null
          prevent_copy_paste?: boolean | null
          question_ids?: string[] | null
          security_level_override?:
            | Database["public"]["Enums"]["exam_security_level"]
            | null
          template_id?: string
          tenant_id?: string
          time_limit_override?: number | null
          title?: string
          updated_at?: string | null
          warn_on_blur?: boolean | null
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
      tenant_links: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          sort_order: number | null
          tenant_id: string
          title: string
          updated_at: string | null
          url: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          tenant_id: string
          title: string
          updated_at?: string | null
          url: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          sort_order?: number | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_links_tenant_id_fkey"
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
      video_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          last_position_seconds: number | null
          tenant_id: string
          updated_at: string | null
          user_id: string
          video_id: string
          virtual_attendance_granted: boolean | null
          virtual_attendance_granted_at: string | null
          watch_percentage: number | null
          watch_time_seconds: number | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_position_seconds?: number | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
          video_id: string
          virtual_attendance_granted?: boolean | null
          virtual_attendance_granted_at?: string | null
          watch_percentage?: number | null
          watch_time_seconds?: number | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_position_seconds?: number | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
          video_id?: string
          virtual_attendance_granted?: boolean | null
          virtual_attendance_granted_at?: string | null
          watch_percentage?: number | null
          watch_time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "program_videos"
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
      accept_md_invitation: {
        Args: { p_invite_code: string; p_user_id: string }
        Returns: boolean
      }
      book_clinical_shift: {
        Args: { p_shift_id: string; p_student_id: string; p_tenant_id: string }
        Returns: {
          booked_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          hours_completed: number | null
          id: string
          notes: string | null
          poc_response_notes: string | null
          preceptor_name: string | null
          preceptor_signature: string | null
          preceptor_signature_credentials: string | null
          preceptor_signature_data: string | null
          preceptor_signature_name: string | null
          preceptor_signed_at: string | null
          request_notes: string | null
          requested_at: string | null
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
          cancelled_by: string | null
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          hours_completed: number | null
          id: string
          notes: string | null
          poc_response_notes: string | null
          preceptor_name: string | null
          preceptor_signature: string | null
          preceptor_signature_credentials: string | null
          preceptor_signature_data: string | null
          preceptor_signature_name: string | null
          preceptor_signed_at: string | null
          request_notes: string | null
          requested_at: string | null
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
      clone_course: {
        Args: {
          p_cloned_by_user_id: string
          p_new_title?: string
          p_source_course_id: string
          p_target_tenant_id: string
        }
        Returns: string
      }
      create_md_invitation: {
        Args: {
          p_email: string
          p_is_primary?: boolean
          p_md_credentials?: string
          p_md_license_number?: string
          p_md_name: string
          p_tenant_id: string
        }
        Returns: {
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
        SetofOptions: {
          from: "*"
          to: "medical_director_invitations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_agency_code: { Args: never; Returns: string }
      generate_attendance_sessions: {
        Args: {
          p_created_by: string
          p_end_date: string
          p_program_id: string
          p_start_date: string
          p_tenant_id: string
        }
        Returns: number
      }
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
      get_ce_user_agency_id: { Args: never; Returns: string }
      get_ce_user_id: { Args: never; Returns: string }
      get_ce_user_role: { Args: never; Returns: string }
      get_course_preview: {
        Args: { p_course_id: string }
        Returns: {
          clone_count: number
          course_description: string
          course_id: string
          course_title: string
          is_official: boolean
          lesson_id: string
          lesson_order: number
          lesson_title: string
          lesson_type: string
          module_description: string
          module_id: string
          module_order: number
          module_title: string
          share_description: string
          share_tags: string[]
          tenant_name: string
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
      get_flagged_attempts: {
        Args: { p_exam_id?: string; p_reviewed?: boolean; p_tenant_id: string }
        Returns: {
          attempt_id: string
          auto_flagged: boolean
          exam_id: string
          exam_name: string
          flagged_at: string
          flagged_reason: string
          high_suspicion_events: number
          medium_suspicion_events: number
          review_decision: string
          reviewed: boolean
          reviewed_at: string
          reviewed_by_name: string
          started_at: string
          student_email: string
          student_id: string
          student_name: string
          submitted_at: string
          total_events: number
        }[]
      }
      get_instructor_course_ids: {
        Args: { p_user_id?: string }
        Returns: string[]
      }
      get_messages_with_user: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_other_user_id: string
          p_user_id: string
        }
        Returns: {
          content: string
          content_type: string
          created_at: string
          file_name: string
          file_size: number
          file_url: string
          from_user_id: string
          from_user_name: string
          id: string
          is_mine: boolean
          is_read: boolean
          to_user_id: string
          to_user_name: string
        }[]
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
        Returns: Json
      }
      get_shared_courses: {
        Args: {
          p_certification_level?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort_by?: string
          p_tags?: string[]
        }
        Returns: {
          clone_count: number
          course_code: string
          course_type: string
          description: string
          id: string
          is_official: boolean
          lesson_count: number
          module_count: number
          share_description: string
          share_tags: string[]
          shared_at: string
          tenant_id: string
          tenant_name: string
          title: string
        }[]
      }
      get_storage_usage: { Args: { p_tenant_id: string }; Returns: Json }
      get_student_links: {
        Args: { p_student_id: string; p_tenant_id: string }
        Returns: {
          category: string
          description: string
          icon: string
          id: string
          is_required: boolean
          link_type: string
          program_name: string
          sort_order: number
          title: string
          url: string
        }[]
      }
      get_student_videos: {
        Args: { p_student_id: string; p_tenant_id: string }
        Returns: {
          completed: boolean
          completed_at: string
          description: string
          duration_seconds: number
          grants_virtual_attendance: boolean
          id: string
          last_position_seconds: number
          minimum_watch_percentage: number
          program_id: string
          program_name: string
          requires_coursework: boolean
          session_id: string
          thumbnail_url: string
          title: string
          video_source: string
          video_url: string
          virtual_attendance_granted: boolean
          watch_percentage: number
        }[]
      }
      get_todays_sessions: {
        Args: { p_instructor_id?: string; p_tenant_id: string }
        Returns: {
          check_in_count: number
          end_time: string
          has_active_code: boolean
          id: string
          location: string
          program_id: string
          program_name: string
          scheduled_date: string
          session_status: string
          session_type: string
          start_time: string
          title: string
        }[]
      }
      get_user_agency_role: {
        Args: never
        Returns: Database["public"]["Enums"]["agency_role"]
      }
      get_user_conversations: {
        Args: { p_user_id: string }
        Returns: {
          is_sender: boolean
          last_message: string
          last_message_at: string
          other_user_avatar: string
          other_user_email: string
          other_user_id: string
          other_user_name: string
          unread_count: number
        }[]
      }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_tenant_id: { Args: never; Returns: string }
      get_video_statistics: {
        Args: { p_tenant_id: string; p_video_id: string }
        Returns: {
          average_watch_percentage: number
          completed_count: number
          total_viewers: number
          virtual_attendance_count: number
        }[]
      }
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
      qr_check_in: {
        Args: { p_code: string; p_student_id: string; p_tenant_id: string }
        Returns: Json
      }
      recalculate_quiz_scores: {
        Args: { p_assignment_id: string }
        Returns: number
      }
      record_integrity_event: {
        Args: {
          p_attempt_id: string
          p_event_data?: Json
          p_event_type: string
          p_question_id?: string
          p_question_number?: number
          p_tenant_id: string
          p_user_id: string
        }
        Returns: Json
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
      request_clinical_shift: {
        Args: {
          p_request_notes?: string
          p_shift_id: string
          p_student_id: string
          p_tenant_id: string
        }
        Returns: {
          booked_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          hours_completed: number | null
          id: string
          notes: string | null
          poc_response_notes: string | null
          preceptor_name: string | null
          preceptor_signature: string | null
          preceptor_signature_credentials: string | null
          preceptor_signature_data: string | null
          preceptor_signature_name: string | null
          preceptor_signed_at: string | null
          request_notes: string | null
          requested_at: string | null
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
      review_integrity_attempt: {
        Args: {
          p_attempt_id: string
          p_decision: string
          p_notes?: string
          p_reviewer_id: string
        }
        Returns: Json
      }
      send_direct_message: {
        Args: {
          p_content: string
          p_content_type?: string
          p_file_name?: string
          p_file_size?: number
          p_file_url?: string
          p_from_user_id: string
          p_tenant_id: string
          p_to_user_id: string
        }
        Returns: {
          content: string
          content_type: string | null
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_url: string | null
          from_user_id: string
          from_user_name: string
          id: string
          is_deleted: boolean | null
          is_read: boolean | null
          tenant_id: string
          to_user_id: string | null
          to_user_name: string | null
        }
        SetofOptions: {
          from: "*"
          to: "direct_messages"
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
        Returns: Json
      }
      toggle_course_sharing: {
        Args: {
          p_course_id: string
          p_share: boolean
          p_share_description?: string
          p_share_tags?: string[]
        }
        Returns: boolean
      }
      update_video_progress: {
        Args: {
          p_duration_seconds: number
          p_last_position_seconds: number
          p_tenant_id: string
          p_user_id: string
          p_video_id: string
          p_watch_time_seconds: number
        }
        Returns: Json
      }
      validate_md_invite_code: {
        Args: { p_invite_code: string }
        Returns: {
          email: string
          md_name: string
          tenant_name: string
          valid: boolean
        }[]
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
      attendance_status: "present" | "absent" | "late" | "excused" | "virtual"
      booking_status:
        | "booked"
        | "completed"
        | "cancelled"
        | "no_show"
        | "pending_poc_approval"
        | "poc_approved"
        | "poc_denied"
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
      integrity_event_type:
        | "blur"
        | "focus"
        | "copy"
        | "paste"
        | "cut"
        | "right_click"
        | "print"
        | "screenshot"
        | "shortcut"
        | "selection"
        | "resize"
        | "devtools"
        | "tab_hidden"
        | "tab_visible"
      integrity_review_decision: "cleared" | "warning" | "violation"
      log_type: "hours" | "patient_contact"
      notification_type: "assignment" | "grade" | "announcement" | "reminder"
      outcome_type: "course" | "program" | "institutional"
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
      suspicion_level: "low" | "medium" | "high"
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
      attendance_status: ["present", "absent", "late", "excused", "virtual"],
      booking_status: [
        "booked",
        "completed",
        "cancelled",
        "no_show",
        "pending_poc_approval",
        "poc_approved",
        "poc_denied",
      ],
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
      integrity_event_type: [
        "blur",
        "focus",
        "copy",
        "paste",
        "cut",
        "right_click",
        "print",
        "screenshot",
        "shortcut",
        "selection",
        "resize",
        "devtools",
        "tab_hidden",
        "tab_visible",
      ],
      integrity_review_decision: ["cleared", "warning", "violation"],
      log_type: ["hours", "patient_contact"],
      notification_type: ["assignment", "grade", "announcement", "reminder"],
      outcome_type: ["course", "program", "institutional"],
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
      suspicion_level: ["low", "medium", "high"],
      user_role: ["admin", "instructor", "student"],
      verification_cycle_type: ["initial", "annual", "remedial"],
      verification_status: ["pending", "verified", "rejected"],
    },
  },
} as const
