"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import { useUser } from "./use-user";

// Type for lesson_progress table (migration: 20240309000000_lesson_progress.sql)
// This can be removed once types are regenerated from Supabase
interface LessonProgressRecord {
  id: string;
  tenant_id: string;
  lesson_id: string;
  student_id: string;
  started_at: string | null;
  completed_at: string | null;
  time_spent_seconds: number | null;
  last_position: any;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

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
  totalLessons: number;
  completedLessons: number;
  averageScore: number | null;
  isComplete: boolean;
}

/**
 * Get progress for a specific course
 */
export function useCourseProgress(courseId: string | null | undefined) {
  const { tenant } = useTenant();
  const { user } = useUser();

  return useQuery({
    queryKey: ["course-progress", courseId, user?.id],
    queryFn: async () => {
      if (!courseId || !user?.id) return null;

      const supabase = createClient();

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

      // Fetch lesson progress for this student
      // Note: lesson_progress table added in migration 20240309000000
      const { data: lessonProgress } = await (supabase as any)
        .from("lesson_progress")
        .select("lesson_id, completed_at")
        .eq("student_id", user.id);

      const completedLessonIds = new Set((lessonProgress || []).map((lp: any) => lp.lesson_id));

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
        const lessonIds = (module.lessons || []).map((l: any) => l.id);
        const lessonCount = lessonIds.length;
        const completedLessonsInModule = lessonIds.filter((id: string) => completedLessonIds.has(id)).length;

        const assignmentCount = module.assignments?.length || 0;
        const moduleAssignmentIds = (module.assignments || []).map((a: any) => a.id);
        const completedAssignments = moduleAssignmentIds.filter((id: string) =>
          submittedAssignmentIds.has(id)
        ).length;

        const total = lessonCount + assignmentCount;
        const completed = completedLessonsInModule + completedAssignments;
        const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          moduleId: module.id,
          moduleTitle: module.title,
          totalLessons: lessonCount,
          completedLessons: completedLessonsInModule,
          totalAssignments: assignmentCount,
          completedAssignments,
          progressPercent,
          isComplete: progressPercent === 100,
        };
      });

      // Calculate overall progress
      const totalAssignments = assignmentIds.length;
      const completedAssignmentsTotal = submittedAssignmentIds.size;
      const completedModules = moduleProgressList.filter(m => m.isComplete).length;

      const totalLessons = moduleProgressList.reduce((sum, m) => sum + m.totalLessons, 0);
      const completedLessonsTotal = moduleProgressList.reduce((sum, m) => sum + m.completedLessons, 0);

      // Calculate average score
      let averageScore: number | null = null;
      if (gradedSubmissions.length > 0) {
        const totalScore = gradedSubmissions.reduce((sum, s) => sum + (s.final_score || 0), 0);
        averageScore = Math.round(totalScore / gradedSubmissions.length);
      }

      const totalItems = totalLessons + totalAssignments;
      const completedItems = completedLessonsTotal + completedAssignmentsTotal;
      const overallProgress = totalItems > 0
        ? Math.round((completedItems / totalItems) * 100)
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
        completedAssignments: completedAssignmentsTotal,
        totalLessons,
        completedLessons: completedLessonsTotal,
        averageScore,
        isComplete: overallProgress === 100,
      };

      // Update enrollment completion percentage if changed
      if (enrollment.completion_percentage !== overallProgress) {
        await supabase
          .from("enrollments")
          .update({ completion_percentage: overallProgress })
          .eq("id", enrollment.id);
      }

      return courseProgress;
    },
    enabled: !!courseId && !!user?.id && !!tenant?.id,
  });
}

/**
 * Get progress across all enrolled courses
 */
export function useAllCoursesProgress() {
  const { tenant } = useTenant();
  const { user } = useUser();

  return useQuery({
    queryKey: ["all-courses-progress", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const supabase = createClient();

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

      // Fetch lesson progress for this student
      // Note: lesson_progress table added in migration 20240309000000
      const { data: lessonProgress } = await (supabase as any)
        .from("lesson_progress")
        .select("lesson_id, completed_at")
        .eq("student_id", user.id);

      const completedLessonIds = new Set((lessonProgress || []).map((lp: any) => lp.lesson_id));

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
          const lessonIds = (module.lessons || []).map((l: any) => l.id);
          const lessonCount = lessonIds.length;
          const completedLessonsInModule = lessonIds.filter((id: string) => completedLessonIds.has(id)).length;

          const assignmentCount = module.assignments?.length || 0;
          const moduleAssignmentIds = (module.assignments || []).map((a: any) => a.id);
          const completedAssignments = moduleAssignmentIds.filter((id: string) =>
            submittedAssignmentIds.has(id)
          ).length;

          const total = lessonCount + assignmentCount;
          const completed = completedLessonsInModule + completedAssignments;
          const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

          return {
            moduleId: module.id,
            moduleTitle: module.title,
            totalLessons: lessonCount,
            completedLessons: completedLessonsInModule,
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
        const completedAssignmentsTotal = allAssignmentIds.filter((id: string) =>
          submittedAssignmentIds.has(id)
        ).length;
        const completedModules = moduleProgressList.filter(m => m.isComplete).length;

        const totalLessons = moduleProgressList.reduce((sum, m) => sum + m.totalLessons, 0);
        const completedLessonsTotal = moduleProgressList.reduce((sum, m) => sum + m.completedLessons, 0);

        // Calculate average score for this course
        const courseSubmissions = gradedSubmissions.filter(s =>
          allAssignmentIds.includes(s.assignment_id)
        );
        let averageScore: number | null = null;
        if (courseSubmissions.length > 0) {
          const totalScore = courseSubmissions.reduce((sum, s) => sum + (s.final_score || 0), 0);
          averageScore = Math.round(totalScore / courseSubmissions.length);
        }

        const totalItems = totalLessons + totalAssignments;
        const completedItems = completedLessonsTotal + completedAssignmentsTotal;
        const overallProgress = totalItems > 0
          ? Math.round((completedItems / totalItems) * 100)
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
          completedAssignments: completedAssignmentsTotal,
          totalLessons,
          completedLessons: completedLessonsTotal,
          averageScore,
          isComplete: overallProgress === 100,
        };
      });

      return allProgress;
    },
    enabled: !!user?.id && !!tenant?.id,
  });
}

/**
 * Get progress for a specific module
 */
export function useModuleProgress(moduleId: string | null | undefined) {
  const { tenant } = useTenant();
  const { user } = useUser();

  return useQuery({
    queryKey: ["module-progress", moduleId, user?.id],
    queryFn: async () => {
      if (!moduleId || !user?.id) return null;

      const supabase = createClient();

      // Fetch module with lessons and assignments
      const { data: module, error: moduleError } = await supabase
        .from("modules")
        .select(`
          *,
          lessons:lessons(id),
          assignments:assignments(id, points_possible)
        `)
        .eq("id", moduleId)
        .single();

      if (moduleError) throw moduleError;

      // Fetch lesson progress
      const lessonIds = (module.lessons || []).map((l: any) => l.id);
      const { data: lessonProgress } = await (supabase as any)
        .from("lesson_progress")
        .select("lesson_id")
        .eq("student_id", user.id)
        .in("lesson_id", lessonIds);

      const completedLessonIds = new Set((lessonProgress || []).map((lp: any) => lp.lesson_id));

      // Fetch submissions
      const assignmentIds = (module.assignments || []).map((a: any) => a.id);
      let submissions: any[] = [];
      if (assignmentIds.length > 0) {
        const { data: subs } = await supabase
          .from("submissions")
          .select("assignment_id")
          .eq("student_id", user.id)
          .in("assignment_id", assignmentIds)
          .in("status", ["submitted", "graded"]);
        submissions = subs || [];
      }

      const submittedAssignmentIds = new Set(submissions.map(s => s.assignment_id));

      const lessonCount = lessonIds.length;
      const completedLessonsInModule = lessonIds.filter((id: string) => completedLessonIds.has(id)).length;
      const assignmentCount = module.assignments?.length || 0;
      const completedAssignments = assignmentIds.filter((id: string) =>
        submittedAssignmentIds.has(id)
      ).length;

      const total = lessonCount + assignmentCount;
      const completed = completedLessonsInModule + completedAssignments;
      const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        moduleId: module.id,
        moduleTitle: module.title,
        totalLessons: lessonCount,
        completedLessons: completedLessonsInModule,
        totalAssignments: assignmentCount,
        completedAssignments,
        progressPercent,
        isComplete: progressPercent === 100,
      } as ModuleProgress;
    },
    enabled: !!moduleId && !!user?.id && !!tenant?.id,
  });
}

/**
 * Mark a lesson as complete
 */
export function useMarkLessonComplete() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lessonId: string) => {
      if (!tenant?.id || !user?.id) {
        throw new Error("Not authenticated");
      }

      const supabase = createClient();

      // Check if already completed
      const { data: existing } = await (supabase as any)
        .from("lesson_progress")
        .select("id")
        .eq("lesson_id", lessonId)
        .eq("student_id", user.id)
        .single();

      if (existing) {
        return existing; // Already completed
      }

      // Create progress entry
      const { data, error } = await (supabase as any)
        .from("lesson_progress")
        .insert({
          tenant_id: tenant.id,
          lesson_id: lessonId,
          student_id: user.id,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-progress"] });
      queryClient.invalidateQueries({ queryKey: ["module-progress"] });
      queryClient.invalidateQueries({ queryKey: ["all-courses-progress"] });
      queryClient.invalidateQueries({ queryKey: ["lesson-progress"] });
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    },
  });
}

/**
 * Mark a lesson as incomplete (undo completion)
 */
export function useMarkLessonIncomplete() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lessonId: string) => {
      if (!user?.id) {
        throw new Error("Not authenticated");
      }

      const supabase = createClient();

      const { error } = await (supabase as any)
        .from("lesson_progress")
        .delete()
        .eq("lesson_id", lessonId)
        .eq("student_id", user.id);

      if (error) throw error;
      return { lessonId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-progress"] });
      queryClient.invalidateQueries({ queryKey: ["module-progress"] });
      queryClient.invalidateQueries({ queryKey: ["all-courses-progress"] });
      queryClient.invalidateQueries({ queryKey: ["lesson-progress"] });
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    },
  });
}

/**
 * Get lesson progress for current user
 */
export function useLessonProgress(lessonId: string | null | undefined) {
  const { tenant } = useTenant();
  const { user } = useUser();

  return useQuery({
    queryKey: ["lesson-progress", lessonId, user?.id],
    queryFn: async () => {
      if (!lessonId || !user?.id) return null;

      const supabase = createClient();

      const { data, error } = await (supabase as any)
        .from("lesson_progress")
        .select("*")
        .eq("lesson_id", lessonId)
        .eq("student_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!lessonId && !!user?.id && !!tenant?.id,
  });
}

/**
 * Check if a lesson is completed
 */
export function useIsLessonCompleted(lessonId: string | null | undefined) {
  const { data: progress, isLoading } = useLessonProgress(lessonId);
  return {
    isCompleted: !!progress?.completed_at,
    isLoading,
  };
}
