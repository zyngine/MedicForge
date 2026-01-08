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
