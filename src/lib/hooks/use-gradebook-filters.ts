"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export interface GradebookFilter {
  id: string;
  tenant_id: string;
  user_id: string;
  course_id: string;
  name: string;
  filters: {
    modules?: string[];
    assignment_types?: string[];
    students?: string[];
    grade_range?: { min: number; max: number };
    status?: string[];
    date_range?: { start: string; end: string };
    show_late_only?: boolean;
    show_missing_only?: boolean;
  };
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Hook for managing gradebook filters
export function useGradebookFilters(courseId: string) {
  const [filters, setFilters] = useState<GradebookFilter[]>([]);
  const [activeFilter, setActiveFilter] = useState<GradebookFilter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchFilters = useCallback(async () => {
    if (!profile?.id || !courseId) return;

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("gradebook_filters")
        .select("*")
        .eq("user_id", profile.id)
        .eq("course_id", courseId)
        .order("name");

      if (error) throw error;
      setFilters(data || []);

      // Set default filter as active
      const defaultFilter = data?.find((f: GradebookFilter) => f.is_default);
      if (defaultFilter) {
        setActiveFilter(defaultFilter);
      }
    } catch (err) {
      console.error("Failed to fetch gradebook filters:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, courseId, supabase]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  const saveFilter = async (input: {
    name: string;
    filters: GradebookFilter["filters"];
    is_default?: boolean;
  }): Promise<GradebookFilter | null> => {
    if (!profile?.tenant_id || !profile?.id || !courseId) {
      toast.error("Unable to save filter");
      return null;
    }

    try {
      // If setting as default, unset other defaults first
      if (input.is_default) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("gradebook_filters")
          .update({ is_default: false })
          .eq("user_id", profile.id)
          .eq("course_id", courseId);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("gradebook_filters")
        .insert({
          tenant_id: profile.tenant_id,
          user_id: profile.id,
          course_id: courseId,
          name: input.name,
          filters: input.filters,
          is_default: input.is_default || false,
        })
        .select()
        .single();

      if (error) throw error;
      setFilters((prev) => [...prev, data]);
      toast.success("Filter saved");
      return data;
    } catch (err) {
      console.error("Failed to save filter:", err);
      toast.error("Failed to save filter");
      return null;
    }
  };

  const updateFilter = async (id: string, updates: Partial<GradebookFilter>): Promise<boolean> => {
    try {
      // If setting as default, unset other defaults first
      if (updates.is_default) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("gradebook_filters")
          .update({ is_default: false })
          .eq("user_id", profile?.id)
          .eq("course_id", courseId);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("gradebook_filters")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      setFilters((prev) =>
        prev.map((f) => {
          if (f.id === id) return { ...f, ...updates };
          if (updates.is_default) return { ...f, is_default: false };
          return f;
        })
      );
      toast.success("Filter updated");
      return true;
    } catch (err) {
      toast.error("Failed to update filter");
      return false;
    }
  };

  const deleteFilter = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("gradebook_filters")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setFilters((prev) => prev.filter((f) => f.id !== id));
      if (activeFilter?.id === id) {
        setActiveFilter(null);
      }
      toast.success("Filter deleted");
      return true;
    } catch (err) {
      toast.error("Failed to delete filter");
      return false;
    }
  };

  const applyFilter = (filter: GradebookFilter | null) => {
    setActiveFilter(filter);
  };

  const clearFilter = () => {
    setActiveFilter(null);
  };

  return {
    filters,
    activeFilter,
    isLoading,
    saveFilter,
    updateFilter,
    deleteFilter,
    applyFilter,
    clearFilter,
    refetch: fetchFilters,
  };
}

// Hook for filtered gradebook data
export function useFilteredGradebook(
  courseId: string,
  filterConfig?: GradebookFilter["filters"]
) {
  const [data, setData] = useState<{
    students: Array<{
      id: string;
      name: string;
      email: string;
      assignments: Array<{
        assignment_id: string;
        assignment_title: string;
        score: number | null;
        status: string;
        is_late: boolean;
        late_penalty: number;
        submitted_at: string | null;
      }>;
      average: number | null;
    }>;
    assignments: Array<{
      id: string;
      title: string;
      type: string;
      module_id: string;
      module_title: string;
      due_date: string | null;
      points_possible: number;
    }>;
  }>({ students: [], assignments: [] });
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  useEffect(() => {
    const fetchGradebookData = async () => {
      if (!profile?.tenant_id || !courseId) return;

      try {
        setIsLoading(true);

        // Fetch assignments
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let assignmentQuery = (supabase as any)
          .from("assignments")
          .select(`
            id,
            title,
            type,
            module_id,
            due_date,
            points_possible,
            module:modules!inner(id, title, course_id)
          `)
          .eq("module.course_id", courseId)
          .eq("is_published", true)
          .order("due_date");

        // Apply module filter
        if (filterConfig?.modules?.length) {
          assignmentQuery = assignmentQuery.in("module_id", filterConfig.modules);
        }

        // Apply assignment type filter
        if (filterConfig?.assignment_types?.length) {
          assignmentQuery = assignmentQuery.in("type", filterConfig.assignment_types);
        }

        const { data: assignmentsData, error: assignError } = await assignmentQuery;
        if (assignError) throw assignError;

        const assignments = (assignmentsData || []).map((a: { id: string; title: string; type: string; module_id: string; module: { title: string }; due_date: string | null; points_possible: number }) => ({
          id: a.id,
          title: a.title,
          type: a.type,
          module_id: a.module_id,
          module_title: a.module?.title || "",
          due_date: a.due_date,
          points_possible: a.points_possible,
        }));

        // Fetch enrolled students
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let studentQuery = (supabase as any)
          .from("enrollments")
          .select(`
            student_id,
            student:users!enrollments_student_id_fkey(id, full_name, email)
          `)
          .eq("course_id", courseId)
          .eq("status", "active");

        // Apply student filter
        if (filterConfig?.students?.length) {
          studentQuery = studentQuery.in("student_id", filterConfig.students);
        }

        const { data: enrollmentsData, error: enrollError } = await studentQuery;
        if (enrollError) throw enrollError;

        // Fetch submissions for each student
        const students = await Promise.all(
          (enrollmentsData || []).map(async (enrollment: { student_id: string; student: { id: string; full_name: string; email: string } }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let submissionQuery = (supabase as any)
              .from("submissions")
              .select("*")
              .eq("student_id", enrollment.student_id)
              .in(
                "assignment_id",
                assignments.map((a: { id: string }) => a.id)
              );

            // Apply status filter
            if (filterConfig?.status?.length) {
              submissionQuery = submissionQuery.in("status", filterConfig.status);
            }

            const { data: submissionsData } = await submissionQuery;

            const studentAssignments = assignments.map((assignment: { id: string; title: string }) => {
              const submission = submissionsData?.find(
                (s: { assignment_id: string }) => s.assignment_id === assignment.id
              );

              const assignmentData = {
                assignment_id: assignment.id,
                assignment_title: assignment.title,
                score: submission?.final_score || null,
                status: submission?.status || "not_submitted",
                is_late: submission?.is_late || false,
                late_penalty: submission?.late_penalty || 0,
                submitted_at: submission?.submitted_at || null,
              };

              return assignmentData;
            });

            // Apply additional filters
            let filteredAssignments = studentAssignments;

            if (filterConfig?.show_late_only) {
              filteredAssignments = filteredAssignments.filter((a: { is_late: boolean }) => a.is_late);
            }

            if (filterConfig?.show_missing_only) {
              filteredAssignments = filteredAssignments.filter(
                (a: { status: string }) => a.status === "not_submitted"
              );
            }

            if (filterConfig?.grade_range) {
              filteredAssignments = filteredAssignments.filter((a: { score: number | null }) => {
                if (a.score === null) return true;
                return (
                  a.score >= filterConfig.grade_range!.min &&
                  a.score <= filterConfig.grade_range!.max
                );
              });
            }

            const gradedAssignments = filteredAssignments.filter(
              (a: { score: number | null }) => a.score !== null
            );
            const average =
              gradedAssignments.length > 0
                ? gradedAssignments.reduce((sum: number, a: { score: number }) => sum + a.score, 0) /
                  gradedAssignments.length
                : null;

            return {
              id: enrollment.student_id,
              name: enrollment.student?.full_name || "Unknown",
              email: enrollment.student?.email || "",
              assignments: filteredAssignments,
              average,
            };
          })
        );

        // Sort by average grade if filtering by grade range
        const sortedStudents = filterConfig?.grade_range
          ? students.sort((a, b) => (b.average || 0) - (a.average || 0))
          : students.sort((a, b) => a.name.localeCompare(b.name));

        setData({ students: sortedStudents, assignments });
      } catch (err) {
        console.error("Failed to fetch gradebook data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGradebookData();
  }, [profile?.tenant_id, courseId, filterConfig, supabase]);

  return { ...data, isLoading };
}

// Predefined filter options
export const GRADEBOOK_FILTER_PRESETS = [
  {
    name: "Late Submissions",
    filters: { show_late_only: true },
  },
  {
    name: "Missing Work",
    filters: { show_missing_only: true },
  },
  {
    name: "At Risk (Below 70)",
    filters: { grade_range: { min: 0, max: 69 } },
  },
  {
    name: "Quizzes Only",
    filters: { assignment_types: ["quiz"] },
  },
  {
    name: "Written Assignments",
    filters: { assignment_types: ["written"] },
  },
];
