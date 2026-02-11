import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function generateEnrollmentCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatPoints(points: number, total: number): string {
  return `${points}/${total}`;
}

export function getGradeColor(percentage: number): string {
  if (percentage >= 90) return "text-success";
  if (percentage >= 80) return "text-info";
  if (percentage >= 70) return "text-warning";
  return "text-error";
}

export function getLetterGrade(percentage: number): string {
  if (percentage >= 93) return "A";
  if (percentage >= 90) return "A-";
  if (percentage >= 87) return "B+";
  if (percentage >= 83) return "B";
  if (percentage >= 80) return "B-";
  if (percentage >= 77) return "C+";
  if (percentage >= 73) return "C";
  if (percentage >= 70) return "C-";
  if (percentage >= 67) return "D+";
  if (percentage >= 63) return "D";
  if (percentage >= 60) return "D-";
  return "F";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return secs > 0 ? `${hours}h ${minutes}m ${secs}s` : `${hours}h ${minutes}m`;
  }
  return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce(
    (result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    },
    {} as Record<string, T[]>
  );
}

export const COURSE_TYPES = [
  { value: "EMR", label: "Emergency Medical Responder" },
  { value: "EMT", label: "Emergency Medical Technician" },
  { value: "AEMT", label: "Advanced EMT" },
  { value: "Paramedic", label: "Paramedic" },
  { value: "Custom", label: "Custom Course" },
] as const;

export type CourseType = (typeof COURSE_TYPES)[number]["value"];

export const USER_ROLES = [
  { value: "admin", label: "Administrator" },
  { value: "instructor", label: "Instructor" },
  { value: "student", label: "Student" },
] as const;

export type UserRole = (typeof USER_ROLES)[number]["value"];

export const SUBSCRIPTION_TIERS = [
  { value: "free", label: "Free", maxStudents: 25, maxInstructors: 1, maxCourses: 2 },
  { value: "pro", label: "Professional", maxStudents: 100, maxInstructors: 5, maxCourses: null },
  { value: "institution", label: "Institution", maxStudents: 500, maxInstructors: null, maxCourses: null },
  { value: "enterprise", label: "Enterprise", maxStudents: null, maxInstructors: null, maxCourses: null },
] as const;

export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number]["value"];
