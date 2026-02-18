"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";

export interface GradeDistribution {
  grade_range: string;
  count: number;
  percentage: number;
}

export interface AssignmentStats {
  assignment_id: string;
  assignment_title: string;
  submissions_count: number;
  graded_count: number;
  average_score: number | null;
  median_score: number | null;
  min_score: number | null;
  max_score: number | null;
  std_deviation: number | null;
}

export interface StudentGradeOverview {
  student_id: string;
  student_name: string;
  assignments_completed: number;
  assignments_total: number;
  average_grade: number | null;
  current_grade: number | null;
  grade_trend: "improving" | "declining" | "stable";
  at_risk: boolean;
}

export interface CourseGradeOverview {
  course_id: string;
  course_title: string;
  enrolled_count: number;
  average_grade: number | null;
  grade_distribution: GradeDistribution[];
  passing_rate: number | null;
  at_risk_count: number;
}

// Hook for assignment grade distribution
export function useGradeDistribution(assignmentId: string, bucketSize: number = 10) {
  const [distribution, setDistribution] = useState<GradeDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchDistribution = async () => {
      if (!assignmentId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc("get_grade_distribution", {
          p_assignment_id: assignmentId,
          p_bucket_size: bucketSize,
        });

        if (error) throw error;
        setDistribution(data || []);
      } catch (err) {
        console.error("Failed to fetch grade distribution:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDistribution();
  }, [assignmentId, bucketSize, supabase]);

  return { distribution, isLoading };
}

// Hook for course grade statistics
export function useCourseGradeStats(courseId: string) {
  const [stats, setStats] = useState<AssignmentStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchStats = async () => {
      if (!courseId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any).rpc("get_course_grade_stats", {
          p_course_id: courseId,
        });

        if (error) throw error;
        setStats(data || []);
      } catch (err) {
        console.error("Failed to fetch course grade stats:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [courseId, supabase]);

  // Calculate course-wide metrics
  const courseMetrics = {
    totalAssignments: stats.length,
    averageClassScore: stats.length > 0
      ? stats.reduce((sum, s) => sum + (s.average_score || 0), 0) / stats.filter(s => s.average_score).length
      : null,
    lowestPerformingAssignment: stats.reduce(
      (lowest, s) => (!lowest || (s.average_score && s.average_score < (lowest.average_score || 100)) ? s : lowest),
      null as AssignmentStats | null
    ),
    highestPerformingAssignment: stats.reduce(
      (highest, s) => (!highest || (s.average_score && s.average_score > (highest.average_score || 0)) ? s : highest),
      null as AssignmentStats | null
    ),
  };

  return { stats, courseMetrics, isLoading };
}

// Hook for student grade overview in a course
export function useStudentGrades(courseId: string) {
  const [students, setStudents] = useState<StudentGradeOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchStudentGrades = useCallback(async () => {
    if (!profile?.tenant_id || !courseId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Get all enrolled students with their submissions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: enrollments, error: enrollError } = await (supabase as any)
        .from("enrollments")
        .select(`
          student_id,
          student:users!enrollments_student_id_fkey(id, full_name),
          completion_percentage,
          final_grade
        `)
        .eq("course_id", courseId)
        .eq("status", "active");

      if (enrollError) throw enrollError;

      // Get assignment count for the course
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: assignments, error: assignError } = await (supabase as any)
        .from("assignments")
        .select("id")
        .eq("tenant_id", profile.tenant_id)
        .in("module_id", (supabase as any)
          .from("modules")
          .select("id")
          .eq("course_id", courseId)
        );

      const totalAssignments = assignments?.length || 0;

      // Get submissions for each student
      const studentOverviews: StudentGradeOverview[] = await Promise.all(
        (enrollments || []).map(async (enrollment: { student_id: string; student: { id: string; full_name: string }; completion_percentage: number; final_grade: number | null }) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: submissions } = await (supabase as any)
            .from("submissions")
            .select("final_score, submitted_at")
            .eq("student_id", enrollment.student_id)
            .eq("status", "graded")
            .order("submitted_at", { ascending: true });

          const completedCount = submissions?.length || 0;
          const scores = submissions?.map((s: { final_score: number }) => s.final_score).filter(Boolean) || [];
          const averageGrade = scores.length > 0
            ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
            : null;

          // Calculate trend (compare recent 3 vs previous 3)
          let trend: "improving" | "declining" | "stable" = "stable";
          if (scores.length >= 6) {
            const recent = scores.slice(-3).reduce((a: number, b: number) => a + b, 0) / 3;
            const previous = scores.slice(-6, -3).reduce((a: number, b: number) => a + b, 0) / 3;
            if (recent > previous + 5) trend = "improving";
            else if (recent < previous - 5) trend = "declining";
          }

          // At-risk if average below 70 or completion below 50%
          const atRisk = (averageGrade !== null && averageGrade < 70) ||
            (totalAssignments > 0 && completedCount / totalAssignments < 0.5);

          return {
            student_id: enrollment.student_id,
            student_name: enrollment.student?.full_name || "Unknown",
            assignments_completed: completedCount,
            assignments_total: totalAssignments,
            average_grade: averageGrade,
            current_grade: enrollment.final_grade,
            grade_trend: trend,
            at_risk: atRisk,
          };
        })
      );

      setStudents(studentOverviews);
    } catch (err) {
      console.error("Failed to fetch student grades:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, courseId, supabase]);

  useEffect(() => {
    fetchStudentGrades();
  }, [fetchStudentGrades]);

  // Aggregate metrics
  const classMetrics = {
    totalStudents: students.length,
    averageGrade: students.filter(s => s.average_grade).length > 0
      ? students.reduce((sum, s) => sum + (s.average_grade || 0), 0) / students.filter(s => s.average_grade).length
      : null,
    atRiskCount: students.filter(s => s.at_risk).length,
    passingCount: students.filter(s => s.average_grade && s.average_grade >= 70).length,
    improvingCount: students.filter(s => s.grade_trend === "improving").length,
    decliningCount: students.filter(s => s.grade_trend === "declining").length,
  };

  return {
    students,
    classMetrics,
    isLoading,
    refetch: fetchStudentGrades,
    atRiskStudents: students.filter(s => s.at_risk),
  };
}

// Hook for course overview (admin view)
export function useCourseGradeOverviews() {
  const [courses, setCourses] = useState<CourseGradeOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  useEffect(() => {
    const fetchOverviews = async () => {
      if (!profile?.tenant_id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Get all courses
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: coursesData, error } = await (supabase as any)
          .from("courses")
          .select(`
            id,
            title,
            enrollments(count)
          `)
          .eq("tenant_id", profile.tenant_id)
          .eq("is_active", true);

        if (error) throw error;

        // Get grade data for each course
        const overviews: CourseGradeOverview[] = await Promise.all(
          (coursesData || []).map(async (course: { id: string; title: string; enrollments: { count: number }[] }) => {
            // Get grade distribution
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: grades } = await (supabase as any)
              .from("enrollments")
              .select("final_grade")
              .eq("course_id", course.id)
              .not("final_grade", "is", null);

            const gradeValues = grades?.map((g: { final_grade: number }) => g.final_grade) || [];
            const avgGrade = gradeValues.length > 0
              ? gradeValues.reduce((a: number, b: number) => a + b, 0) / gradeValues.length
              : null;

            // Calculate distribution
            const distribution: GradeDistribution[] = [];
            const buckets = [
              { min: 90, max: 100, label: "A (90-100)" },
              { min: 80, max: 89, label: "B (80-89)" },
              { min: 70, max: 79, label: "C (70-79)" },
              { min: 60, max: 69, label: "D (60-69)" },
              { min: 0, max: 59, label: "F (0-59)" },
            ];

            buckets.forEach(bucket => {
              const count = gradeValues.filter((g: number) => g >= bucket.min && g <= bucket.max).length;
              distribution.push({
                grade_range: bucket.label,
                count,
                percentage: gradeValues.length > 0 ? (count / gradeValues.length) * 100 : 0,
              });
            });

            const passingCount = gradeValues.filter((g: number) => g >= 70).length;
            const atRiskCount = gradeValues.filter((g: number) => g < 70).length;

            return {
              course_id: course.id,
              course_title: course.title,
              enrolled_count: course.enrollments?.[0]?.count || 0,
              average_grade: avgGrade,
              grade_distribution: distribution,
              passing_rate: gradeValues.length > 0 ? (passingCount / gradeValues.length) * 100 : null,
              at_risk_count: atRiskCount,
            };
          })
        );

        setCourses(overviews);
      } catch (err) {
        console.error("Failed to fetch course overviews:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverviews();
  }, [profile?.tenant_id, supabase]);

  return { courses, isLoading };
}

// Letter grade helper
export function getLetterGrade(score: number | null): string {
  if (score === null) return "-";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

// Grade color helper
export function getGradeColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score >= 90) return "text-green-600";
  if (score >= 80) return "text-blue-600";
  if (score >= 70) return "text-yellow-600";
  if (score >= 60) return "text-orange-600";
  return "text-red-600";
}

// Trend icon helper
export function getTrendIndicator(trend: "improving" | "declining" | "stable"): {
  icon: string;
  color: string;
  label: string;
} {
  switch (trend) {
    case "improving":
      return { icon: "↑", color: "text-green-600", label: "Improving" };
    case "declining":
      return { icon: "↓", color: "text-red-600", label: "Declining" };
    default:
      return { icon: "→", color: "text-gray-500", label: "Stable" };
  }
}
