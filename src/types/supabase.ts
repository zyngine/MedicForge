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
          site_name: string | null
          site_type: string | null
          skills_performed: Json | null
          student_id: string
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
          site_name?: string | null
          site_type?: string | null
          skills_performed?: Json | null
          student_id: string
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
          site_name?: string | null
          site_type?: string | null
          skills_performed?: Json | null
          student_id?: string
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
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
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
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
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
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_tenant_id: { Args: never; Returns: string }
      is_platform_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      assignment_type: "quiz" | "written" | "skill_checklist" | "discussion"
      attendance_status: "present" | "absent" | "late" | "excused"
      content_type: "video" | "document" | "text" | "embed"
      course_type: "EMR" | "EMT" | "AEMT" | "Paramedic" | "Custom"
      enrollment_status: "active" | "completed" | "dropped"
      event_type: "class" | "lab" | "clinical" | "exam" | "other"
      file_context: "course" | "assignment" | "submission" | "profile"
      log_type: "hours" | "patient_contact"
      notification_type: "assignment" | "grade" | "announcement" | "reminder"
      question_type:
        | "multiple_choice"
        | "true_false"
        | "matching"
        | "short_answer"
      skill_status: "passed" | "failed" | "needs_practice"
      submission_status: "in_progress" | "submitted" | "graded" | "returned"
      subscription_status: "active" | "canceled" | "past_due" | "trialing"
      subscription_tier: "free" | "pro" | "institution" | "enterprise"
      user_role: "admin" | "instructor" | "student"
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
      assignment_type: ["quiz", "written", "skill_checklist", "discussion"],
      attendance_status: ["present", "absent", "late", "excused"],
      content_type: ["video", "document", "text", "embed"],
      course_type: ["EMR", "EMT", "AEMT", "Paramedic", "Custom"],
      enrollment_status: ["active", "completed", "dropped"],
      event_type: ["class", "lab", "clinical", "exam", "other"],
      file_context: ["course", "assignment", "submission", "profile"],
      log_type: ["hours", "patient_contact"],
      notification_type: ["assignment", "grade", "announcement", "reminder"],
      question_type: [
        "multiple_choice",
        "true_false",
        "matching",
        "short_answer",
      ],
      skill_status: ["passed", "failed", "needs_practice"],
      submission_status: ["in_progress", "submitted", "graded", "returned"],
      subscription_status: ["active", "canceled", "past_due", "trialing"],
      subscription_tier: ["free", "pro", "institution", "enterprise"],
      user_role: ["admin", "instructor", "student"],
      verification_status: ["pending", "verified", "rejected"],
    },
  },
} as const
