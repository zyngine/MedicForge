"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import type { Skill } from "./use-skill-library";
import type { AgencyEmployee } from "./use-agency-employees";

export type CompetencyStatus = "pending" | "completed" | "verified" | "expired" | "rejected";

export interface EmployeeCompetency {
  id: string;
  tenant_id: string;
  employee_id: string;
  skill_id: string;
  cycle_id: string | null;
  status: CompetencyStatus;
  completed_at: string | null;
  completed_by: string | null;
  verified_at: string | null;
  verified_by: string | null;
  expires_at: string | null;
  notes: string | null;
  evidence_url: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  skill?: Skill;
  employee?: AgencyEmployee;
  completed_by_user?: { id: string; first_name: string; last_name: string };
  verified_by_user?: { id: string; first_name: string; last_name: string };
}

export interface CreateCompetencyInput {
  employee_id: string;
  skill_id: string;
  cycle_id?: string;
  status?: CompetencyStatus;
  notes?: string;
  evidence_url?: string;
}

export interface CompleteCompetencyInput {
  competencyId: string;
  notes?: string;
  evidence_url?: string;
}

/**
 * Get all competencies for an employee
 */
export function useEmployeeCompetencies(employeeId: string | null | undefined, options?: {
  status?: CompetencyStatus;
  cycleId?: string;
  skillCategory?: string;
}) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["employee-competencies", employeeId, options],
    queryFn: async () => {
      if (!employeeId || !tenant?.id) return [];

      const supabase = createClient();
      let query = (supabase as any)
        .from("employee_competencies")
        .select(`
          *,
          skill:skill_library(*),
          employee:agency_employees(id, first_name, last_name, certification_level),
          completed_by_user:agency_employees!employee_competencies_completed_by_fkey(id, first_name, last_name),
          verified_by_user:agency_employees!employee_competencies_verified_by_fkey(id, first_name, last_name)
        `)
        .eq("tenant_id", tenant.id)
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });

      if (options?.status) {
        query = query.eq("status", options.status);
      }
      if (options?.cycleId) {
        query = query.eq("cycle_id", options.cycleId);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = (data || []) as EmployeeCompetency[];

      // Filter by skill category if specified (client-side since it's a join)
      if (options?.skillCategory) {
        results = results.filter((c) => c.skill?.category === options.skillCategory);
      }

      return results;
    },
    enabled: !!employeeId && !!tenant?.id,
  });
}

/**
 * Get a single competency by ID
 */
export function useEmployeeCompetency(competencyId: string | null | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["employee-competency", competencyId],
    queryFn: async () => {
      if (!competencyId || !tenant?.id) return null;

      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("employee_competencies")
        .select(`
          *,
          skill:skill_library(*),
          employee:agency_employees(id, first_name, last_name, email, certification_level),
          completed_by_user:agency_employees!employee_competencies_completed_by_fkey(id, first_name, last_name),
          verified_by_user:agency_employees!employee_competencies_verified_by_fkey(id, first_name, last_name)
        `)
        .eq("id", competencyId)
        .eq("tenant_id", tenant.id)
        .single();

      if (error) throw error;
      return data as EmployeeCompetency;
    },
    enabled: !!competencyId && !!tenant?.id,
  });
}

/**
 * Get competencies for a specific skill across all employees
 */
export function useSkillCompetencies(skillId: string | null | undefined, options?: {
  status?: CompetencyStatus;
  cycleId?: string;
}) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["skill-competencies", skillId, options],
    queryFn: async () => {
      if (!skillId || !tenant?.id) return [];

      const supabase = createClient();
      let query = (supabase as any)
        .from("employee_competencies")
        .select(`
          *,
          skill:skill_library(*),
          employee:agency_employees(id, first_name, last_name, email, certification_level, department)
        `)
        .eq("tenant_id", tenant.id)
        .eq("skill_id", skillId)
        .order("created_at", { ascending: false });

      if (options?.status) {
        query = query.eq("status", options.status);
      }
      if (options?.cycleId) {
        query = query.eq("cycle_id", options.cycleId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as EmployeeCompetency[];
    },
    enabled: !!skillId && !!tenant?.id,
  });
}

/**
 * Get all competencies pending verification
 */
export function usePendingVerifications(options?: {
  cycleId?: string;
  employeeId?: string;
}) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["pending-verifications", tenant?.id, options],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = createClient();
      let query = (supabase as any)
        .from("employee_competencies")
        .select(`
          *,
          skill:skill_library(*),
          employee:agency_employees(id, first_name, last_name, email, certification_level, department)
        `)
        .eq("tenant_id", tenant.id)
        .eq("status", "completed") // Completed but not yet verified
        .order("completed_at", { ascending: true });

      if (options?.cycleId) {
        query = query.eq("cycle_id", options.cycleId);
      }
      if (options?.employeeId) {
        query = query.eq("employee_id", options.employeeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as EmployeeCompetency[];
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Get expiring competencies (those expiring within X days)
 */
export function useExpiringCompetencies(daysAhead: number = 30) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["expiring-competencies", tenant?.id, daysAhead],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = createClient();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const { data, error } = await (supabase as any)
        .from("employee_competencies")
        .select(`
          *,
          skill:skill_library(*),
          employee:agency_employees(id, first_name, last_name, email, certification_level)
        `)
        .eq("tenant_id", tenant.id)
        .eq("status", "verified")
        .not("expires_at", "is", null)
        .lte("expires_at", futureDate.toISOString())
        .order("expires_at", { ascending: true });

      if (error) throw error;

      return (data || []) as EmployeeCompetency[];
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Create a new competency record
 */
export function useCreateCompetency() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCompetencyInput) => {
      if (!tenant?.id) throw new Error("No tenant");

      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("employee_competencies")
        .insert({
          ...input,
          tenant_id: tenant.id,
          status: input.status || "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data as EmployeeCompetency;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employee-competencies", data.employee_id] });
      queryClient.invalidateQueries({ queryKey: ["skill-competencies", data.skill_id] });
    },
  });
}

/**
 * Mark a competency as completed (by supervisor/employee)
 */
export function useCompleteCompetency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ competencyId, notes, evidence_url }: CompleteCompetencyInput) => {
      const supabase = createClient();

      // Get current user to set as completer
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await (supabase as any)
        .from("employee_competencies")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          completed_by: user?.id,
          notes,
          evidence_url,
        })
        .eq("id", competencyId)
        .select()
        .single();

      if (error) throw error;
      return data as EmployeeCompetency;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employee-competency", data.id] });
      queryClient.invalidateQueries({ queryKey: ["employee-competencies", data.employee_id] });
      queryClient.invalidateQueries({ queryKey: ["pending-verifications"] });
    },
  });
}

/**
 * Verify a competency (by medical director or authorized supervisor)
 */
export function useVerifyCompetency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      competencyId,
      approved,
      notes,
      expiresAt,
    }: {
      competencyId: string;
      approved: boolean;
      notes?: string;
      expiresAt?: string;
    }) => {
      const supabase = createClient();

      // Get current user to set as verifier
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await (supabase as any)
        .from("employee_competencies")
        .update({
          status: approved ? "verified" : "rejected",
          verified_at: new Date().toISOString(),
          verified_by: user?.id,
          expires_at: expiresAt,
          notes: notes || undefined,
        })
        .eq("id", competencyId)
        .select()
        .single();

      if (error) throw error;
      return data as EmployeeCompetency;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employee-competency", data.id] });
      queryClient.invalidateQueries({ queryKey: ["employee-competencies", data.employee_id] });
      queryClient.invalidateQueries({ queryKey: ["pending-verifications"] });
      queryClient.invalidateQueries({ queryKey: ["expiring-competencies"] });
    },
  });
}

/**
 * Bulk create competencies for an employee (e.g., when starting a new verification cycle)
 */
export function useBulkCreateCompetencies() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      skillIds,
      cycleId,
    }: {
      employeeId: string;
      skillIds: string[];
      cycleId?: string;
    }) => {
      if (!tenant?.id) throw new Error("No tenant");

      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("employee_competencies")
        .insert(
          skillIds.map((skillId) => ({
            tenant_id: tenant.id,
            employee_id: employeeId,
            skill_id: skillId,
            cycle_id: cycleId,
            status: "pending",
          }))
        )
        .select();

      if (error) throw error;
      return data as EmployeeCompetency[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["employee-competencies", variables.employeeId] });
    },
  });
}

/**
 * Get competency statistics for an employee
 */
export function useEmployeeCompetencyStats(employeeId: string | null | undefined, cycleId?: string) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["employee-competency-stats", employeeId, cycleId],
    queryFn: async () => {
      if (!employeeId || !tenant?.id) return null;

      const supabase = createClient();
      let query = (supabase as any)
        .from("employee_competencies")
        .select("id, status, expires_at")
        .eq("tenant_id", tenant.id)
        .eq("employee_id", employeeId);

      if (cycleId) {
        query = query.eq("cycle_id", cycleId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const competencies = data || [];
      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const byStatus: Record<string, number> = {
        pending: 0,
        completed: 0,
        verified: 0,
        expired: 0,
        rejected: 0,
      };

      competencies.forEach((c: any) => {
        byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      });

      const expiringSoon = competencies.filter((c: any) => {
        if (c.status !== "verified" || !c.expires_at) return false;
        const expDate = new Date(c.expires_at);
        return expDate <= thirtyDays && expDate >= now;
      }).length;

      const total = competencies.length;
      const completionRate = total > 0
        ? Math.round(((byStatus.verified + byStatus.completed) / total) * 100)
        : 0;

      return {
        total,
        byStatus,
        expiringSoon,
        completionRate,
      };
    },
    enabled: !!employeeId && !!tenant?.id,
  });
}

/**
 * Get overall competency statistics for the agency
 */
export function useAgencyCompetencyStats(cycleId?: string) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["agency-competency-stats", tenant?.id, cycleId],
    queryFn: async () => {
      if (!tenant?.id) return null;

      const supabase = createClient();
      let query = (supabase as any)
        .from("employee_competencies")
        .select(`
          id, status, expires_at, employee_id,
          employee:agency_employees(is_active)
        `)
        .eq("tenant_id", tenant.id);

      if (cycleId) {
        query = query.eq("cycle_id", cycleId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const competencies = (data || []).filter((c: any) => c.employee?.is_active);
      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const byStatus: Record<string, number> = {
        pending: 0,
        completed: 0,
        verified: 0,
        expired: 0,
        rejected: 0,
      };

      competencies.forEach((c: any) => {
        byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      });

      const expiringSoon = competencies.filter((c: any) => {
        if (c.status !== "verified" || !c.expires_at) return false;
        const expDate = new Date(c.expires_at);
        return expDate <= thirtyDays && expDate >= now;
      }).length;

      // Count unique employees
      const employeeIds = new Set(competencies.map((c: any) => c.employee_id));

      const total = competencies.length;
      const completionRate = total > 0
        ? Math.round(((byStatus.verified + byStatus.completed) / total) * 100)
        : 0;

      return {
        total,
        byStatus,
        expiringSoon,
        completionRate,
        uniqueEmployees: employeeIds.size,
        pendingVerification: byStatus.completed,
      };
    },
    enabled: !!tenant?.id,
  });
}
