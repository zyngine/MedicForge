"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant, useSubscriptionLimits } from "./use-tenant";

interface UsageStats {
  instructorCount: number;
  studentCount: number;
  courseCount: number;
}

interface EnforcementResult {
  // Current usage
  usage: UsageStats;
  isLoading: boolean;
  error: Error | null;

  // Limit checks
  canAddInstructor: boolean;
  canAddStudent: boolean;
  canAddCourse: boolean;

  // Warning states (approaching limits - 80% or more)
  instructorWarning: boolean;
  studentWarning: boolean;
  courseWarning: boolean;

  // At limit states
  instructorAtLimit: boolean;
  studentAtLimit: boolean;
  courseAtLimit: boolean;

  // Limits info
  limits: {
    instructors: number;
    students: number;
    courses: number;
    storage: number;
  };
  tier: string;

  // Helper to get remaining count
  remaining: {
    instructors: number | "unlimited";
    students: number | "unlimited";
    courses: number | "unlimited";
  };

  // Refresh function
  refetch: () => void;
}

/**
 * Hook for enforcing subscription limits
 * Fetches current usage and compares against tier limits
 */
export function useSubscriptionEnforcement(): EnforcementResult {
  const { tenant } = useTenant();
  const { limits, tier } = useSubscriptionLimits();
  const supabase = createClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["subscription-usage", tenant?.id],
    queryFn: async (): Promise<UsageStats> => {
      if (!tenant?.id) {
        return { instructorCount: 0, studentCount: 0, courseCount: 0 };
      }

      // Fetch counts in parallel
      const [instructorResult, studentResult, courseResult] = await Promise.all([
        supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant.id)
          .eq("role", "instructor")
          .eq("is_active", true),
        supabase
          .from("users")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant.id)
          .eq("role", "student")
          .eq("is_active", true),
        supabase
          .from("courses")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant.id)
          .eq("is_archived", false),
      ]);

      return {
        instructorCount: instructorResult.count || 0,
        studentCount: studentResult.count || 0,
        courseCount: courseResult.count || 0,
      };
    },
    enabled: !!tenant?.id,
    staleTime: 30000, // Cache for 30 seconds
  });

  const usage = data || { instructorCount: 0, studentCount: 0, courseCount: 0 };

  // Calculate if can add (unlimited = -1)
  const canAddInstructor =
    limits.instructors === -1 || usage.instructorCount < limits.instructors;
  const canAddStudent =
    limits.students === -1 || usage.studentCount < limits.students;
  const canAddCourse =
    limits.courses === -1 || usage.courseCount < limits.courses;

  // Calculate warning states (80% of limit)
  const instructorWarning =
    limits.instructors !== -1 &&
    usage.instructorCount >= limits.instructors * 0.8 &&
    usage.instructorCount < limits.instructors;
  const studentWarning =
    limits.students !== -1 &&
    usage.studentCount >= limits.students * 0.8 &&
    usage.studentCount < limits.students;
  const courseWarning =
    limits.courses !== -1 &&
    usage.courseCount >= limits.courses * 0.8 &&
    usage.courseCount < limits.courses;

  // Calculate at limit states
  const instructorAtLimit =
    limits.instructors !== -1 && usage.instructorCount >= limits.instructors;
  const studentAtLimit =
    limits.students !== -1 && usage.studentCount >= limits.students;
  const courseAtLimit =
    limits.courses !== -1 && usage.courseCount >= limits.courses;

  // Calculate remaining
  const remaining = {
    instructors:
      limits.instructors === -1
        ? ("unlimited" as const)
        : Math.max(0, limits.instructors - usage.instructorCount),
    students:
      limits.students === -1
        ? ("unlimited" as const)
        : Math.max(0, limits.students - usage.studentCount),
    courses:
      limits.courses === -1
        ? ("unlimited" as const)
        : Math.max(0, limits.courses - usage.courseCount),
  };

  return {
    usage,
    isLoading,
    error: error as Error | null,
    canAddInstructor,
    canAddStudent,
    canAddCourse,
    instructorWarning,
    studentWarning,
    courseWarning,
    instructorAtLimit,
    studentAtLimit,
    courseAtLimit,
    limits,
    tier,
    remaining,
    refetch,
  };
}

/**
 * Get a user-friendly message for limit reached
 */
export function getLimitMessage(
  type: "instructor" | "student" | "course",
  tier: string,
  limit: number
): string {
  const typeLabel = type === "instructor" ? "instructors" : type === "student" ? "students" : "courses";

  if (tier === "free") {
    return `You've reached the free tier limit of ${limit} ${typeLabel}. Upgrade to Professional for more capacity.`;
  } else if (tier === "pro") {
    return `You've reached the Professional tier limit of ${limit} ${typeLabel}. Upgrade to Institution for more capacity.`;
  } else if (tier === "institution") {
    return `You've reached the Institution tier limit of ${limit} ${typeLabel}. Contact sales for Enterprise options.`;
  }
  return `You've reached your plan's limit of ${limit} ${typeLabel}.`;
}

/**
 * Get a user-friendly warning message for approaching limits
 */
export function getLimitWarningMessage(
  type: "instructor" | "student" | "course",
  current: number,
  limit: number
): string {
  const typeLabel = type === "instructor" ? "instructors" : type === "student" ? "students" : "courses";
  const remaining = limit - current;

  return `You're approaching your ${typeLabel} limit. ${remaining} remaining out of ${limit}.`;
}
