"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import { useUser } from "./use-user";
import type { Database } from "@/types/database.types";

type SkillCategory = Database["public"]["Tables"]["skill_categories"]["Row"];
type Skill = Database["public"]["Tables"]["skills"]["Row"];
type SkillAttempt = Database["public"]["Tables"]["skill_attempts"]["Row"];

export interface SkillWithCategory extends Skill {
  category?: SkillCategory;
}

export interface SkillAttemptWithDetails extends SkillAttempt {
  skill?: Skill;
  student?: {
    id: string;
    full_name: string;
    email: string;
  };
  evaluator?: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface SkillCategoryWithSkills extends SkillCategory {
  skills?: Skill[];
  skills_count?: number;
  skill_count?: number; // Alias for backward compatibility
}

type AttemptStatus = "passed" | "failed" | "needs_practice";
type SkillCourseType = "EMR" | "EMT" | "AEMT" | "Paramedic";

interface SkillAttemptForm {
  skillId: string;
  courseId: string;
  studentId: string;
  status: AttemptStatus;
  stepResults?: Record<string, boolean>;
  notes?: string;
  feedback?: string;
}

export interface SkillProgress {
  categories: {
    categoryId: string;
    categoryName: string;
    requiredCount: number;
    passedCount: number;
    isComplete: boolean;
    skills: {
      skillId: string;
      skillName: string;
      attempts: number;
      passed: boolean;
      lastAttemptDate?: string;
    }[];
  }[];
  totalRequired: number;
  totalPassed: number;
  overallProgress: number;
}

/**
 * Get skill categories with optional course type filter
 */
export function useSkillCategories(courseType?: SkillCourseType) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["skill-categories", tenant?.id, courseType],
    queryFn: async () => {
      const supabase = createClient();

      let query = supabase
        .from("skill_categories")
        .select(`
          *,
          skills:skills(count)
        `)
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (courseType) {
        query = query.eq("course_type", courseType);
      }

      const { data, error } = await query;

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((cat: any) => {
        const count = cat.skills?.[0]?.count || 0;
        return {
          ...cat,
          skills_count: count,
          skill_count: count,
        };
      }) as SkillCategoryWithSkills[];
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Get a single skill category with its skills
 */
export function useSkillCategory(categoryId: string | null | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["skill-category", categoryId],
    queryFn: async () => {
      if (!categoryId) return null;

      const supabase = createClient();
      const { data, error } = await supabase
        .from("skill_categories")
        .select(`
          *,
          skills:skills(*)
        `)
        .eq("id", categoryId)
        .single();

      if (error) throw error;

      const count = data.skills?.length || 0;
      return {
        ...data,
        skills_count: count,
        skill_count: count,
      } as SkillCategoryWithSkills;
    },
    enabled: !!categoryId && !!tenant?.id,
  });
}

/**
 * Create a skill category
 */
export function useCreateSkillCategory() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      courseType: SkillCourseType;
      description?: string;
      requiredCount?: number;
    }) => {
      if (!tenant?.id) {
        throw new Error("No tenant");
      }

      const supabase = createClient();

      const { data: category, error } = await supabase
        .from("skill_categories")
        .insert({
          tenant_id: tenant.id,
          name: data.name,
          course_type: data.courseType,
          description: data.description || null,
          required_count: data.requiredCount || 1,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-categories"] });
    },
  });
}

/**
 * Update a skill category
 */
export function useUpdateSkillCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryId,
      data,
    }: {
      categoryId: string;
      data: {
        name?: string;
        description?: string;
        requiredCount?: number;
        isActive?: boolean;
      };
    }) => {
      const supabase = createClient();

      const updateData: Record<string, any> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.requiredCount !== undefined) updateData.required_count = data.requiredCount;
      if (data.isActive !== undefined) updateData.is_active = data.isActive;

      const { data: category, error } = await supabase
        .from("skill_categories")
        .update(updateData)
        .eq("id", categoryId)
        .select()
        .single();

      if (error) throw error;
      return category;
    },
    onSuccess: (category) => {
      queryClient.invalidateQueries({ queryKey: ["skill-categories"] });
      queryClient.invalidateQueries({ queryKey: ["skill-category", category.id] });
    },
  });
}

/**
 * Get skills for a category
 */
export function useSkills(categoryId: string | null | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["skills", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];

      const supabase = createClient();
      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .eq("category_id", categoryId)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Skill[];
    },
    enabled: !!categoryId && !!tenant?.id,
  });
}

/**
 * Get a single skill
 */
export function useSkill(skillId: string | null | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["skill", skillId],
    queryFn: async () => {
      if (!skillId) return null;

      const supabase = createClient();
      const { data, error } = await supabase
        .from("skills")
        .select(`
          *,
          category:skill_categories(*)
        `)
        .eq("id", skillId)
        .single();

      if (error) throw error;
      return data as SkillWithCategory;
    },
    enabled: !!skillId && !!tenant?.id,
  });
}

/**
 * Create a skill
 */
export function useCreateSkill() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryId,
      data,
    }: {
      categoryId: string;
      data: {
        name: string;
        description?: string;
        steps?: { step: string; required: boolean }[];
        passingCriteria?: string;
      };
    }) => {
      if (!tenant?.id) {
        throw new Error("No tenant");
      }

      const supabase = createClient();

      const { data: skill, error } = await supabase
        .from("skills")
        .insert({
          tenant_id: tenant.id,
          category_id: categoryId,
          name: data.name,
          description: data.description || null,
          steps: data.steps || null,
          passing_criteria: data.passingCriteria || null,
        })
        .select()
        .single();

      if (error) throw error;
      return skill;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["skills", variables.categoryId] });
      queryClient.invalidateQueries({ queryKey: ["skill-categories"] });
    },
  });
}

/**
 * Update a skill
 */
export function useUpdateSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      skillId,
      data,
    }: {
      skillId: string;
      data: {
        name?: string;
        description?: string;
        steps?: { step: string; required: boolean }[];
        passingCriteria?: string;
      };
    }) => {
      const supabase = createClient();

      const updateData: Record<string, any> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.steps !== undefined) updateData.steps = data.steps;
      if (data.passingCriteria !== undefined) updateData.passing_criteria = data.passingCriteria;

      const { data: skill, error } = await supabase
        .from("skills")
        .update(updateData)
        .eq("id", skillId)
        .select()
        .single();

      if (error) throw error;
      return skill;
    },
    onSuccess: (skill) => {
      queryClient.invalidateQueries({ queryKey: ["skills", skill.category_id] });
      queryClient.invalidateQueries({ queryKey: ["skill", skill.id] });
    },
  });
}

/**
 * Delete a skill
 */
export function useDeleteSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (skillId: string) => {
      const supabase = createClient();

      // Get category_id before deleting
      const { data: skill } = await supabase
        .from("skills")
        .select("category_id")
        .eq("id", skillId)
        .single();

      const { error } = await supabase
        .from("skills")
        .delete()
        .eq("id", skillId);

      if (error) throw error;
      return { skillId, categoryId: skill?.category_id };
    },
    onSuccess: (result) => {
      if (result.categoryId) {
        queryClient.invalidateQueries({ queryKey: ["skills", result.categoryId] });
      }
      queryClient.invalidateQueries({ queryKey: ["skill-categories"] });
    },
  });
}

/**
 * Get skill attempts with optional filters
 */
export function useSkillAttempts(options: {
  studentId?: string;
  courseId?: string;
  skillId?: string;
} = {}) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["skill-attempts", tenant?.id, options],
    queryFn: async () => {
      const supabase = createClient();

      let query = supabase
        .from("skill_attempts")
        .select(`
          *,
          skill:skills(*),
          student:users!skill_attempts_student_id_fkey(id, full_name, email),
          evaluator:users!skill_attempts_evaluator_id_fkey(id, full_name, email)
        `)
        .order("evaluated_at", { ascending: false });

      if (options.studentId) {
        query = query.eq("student_id", options.studentId);
      }

      if (options.courseId) {
        query = query.eq("course_id", options.courseId);
      }

      if (options.skillId) {
        query = query.eq("skill_id", options.skillId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data || []).map((attempt: any) => ({
        ...attempt,
        skill: attempt.skill || undefined,
        student: attempt.student || undefined,
        evaluator: attempt.evaluator || undefined,
      })) as SkillAttemptWithDetails[];
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Record a skill attempt
 */
export function useRecordSkillAttempt() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attemptData: SkillAttemptForm) => {
      if (!tenant?.id || !user?.id) {
        throw new Error("Not authenticated");
      }

      const supabase = createClient();

      // Get current attempt number
      const { data: existingAttempts } = await supabase
        .from("skill_attempts")
        .select("attempt_number")
        .eq("skill_id", attemptData.skillId)
        .eq("student_id", attemptData.studentId)
        .eq("course_id", attemptData.courseId)
        .order("attempt_number", { ascending: false });

      const maxAttempt = existingAttempts?.[0]?.attempt_number || 0;

      const { data, error } = await supabase
        .from("skill_attempts")
        .insert({
          tenant_id: tenant.id,
          skill_id: attemptData.skillId,
          student_id: attemptData.studentId,
          course_id: attemptData.courseId,
          evaluator_id: user.id,
          attempt_number: maxAttempt + 1,
          status: attemptData.status,
          step_results: attemptData.stepResults || null,
          notes: attemptData.notes || null,
          feedback: attemptData.feedback || null,
          evaluated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as SkillAttempt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-attempts"] });
      queryClient.invalidateQueries({ queryKey: ["student-skill-progress"] });
    },
  });
}

/**
 * Get student's skill progress for a course
 */
export function useStudentSkillProgress(studentId: string | null | undefined, courseId: string | null | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["student-skill-progress", studentId, courseId],
    queryFn: async (): Promise<SkillProgress | null> => {
      if (!studentId || !courseId) return null;

      const supabase = createClient();

      // Get course type
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("course_type")
        .eq("id", courseId)
        .single();

      if (courseError) throw courseError;
      if (!course.course_type) throw new Error("Course type not set");

      // Get skill categories for this course type
      const { data: categories, error: catError } = await supabase
        .from("skill_categories")
        .select(`
          *,
          skills:skills(*)
        `)
        .eq("course_type", course.course_type)
        .eq("is_active", true);

      if (catError) throw catError;

      // Get all attempts for this student in this course
      const { data: attempts, error: attError } = await supabase
        .from("skill_attempts")
        .select("*")
        .eq("student_id", studentId)
        .eq("course_id", courseId);

      if (attError) throw attError;

      // Build progress data
      const attemptsMap = new Map<string, any[]>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (attempts || []).forEach((attempt: any) => {
        const existing = attemptsMap.get(attempt.skill_id) || [];
        existing.push(attempt);
        attemptsMap.set(attempt.skill_id, existing);
      });

      let totalRequired = 0;
      let totalPassed = 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const categoriesProgress = (categories || []).map((cat: any) => {
        const skills = cat.skills || [];
        const requiredCount = cat.required_count || 1;
        totalRequired += requiredCount;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const skillsProgress = skills.map((skill: any) => {
          const skillAttempts = attemptsMap.get(skill.id) || [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const passedAttempt = skillAttempts.find((a: any) => a.status === "passed");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const latestAttempt = skillAttempts.sort((a: any, b: any) =>
            new Date(b.evaluated_at).getTime() - new Date(a.evaluated_at).getTime()
          )[0];

          return {
            skillId: skill.id,
            skillName: skill.name,
            attempts: skillAttempts.length,
            passed: !!passedAttempt,
            lastAttemptDate: latestAttempt?.evaluated_at,
          };
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const passedCount = skillsProgress.filter((s: any) => s.passed).length;
        const isComplete = passedCount >= requiredCount;

        if (isComplete) {
          totalPassed += requiredCount;
        } else {
          totalPassed += passedCount;
        }

        return {
          categoryId: cat.id,
          categoryName: cat.name,
          requiredCount,
          passedCount,
          isComplete,
          skills: skillsProgress,
        };
      });

      const overallProgress = totalRequired > 0
        ? Math.round((totalPassed / totalRequired) * 100)
        : 0;

      return {
        categories: categoriesProgress,
        totalRequired,
        totalPassed,
        overallProgress,
      };
    },
    enabled: !!studentId && !!courseId && !!tenant?.id,
  });
}

/**
 * Get current user's skill attempts for a course
 */
export function useMySkillAttempts(courseId: string | null | undefined) {
  const { user } = useUser();

  return useSkillAttempts({
    studentId: user?.id,
    courseId: courseId || undefined,
  });
}

/**
 * Get current user's skill progress for a course
 */
export function useMySkillProgress(courseId: string | null | undefined) {
  const { user } = useUser();

  return useStudentSkillProgress(user?.id, courseId);
}
