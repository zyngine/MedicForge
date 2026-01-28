"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";

export type VerificationCycleType = "initial" | "annual" | "remedial";
export type CycleStatus = "draft" | "active" | "completed" | "archived";

export interface VerificationCycle {
  id: string;
  tenant_id: string;
  name: string;
  cycle_type: VerificationCycleType;
  year: number | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  // Computed status based on is_active and is_locked
  status: CycleStatus;
}

export interface CreateCycleInput {
  name: string;
  description?: string;
  cycle_type: VerificationCycleType;
  start_date: string;
  end_date: string;
}

export interface CycleProgress {
  cycleId: string;
  totalEmployees: number;
  totalCompetencies: number;
  pendingCompetencies: number;
  completedCompetencies: number;
  verifiedCompetencies: number;
  rejectedCompetencies: number;
  completionRate: number;
  verificationRate: number;
  employeeProgress: Array<{
    employeeId: string;
    employeeName: string;
    total: number;
    completed: number;
    verified: number;
    completionRate: number;
  }>;
}

// Helper to compute status from is_active and is_locked flags
function computeCycleStatus(cycle: any): CycleStatus {
  if (!cycle.is_active && cycle.is_locked) return "archived";
  if (cycle.is_locked) return "completed";
  if (cycle.is_active) return "active";
  return "draft";
}

/**
 * Get all verification cycles
 */
export function useVerificationCycles(options?: {
  status?: CycleStatus;
  includeArchived?: boolean;
}) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["verification-cycles", tenant?.id, options],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = createClient();
      const query = (supabase as any)
        .from("verification_cycles")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("start_date", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // Map and compute status
      let cycles = (data || []).map((cycle: any) => ({
        ...cycle,
        status: computeCycleStatus(cycle),
      })) as VerificationCycle[];

      // Filter by status if specified
      if (options?.status) {
        cycles = cycles.filter((c) => c.status === options.status);
      }

      // Filter out archived unless requested
      if (!options?.includeArchived) {
        cycles = cycles.filter((c) => c.status !== "archived");
      }

      return cycles;
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Get active verification cycles
 */
export function useActiveCycles() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["active-cycles", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("verification_cycles")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("status", "active")
        .order("end_date", { ascending: true });

      if (error) throw error;

      return (data || []) as VerificationCycle[];
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Get a single verification cycle by ID
 */
export function useVerificationCycle(cycleId: string | null | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["verification-cycle", cycleId],
    queryFn: async () => {
      if (!cycleId || !tenant?.id) return null;

      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("verification_cycles")
        .select("*")
        .eq("id", cycleId)
        .eq("tenant_id", tenant.id)
        .single();

      if (error) throw error;
      return data as VerificationCycle;
    },
    enabled: !!cycleId && !!tenant?.id,
  });
}

/**
 * Get detailed progress for a verification cycle
 */
export function useCycleProgress(cycleId: string | null | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["cycle-progress", cycleId],
    queryFn: async () => {
      if (!cycleId || !tenant?.id) return null;

      const supabase = createClient();

      // Get all competencies for this cycle with employee info
      const { data: competencies, error } = await (supabase as any)
        .from("employee_competencies")
        .select(`
          id, status, employee_id,
          employee:agency_employees(id, first_name, last_name, is_active)
        `)
        .eq("tenant_id", tenant.id)
        .eq("cycle_id", cycleId);

      if (error) throw error;

      // Filter to only active employees
      const activeCompetencies = (competencies || []).filter(
        (c: any) => c.employee?.is_active
      );

      // Count by status
      const statusCounts = {
        pending: 0,
        completed: 0,
        verified: 0,
        rejected: 0,
        expired: 0,
      };

      activeCompetencies.forEach((c: any) => {
        statusCounts[c.status as keyof typeof statusCounts] =
          (statusCounts[c.status as keyof typeof statusCounts] || 0) + 1;
      });

      // Group by employee
      const employeeMap = new Map<string, {
        employeeId: string;
        employeeName: string;
        total: number;
        completed: number;
        verified: number;
      }>();

      activeCompetencies.forEach((c: any) => {
        const empId = c.employee_id;
        const existing = employeeMap.get(empId) || {
          employeeId: empId,
          employeeName: `${c.employee?.first_name} ${c.employee?.last_name}`,
          total: 0,
          completed: 0,
          verified: 0,
        };

        existing.total++;
        if (c.status === "completed" || c.status === "verified") {
          existing.completed++;
        }
        if (c.status === "verified") {
          existing.verified++;
        }

        employeeMap.set(empId, existing);
      });

      const employeeProgress = Array.from(employeeMap.values()).map((emp) => ({
        ...emp,
        completionRate: emp.total > 0 ? Math.round((emp.completed / emp.total) * 100) : 0,
      }));

      const total = activeCompetencies.length;

      return {
        cycleId,
        totalEmployees: employeeMap.size,
        totalCompetencies: total,
        pendingCompetencies: statusCounts.pending,
        completedCompetencies: statusCounts.completed,
        verifiedCompetencies: statusCounts.verified,
        rejectedCompetencies: statusCounts.rejected,
        completionRate: total > 0
          ? Math.round(((statusCounts.completed + statusCounts.verified) / total) * 100)
          : 0,
        verificationRate: total > 0
          ? Math.round((statusCounts.verified / total) * 100)
          : 0,
        employeeProgress: employeeProgress.sort((a, b) => a.employeeName.localeCompare(b.employeeName)),
      } as CycleProgress;
    },
    enabled: !!cycleId && !!tenant?.id,
  });
}

/**
 * Create a new verification cycle
 */
export function useCreateVerificationCycle() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCycleInput) => {
      if (!tenant?.id) throw new Error("No tenant");

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await (supabase as any)
        .from("verification_cycles")
        .insert({
          ...input,
          tenant_id: tenant.id,
          status: "draft",
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as VerificationCycle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification-cycles"] });
    },
  });
}

/**
 * Update a verification cycle
 */
export function useUpdateVerificationCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cycleId,
      updates,
    }: {
      cycleId: string;
      updates: Partial<CreateCycleInput> & { status?: CycleStatus };
    }) => {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("verification_cycles")
        .update(updates)
        .eq("id", cycleId)
        .select()
        .single();

      if (error) throw error;
      return data as VerificationCycle;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["verification-cycle", data.id] });
      queryClient.invalidateQueries({ queryKey: ["verification-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["active-cycles"] });
    },
  });
}

/**
 * Activate a verification cycle (change from draft to active)
 */
export function useActivateCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cycleId: string) => {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("verification_cycles")
        .update({ status: "active" })
        .eq("id", cycleId)
        .eq("status", "draft")
        .select()
        .single();

      if (error) throw error;
      return data as VerificationCycle;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["verification-cycle", data.id] });
      queryClient.invalidateQueries({ queryKey: ["verification-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["active-cycles"] });
    },
  });
}

/**
 * Complete a verification cycle
 */
export function useCompleteCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cycleId: string) => {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("verification_cycles")
        .update({ status: "completed" })
        .eq("id", cycleId)
        .eq("status", "active")
        .select()
        .single();

      if (error) throw error;
      return data as VerificationCycle;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["verification-cycle", data.id] });
      queryClient.invalidateQueries({ queryKey: ["verification-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["active-cycles"] });
    },
  });
}

/**
 * Archive a verification cycle
 */
export function useArchiveCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cycleId: string) => {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("verification_cycles")
        .update({ status: "archived" })
        .eq("id", cycleId)
        .select()
        .single();

      if (error) throw error;
      return data as VerificationCycle;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["verification-cycle", data.id] });
      queryClient.invalidateQueries({ queryKey: ["verification-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["active-cycles"] });
    },
  });
}

/**
 * Delete a verification cycle (only draft cycles)
 */
export function useDeleteVerificationCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cycleId: string) => {
      const supabase = createClient();

      // First delete all associated competencies
      await (supabase as any)
        .from("employee_competencies")
        .delete()
        .eq("cycle_id", cycleId);

      // Then delete the cycle
      const { error } = await (supabase as any)
        .from("verification_cycles")
        .delete()
        .eq("id", cycleId)
        .eq("status", "draft"); // Only allow deleting draft cycles

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification-cycles"] });
    },
  });
}

/**
 * Initialize a cycle with competencies for all active employees
 */
export function useInitializeCycleCompetencies() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cycleId,
      skillIds,
      employeeIds,
    }: {
      cycleId: string;
      skillIds: string[];
      employeeIds?: string[]; // Optional - if not provided, use all active employees
    }) => {
      if (!tenant?.id) throw new Error("No tenant");

      const supabase = createClient();

      // Get employees
      let employees: string[];
      if (employeeIds && employeeIds.length > 0) {
        employees = employeeIds;
      } else {
        // Get all active employees
        const { data: empData, error: empError } = await (supabase as any)
          .from("agency_employees")
          .select("id")
          .eq("tenant_id", tenant.id)
          .eq("is_active", true);

        if (empError) throw empError;
        employees = (empData || []).map((e: any) => e.id);
      }

      // Create competency records for each employee/skill combination
      const competencies = employees.flatMap((employeeId) =>
        skillIds.map((skillId) => ({
          tenant_id: tenant.id,
          employee_id: employeeId,
          skill_id: skillId,
          cycle_id: cycleId,
          status: "pending",
        }))
      );

      if (competencies.length === 0) {
        return { created: 0 };
      }

      const { data, error } = await (supabase as any)
        .from("employee_competencies")
        .insert(competencies)
        .select();

      if (error) throw error;

      return { created: data?.length || 0 };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cycle-progress", variables.cycleId] });
      queryClient.invalidateQueries({ queryKey: ["employee-competencies"] });
      queryClient.invalidateQueries({ queryKey: ["agency-competency-stats"] });
    },
  });
}

/**
 * Get cycles that are ending soon
 */
export function useEndingCycles(daysAhead: number = 30) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["ending-cycles", tenant?.id, daysAhead],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = createClient();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const { data, error } = await (supabase as any)
        .from("verification_cycles")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("status", "active")
        .lte("end_date", futureDate.toISOString().split("T")[0])
        .order("end_date", { ascending: true });

      if (error) throw error;

      return (data || []) as VerificationCycle[];
    },
    enabled: !!tenant?.id,
  });
}
