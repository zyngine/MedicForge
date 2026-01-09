"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SkillCategory, Skill, SkillAttempt, User } from "@/types";

export interface SkillWithCategory extends Skill {
  category?: SkillCategory;
}

export interface SkillAttemptWithDetails extends SkillAttempt {
  skill?: Skill;
  student?: Pick<User, "id" | "full_name" | "email">;
  evaluator?: Pick<User, "id" | "full_name" | "email">;
}

interface SkillCategoryWithSkills extends SkillCategory {
  skills?: Skill[];
  skills_count?: number;
}

type AttemptStatus = "passed" | "failed" | "needs_practice";

interface SkillAttemptForm {
  skillId: string;
  courseId: string;
  studentId: string;
  status: AttemptStatus;
  stepResults?: Record<string, boolean>;
  notes?: string;
  feedback?: string;
}

type SkillCourseType = "EMR" | "EMT" | "AEMT" | "Paramedic";

// Hook for skill categories
export function useSkillCategories(courseType?: SkillCourseType) {
  const [categories, setCategories] = useState<SkillCategoryWithSkills[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

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

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const transformedCategories: SkillCategoryWithSkills[] = (data || []).map((cat: any) => ({
        ...cat,
        skills_count: cat.skills?.[0]?.count || 0,
      }));

      setCategories(transformedCategories);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch skill categories"));
    } finally {
      setIsLoading(false);
    }
  }, [supabase, courseType]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (categoryData: {
    name: string;
    courseType: SkillCourseType;
    description?: string;
    requiredCount?: number;
  }): Promise<SkillCategory | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      const { data, error: createError } = await supabase
        .from("skill_categories")
        .insert([{
          tenant_id: userData.tenant_id,
          name: categoryData.name,
          course_type: categoryData.courseType,
          description: categoryData.description || null,
          required_count: categoryData.requiredCount || 1,
          is_active: true,
        }])
        .select()
        .single();

      if (createError) throw createError;

      await fetchCategories();
      return data as SkillCategory;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create category";
      setError(new Error(message));
      throw err;
    }
  };

  return {
    categories,
    isLoading,
    error,
    refetch: fetchCategories,
    createCategory,
  };
}

// Hook for skills in a category
export function useSkills(categoryId: string | null) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchSkills = useCallback(async () => {
    if (!categoryId) {
      setSkills([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("skills")
        .select("*")
        .eq("category_id", categoryId)
        .order("name", { ascending: true });

      if (fetchError) throw fetchError;

      setSkills(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch skills"));
    } finally {
      setIsLoading(false);
    }
  }, [supabase, categoryId]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const createSkill = async (skillData: {
    name: string;
    description?: string;
    steps?: { step: string; required: boolean }[];
    passingCriteria?: string;
  }): Promise<Skill | null> => {
    if (!categoryId) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      const { data, error: createError } = await supabase
        .from("skills")
        .insert([{
          tenant_id: userData.tenant_id,
          category_id: categoryId,
          name: skillData.name,
          description: skillData.description || null,
          steps: skillData.steps || null,
          passing_criteria: skillData.passingCriteria || null,
        }])
        .select()
        .single();

      if (createError) throw createError;

      await fetchSkills();
      return data as Skill;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create skill";
      setError(new Error(message));
      throw err;
    }
  };

  return {
    skills,
    isLoading,
    error,
    refetch: fetchSkills,
    createSkill,
  };
}

// Hook for skill attempts (student progress)
export function useSkillAttempts(options: {
  studentId?: string;
  courseId?: string;
  skillId?: string;
} = {}) {
  const [attempts, setAttempts] = useState<SkillAttemptWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchAttempts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

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

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const transformedAttempts: SkillAttemptWithDetails[] = (data || []).map((attempt: any) => ({
        ...attempt,
        skill: attempt.skill || undefined,
        student: attempt.student || undefined,
        evaluator: attempt.evaluator || undefined,
      }));

      setAttempts(transformedAttempts);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch skill attempts"));
    } finally {
      setIsLoading(false);
    }
  }, [supabase, options.studentId, options.courseId, options.skillId]);

  useEffect(() => {
    fetchAttempts();
  }, [fetchAttempts]);

  const recordAttempt = async (attemptData: SkillAttemptForm): Promise<SkillAttempt | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      // Get current attempt number
      const { data: existingAttempts } = await supabase
        .from("skill_attempts")
        .select("attempt_number")
        .eq("skill_id", attemptData.skillId)
        .eq("student_id", attemptData.studentId)
        .eq("course_id", attemptData.courseId)
        .order("attempt_number", { ascending: false });

      const maxAttempt = existingAttempts?.[0]?.attempt_number || 0;

      const { data, error: createError } = await supabase
        .from("skill_attempts")
        .insert([{
          tenant_id: userData.tenant_id,
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
        }])
        .select()
        .single();

      if (createError) throw createError;

      await fetchAttempts();
      return data as SkillAttempt;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to record skill attempt";
      setError(new Error(message));
      throw err;
    }
  };

  return {
    attempts,
    isLoading,
    error,
    refetch: fetchAttempts,
    recordAttempt,
  };
}

// Hook for getting a student's skill completion status
export function useStudentSkillProgress(studentId: string | null, courseId: string | null) {
  const [progress, setProgress] = useState<{
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
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchProgress = useCallback(async () => {
    if (!studentId || !courseId) {
      setProgress(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

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
        .eq("course_type", course.course_type as "EMR" | "EMT" | "AEMT" | "Paramedic")
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
      (attempts || []).forEach((attempt: any) => {
        const existing = attemptsMap.get(attempt.skill_id) || [];
        existing.push(attempt);
        attemptsMap.set(attempt.skill_id, existing);
      });

      let totalRequired = 0;
      let totalPassed = 0;

      const categoriesProgress = (categories || []).map((cat: any) => {
        const skills = cat.skills || [];
        const requiredCount = cat.required_count || 1;
        totalRequired += requiredCount;

        const skillsProgress = skills.map((skill: any) => {
          const skillAttempts = attemptsMap.get(skill.id) || [];
          const passedAttempt = skillAttempts.find((a: any) => a.status === "passed");
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

      setProgress({
        categories: categoriesProgress,
        totalRequired,
        totalPassed,
        overallProgress,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch skill progress"));
    } finally {
      setIsLoading(false);
    }
  }, [studentId, courseId, supabase]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return { progress, isLoading, error, refetch: fetchProgress };
}

// Hook for current user's skill attempts
export function useMySkillAttempts(courseId: string | null) {
  const [studentId, setStudentId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setStudentId(data.user.id);
      }
    };
    getUser();
  }, [supabase]);

  return useSkillAttempts({
    studentId: studentId || undefined,
    courseId: courseId || undefined,
  });
}
