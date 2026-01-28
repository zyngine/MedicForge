"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";

export interface AgencyEmployee {
  id: string;
  tenant_id: string;
  user_id: string | null;
  employee_number: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  certification_level: "EMR" | "EMT" | "AEMT" | "Paramedic" | "Other";
  state_certification_number: string | null;
  national_registry_number: string | null;
  certification_expiration: string | null;
  hire_date: string | null;
  department: string | null;
  position: string | null;
  supervisor_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed
  full_name?: string;
  supervisor?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  competency_completion?: number;
}

export interface CreateEmployeeInput {
  employee_number?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  certification_level: "EMR" | "EMT" | "AEMT" | "Paramedic" | "Other";
  state_certification_number?: string;
  national_registry_number?: string;
  certification_expiration?: string;
  hire_date?: string;
  department?: string;
  position?: string;
  supervisor_id?: string;
  user_id?: string;
}

/**
 * Get all agency employees
 */
export function useAgencyEmployees(options?: {
  isActive?: boolean;
  certificationLevel?: string;
  departmentFilter?: string;
  supervisorId?: string;
}) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["agency-employees", tenant?.id, options],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = createClient();
      let query = (supabase as any)
        .from("agency_employees")
        .select(`
          *,
          supervisor:agency_employees!agency_employees_supervisor_id_fkey(id, first_name, last_name)
        `)
        .eq("tenant_id", tenant.id)
        .order("last_name", { ascending: true });

      if (options?.isActive !== undefined) {
        query = query.eq("is_active", options.isActive);
      }
      if (options?.certificationLevel) {
        query = query.eq("certification_level", options.certificationLevel);
      }
      if (options?.departmentFilter) {
        query = query.eq("department", options.departmentFilter);
      }
      if (options?.supervisorId) {
        query = query.eq("supervisor_id", options.supervisorId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((emp: any) => ({
        ...emp,
        full_name: `${emp.first_name} ${emp.last_name}`,
      })) as AgencyEmployee[];
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Get a single employee by ID
 */
export function useAgencyEmployee(employeeId: string | null | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["agency-employee", employeeId],
    queryFn: async () => {
      if (!employeeId || !tenant?.id) return null;

      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("agency_employees")
        .select(`
          *,
          supervisor:agency_employees!agency_employees_supervisor_id_fkey(id, first_name, last_name)
        `)
        .eq("id", employeeId)
        .eq("tenant_id", tenant.id)
        .single();

      if (error) throw error;

      return {
        ...data,
        full_name: `${data.first_name} ${data.last_name}`,
      } as AgencyEmployee;
    },
    enabled: !!employeeId && !!tenant?.id,
  });
}

/**
 * Create a new employee
 */
export function useCreateAgencyEmployee() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEmployeeInput) => {
      if (!tenant?.id) throw new Error("No tenant");

      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("agency_employees")
        .insert({
          ...input,
          tenant_id: tenant.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AgencyEmployee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-employees"] });
    },
  });
}

/**
 * Update an employee
 */
export function useUpdateAgencyEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      updates,
    }: {
      employeeId: string;
      updates: Partial<CreateEmployeeInput> & { is_active?: boolean };
    }) => {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("agency_employees")
        .update(updates)
        .eq("id", employeeId)
        .select()
        .single();

      if (error) throw error;
      return data as AgencyEmployee;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["agency-employee", data.id] });
      queryClient.invalidateQueries({ queryKey: ["agency-employees"] });
    },
  });
}

/**
 * Deactivate an employee (soft delete)
 */
export function useDeactivateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("agency_employees")
        .update({ is_active: false })
        .eq("id", employeeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-employees"] });
    },
  });
}

/**
 * Reactivate an employee
 */
export function useReactivateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("agency_employees")
        .update({ is_active: true })
        .eq("id", employeeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-employees"] });
    },
  });
}

/**
 * Delete an employee permanently
 */
export function useDeleteAgencyEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const supabase = createClient();
      const { error } = await (supabase as any)
        .from("agency_employees")
        .delete()
        .eq("id", employeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-employees"] });
    },
  });
}

/**
 * Import employees from CSV
 */
export function useImportEmployees() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employees: CreateEmployeeInput[]) => {
      if (!tenant?.id) throw new Error("No tenant");

      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("agency_employees")
        .insert(
          employees.map((emp) => ({
            ...emp,
            tenant_id: tenant.id,
            is_active: true,
          }))
        )
        .select();

      if (error) throw error;
      return data as AgencyEmployee[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-employees"] });
    },
  });
}

/**
 * Get employees expiring soon
 */
export function useExpiringCertifications(daysAhead: number = 90) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["expiring-certifications", tenant?.id, daysAhead],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = createClient();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const { data, error } = await (supabase as any)
        .from("agency_employees")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .not("certification_expiration", "is", null)
        .lte("certification_expiration", futureDate.toISOString().split("T")[0])
        .order("certification_expiration", { ascending: true });

      if (error) throw error;

      return (data || []).map((emp: any) => ({
        ...emp,
        full_name: `${emp.first_name} ${emp.last_name}`,
      })) as AgencyEmployee[];
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Get employee statistics
 */
export function useEmployeeStats() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["employee-stats", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;

      const supabase = createClient();

      // Get all employees
      const { data: employees, error } = await (supabase as any)
        .from("agency_employees")
        .select("id, certification_level, is_active, certification_expiration")
        .eq("tenant_id", tenant.id);

      if (error) throw error;

      const activeEmployees = employees?.filter((e: any) => e.is_active) || [];
      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const expiringCerts = activeEmployees.filter((e: any) => {
        if (!e.certification_expiration) return false;
        const expDate = new Date(e.certification_expiration);
        return expDate <= thirtyDays && expDate >= now;
      });

      const expiredCerts = activeEmployees.filter((e: any) => {
        if (!e.certification_expiration) return false;
        return new Date(e.certification_expiration) < now;
      });

      // Count by certification level
      const byCertLevel: Record<string, number> = {};
      activeEmployees.forEach((e: any) => {
        byCertLevel[e.certification_level] = (byCertLevel[e.certification_level] || 0) + 1;
      });

      return {
        total: employees?.length || 0,
        active: activeEmployees.length,
        inactive: (employees?.length || 0) - activeEmployees.length,
        expiringIn30Days: expiringCerts.length,
        expired: expiredCerts.length,
        byCertificationLevel: byCertLevel,
      };
    },
    enabled: !!tenant?.id,
  });
}
