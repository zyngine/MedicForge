"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Enrollment, Module, Assignment, Submission } from "@/types";

export interface ModuleProgress {
  moduleId: string;
  moduleTitle: string;
  totalLessons: number;
  completedLessons: number;
  totalAssignments: number;
  completedAssignments: number;
  progressPercent: number;
  isComplete: boolean;
}

export interface CourseProgress {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  overallProgress: number;
  moduleProgress: ModuleProgress[];
  totalModules: number;
  completedModules: number;
  totalAssignments: number;
  completedAssignments: number;
  averageScore: number | null;
  isComplete: boolean;
}

export function useCourseProgress(courseId: string | null) {
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchProgress = useCallback(async () => {
    if (!courseId) {
      setProgress(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch enrollment
      const { data: enrollment, error: enrollError } = await supabase
        .from("enrollments")
        .select(`
          *,
          course:courses(*)
        `)
        .eq("course_id", courseId)
        .eq("student_id", user.id)
        .single();

      if (enrollError) throw enrollError;

      // Fetch modules with lessons and assignments
      const { data: modules, error: modulesError } = await supabase
        .from("modules")
        .select(`
          *,
          lessons:lessons(id),
          assignments:assignments(id, points_possible)
        `)
        .eq("course_id", courseId)
        .eq("is_published", true)
        .order("order_index", { ascending: true });

      if (modulesError) throw modulesError;

      // Fetch all submissions for this student in this course
      const assignmentIds = (modules || []).flatMap(m =>
        (m.assignments || []).map((a: any) => a.id)
      );

      let submissions: any[] = [];
      if (assignmentIds.length > 0) {
        const { data: subs, error: subsError } = await supabase
          .from("submissions")
          .select("*")
          .eq("student_id", user.id)
          .in("assignment_id", assignmentIds)
          .in("status", ["submitted", "graded"]);

        if (subsError) throw subsError;
        submissions = subs || [];
      }

      // Calculate progress for each module
      const submittedAssignmentIds = new Set(submissions.map(s => s.assignment_id));
      const gradedSubmissions = submissions.filter(s => s.status === "graded" && s.final_score !== null);

      const moduleProgressList: ModuleProgress[] = (modules || []).map((module: any) => {
        const lessonCount = module.lessons?.length || 0;
        const assignmentCount = module.assignments?.length || 0;
        const moduleAssignmentIds = (module.assignments || []).map((a: any) => a.id);
        const completedAssignments = moduleAssignmentIds.filter((id: string) =>
          submittedAssignmentIds.has(id)
        ).length;

        // For now, assume all lessons in a module are complete if any assignment is submitted
        // In a real app, you'd have a lesson_progress table
        const completedLessons = completedAssignments > 0 ? lessonCount : 0;

        const total = lessonCount + assignmentCount;
        const completed = completedLessons + completedAssignments;
        const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          moduleId: module.id,
          moduleTitle: module.title,
          totalLessons: lessonCount,
          completedLessons,
          totalAssignments: assignmentCount,
          completedAssignments,
          progressPercent,
          isComplete: progressPercent === 100,
        };
      });

      // Calculate overall progress
      const totalAssignments = assignmentIds.length;
      const completedAssignments = submittedAssignmentIds.size;
      const completedModules = moduleProgressList.filter(m => m.isComplete).length;

      // Calculate average score
      let averageScore: number | null = null;
      if (gradedSubmissions.length > 0) {
        const totalScore = gradedSubmissions.reduce((sum, s) => sum + (s.final_score || 0), 0);
        averageScore = Math.round(totalScore / gradedSubmissions.length);
      }

      const overallProgress = totalAssignments > 0
        ? Math.round((completedAssignments / totalAssignments) * 100)
        : 0;

      const courseProgress: CourseProgress = {
        enrollmentId: enrollment.id,
        courseId,
        courseTitle: enrollment.course?.title || "",
        overallProgress,
        moduleProgress: moduleProgressList,
        totalModules: modules?.length || 0,
        completedModules,
        totalAssignments,
        completedAssignments,
        averageScore,
        isComplete: overallProgress === 100,
      };

      setProgress(courseProgress);

      // Update enrollment completion percentage
      if (enrollment.completion_percentage !== overallProgress) {
        await supabase
          .from("enrollments")
          .update({ completion_percentage: overallProgress })
          .eq("id", enrollment.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch progress"));
    } finally {
      setIsLoading(false);
    }
  }, [courseId, supabase]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return { progress, isLoading, error, refetch: fetchProgress };
}

// Hook for getting progress across all enrolled courses
export function useAllCoursesProgress() {
  const [progress, setProgress] = useState<CourseProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchProgress = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch all active enrollments with course data
      const { data: enrollments, error: enrollError } = await supabase
        .from("enrollments")
        .select(`
          *,
          course:courses(
            *,
            modules:modules(
              id,
              title,
              lessons:lessons(id),
              assignments:assignments(id, points_possible)
            )
          )
        `)
        .eq("student_id", user.id)
        .eq("status", "active");

      if (enrollError) throw enrollError;

      // Fetch all submissions for this student
      const { data: submissions, error: subsError } = await supabase
        .from("submissions")
        .select("*")
        .eq("student_id", user.id)
        .in("status", ["submitted", "graded"]);

      if (subsError) throw subsError;

      const submittedAssignmentIds = new Set((submissions || []).map(s => s.assignment_id));
      const gradedSubmissions = (submissions || []).filter(s => s.status === "graded" && s.final_score !== null);

      const allProgress: CourseProgress[] = (enrollments || []).map((enrollment: any) => {
        const modules = enrollment.course?.modules || [];

        const moduleProgressList: ModuleProgress[] = modules.map((module: any) => {
          const lessonCount = module.lessons?.length || 0;
          const assignmentCount = module.assignments?.length || 0;
          const moduleAssignmentIds = (module.assignments || []).map((a: any) => a.id);
          const completedAssignments = moduleAssignmentIds.filter((id: string) =>
            submittedAssignmentIds.has(id)
          ).length;

          const completedLessons = completedAssignments > 0 ? lessonCount : 0;
          const total = lessonCount + assignmentCount;
          const completed = completedLessons + completedAssignments;
          const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

          return {
            moduleId: module.id,
            moduleTitle: module.title,
            totalLessons: lessonCount,
            completedLessons,
            totalAssignments: assignmentCount,
            completedAssignments,
            progressPercent,
            isComplete: progressPercent === 100,
          };
        });

        const totalAssignments = modules.flatMap((m: any) => m.assignments || []).length;
        const allAssignmentIds = modules.flatMap((m: any) =>
          (m.assignments || []).map((a: any) => a.id)
        );
        const completedAssignments = allAssignmentIds.filter((id: string) =>
          submittedAssignmentIds.has(id)
        ).length;
        const completedModules = moduleProgressList.filter(m => m.isComplete).length;

        // Calculate average score for this course
        const courseSubmissions = gradedSubmissions.filter(s =>
          allAssignmentIds.includes(s.assignment_id)
        );
        let averageScore: number | null = null;
        if (courseSubmissions.length > 0) {
          const totalScore = courseSubmissions.reduce((sum, s) => sum + (s.final_score || 0), 0);
          averageScore = Math.round(totalScore / courseSubmissions.length);
        }

        const overallProgress = totalAssignments > 0
          ? Math.round((completedAssignments / totalAssignments) * 100)
          : 0;

        return {
          enrollmentId: enrollment.id,
          courseId: enrollment.course_id,
          courseTitle: enrollment.course?.title || "",
          overallProgress,
          moduleProgress: moduleProgressList,
          totalModules: modules.length,
          completedModules,
          totalAssignments,
          completedAssignments,
          averageScore,
          isComplete: overallProgress === 100,
        };
      });

      setProgress(allProgress);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch progress"));
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return { progress, isLoading, error, refetch: fetchProgress };
}
