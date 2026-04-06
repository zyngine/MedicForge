"use client";

import { useMutation } from "@tanstack/react-query";

type EmailType =
  | "welcome"
  | "assignment_due"
  | "grade_posted"
  | "announcement"
  | "clinical_reminder"
  | "enrollment_confirmation"
  | "skill_verified";

interface SendEmailParams {
  type: EmailType;
  to: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Hook for sending emails
 *
 * @example
 * ```tsx
 * const { mutate: sendEmail, isPending } = useSendEmail();
 *
 * // Send welcome email
 * sendEmail({
 *   type: "welcome",
 *   to: "student@example.com",
 *   data: {
 *     userName: "John Doe",
 *     tenantName: "EMS Academy",
 *     role: "student",
 *   },
 * });
 *
 * // Send grade notification
 * sendEmail({
 *   type: "grade_posted",
 *   to: "student@example.com",
 *   data: {
 *     userName: "John",
 *     assignmentTitle: "Module 1 Quiz",
 *     courseName: "EMT Basic",
 *     score: 85,
 *     maxScore: 100,
 *     percentage: 85,
 *     gradesUrl: "/student/grades",
 *   },
 * });
 * ```
 */
export function useSendEmail() {
  return useMutation({
    mutationFn: async (params: SendEmailParams): Promise<SendEmailResult> => {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      return data;
    },
  });
}

/**
 * Hook for sending bulk emails (one by one with progress)
 */
export function useSendBulkEmails() {
  return useMutation({
    mutationFn: async (
      emails: SendEmailParams[]
    ): Promise<{ sent: number; failed: number }> => {
      let sent = 0;
      let failed = 0;

      for (const email of emails) {
        try {
          const response = await fetch("/api/email/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(email),
          });

          if (response.ok) {
            sent++;
          } else {
            failed++;
          }

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch {
          failed++;
        }
      }

      return { sent, failed };
    },
  });
}

// Email template data types for type safety
export interface WelcomeEmailData {
  userName: string;
  tenantName: string;
  role: string;
  loginUrl?: string;
}

export interface AssignmentDueEmailData {
  userName: string;
  assignmentTitle: string;
  courseName: string;
  dueDate: string;
  dueTime: string;
  assignmentUrl: string;
}

export interface GradePostedEmailData {
  userName: string;
  assignmentTitle: string;
  courseName: string;
  score: number;
  maxScore: number;
  percentage: number;
  feedback?: string;
  gradesUrl: string;
}

export interface AnnouncementEmailData {
  userName: string;
  courseName: string;
  announcementTitle: string;
  announcementContent: string;
  instructorName: string;
  courseUrl: string;
}

export interface ClinicalReminderEmailData {
  userName: string;
  siteName: string;
  siteAddress: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface EnrollmentConfirmationEmailData {
  userName: string;
  courseName: string;
  instructorName: string;
  startDate: string;
  courseUrl: string;
}

export interface SkillVerifiedEmailData {
  userName: string;
  skillName: string;
  status: "verified" | "needs_practice";
  feedback?: string;
  evaluatorName: string;
  competenciesUrl: string;
}
