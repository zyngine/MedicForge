"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";

export interface MedicalDirectorAssignment {
  id: string;
  tenant_id: string;
  user_id: string;
  // MD details
  md_name: string;
  md_credentials: string | null;
  md_license_number: string | null;
  md_email: string | null;
  md_phone: string | null;
  // Assignment
  is_primary: boolean;
  is_active: boolean;
  assigned_at: string;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface CompetencyVerification {
  id: string;
  tenant_id: string;
  competency_id: string;
  medical_director_id: string;
  verification_type: "approve" | "reject" | "request_resubmit";
  notes: string | null;
  digital_signature: string | null;
  signature_timestamp: string | null;
  created_at: string;
  // Joined data
  competency?: {
    id: string;
    employee_id: string;
    skill_id: string;
    status: string;
  };
  medical_director?: MedicalDirectorAssignment;
}

export interface CreateMdAssignmentInput {
  user_id: string;
  md_name: string;
  md_credentials?: string;
  md_license_number?: string;
  md_email?: string;
  md_phone?: string;
  is_primary?: boolean;
}

/**
 * Get all medical director assignments for the tenant
 */
export function useMedicalDirectors(options?: {
  isActive?: boolean;
}) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["medical-directors", tenant?.id, options],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = createClient();
      let query = (supabase as any)
        .from("medical_director_assignments")
        .select(`
          *,
          user:users(id, email, full_name, avatar_url)
        `)
        .eq("tenant_id", tenant.id)
        .order("assigned_at", { ascending: false });

      if (options?.isActive !== undefined) {
        query = query.eq("is_active", options.isActive);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as MedicalDirectorAssignment[];
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Get a single medical director assignment
 */
export function useMedicalDirector(assignmentId: string | null | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["medical-director", assignmentId],
    queryFn: async () => {
      if (!assignmentId || !tenant?.id) return null;

      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("medical_director_assignments")
        .select(`
          *,
          user:users(id, email, full_name, avatar_url)
        `)
        .eq("id", assignmentId)
        .eq("tenant_id", tenant.id)
        .single();

      if (error) throw error;
      return data as MedicalDirectorAssignment;
    },
    enabled: !!assignmentId && !!tenant?.id,
  });
}

/**
 * Check if current user is a medical director for this tenant
 */
export function useIsMedicalDirector() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["is-medical-director", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return false;

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Use the database function for proper check
      const { data, error } = await (supabase as any).rpc("is_medical_director", {
        p_tenant_id: tenant.id,
      });

      if (error) throw error;
      return data as boolean;
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Get the current user's medical director assignment (if any)
 */
export function useMyMdAssignment() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["my-md-assignment", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await (supabase as any)
        .from("medical_director_assignments")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data as MedicalDirectorAssignment | null;
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Get all tenants where current user is a medical director
 */
export function useMyMdTenants() {
  return useQuery({
    queryKey: ["my-md-tenants"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await (supabase as any)
        .from("medical_director_assignments")
        .select(`
          *,
          tenant:tenants(id, name, slug, logo_url)
        `)
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) throw error;
      return (data || []) as (MedicalDirectorAssignment & { tenant: { id: string; name: string; slug: string; logo_url: string | null } })[];
    },
  });
}

/**
 * Assign a user as medical director
 */
export function useAssignMedicalDirector() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMdAssignmentInput) => {
      if (!tenant?.id) throw new Error("No tenant");

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await (supabase as any)
        .from("medical_director_assignments")
        .insert({
          ...input,
          tenant_id: tenant.id,
          assigned_by: user?.id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MedicalDirectorAssignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-directors"] });
    },
  });
}

/**
 * Update a medical director assignment
 */
export function useUpdateMdAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      updates,
    }: {
      assignmentId: string;
      updates: Partial<Omit<CreateMdAssignmentInput, "user_id">> & { is_active?: boolean };
    }) => {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("medical_director_assignments")
        .update(updates)
        .eq("id", assignmentId)
        .select()
        .single();

      if (error) throw error;
      return data as MedicalDirectorAssignment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["medical-director", data.id] });
      queryClient.invalidateQueries({ queryKey: ["medical-directors"] });
    },
  });
}

/**
 * Revoke medical director assignment
 */
export function useRevokeMdAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const supabase = createClient();
      const { data, error } = await (supabase as any)
        .from("medical_director_assignments")
        .update({ is_active: false })
        .eq("id", assignmentId)
        .select()
        .single();

      if (error) throw error;
      return data as MedicalDirectorAssignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-directors"] });
      queryClient.invalidateQueries({ queryKey: ["is-medical-director"] });
    },
  });
}

/**
 * Get verifications made by a medical director
 */
export function useMdVerifications(mdAssignmentId: string | null | undefined, options?: {
  limit?: number;
}) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["md-verifications", mdAssignmentId, options],
    queryFn: async () => {
      if (!mdAssignmentId || !tenant?.id) return [];

      const supabase = createClient();
      let query = (supabase as any)
        .from("competency_verifications")
        .select(`
          *,
          competency:employee_competencies(
            id, employee_id, skill_id, status,
            skill:skill_library(name, category),
            employee:agency_employees(first_name, last_name)
          )
        `)
        .eq("tenant_id", tenant.id)
        .eq("medical_director_id", mdAssignmentId)
        .order("created_at", { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as CompetencyVerification[];
    },
    enabled: !!mdAssignmentId && !!tenant?.id,
  });
}

/**
 * Create a competency verification (approve/reject with signature)
 */
export function useCreateVerification() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      competencyId,
      verificationType,
      notes,
      digitalSignature,
    }: {
      competencyId: string;
      verificationType: "approve" | "reject" | "request_resubmit";
      notes?: string;
      digitalSignature?: string;
    }) => {
      if (!tenant?.id) throw new Error("No tenant");

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Get the user's MD assignment
      const { data: mdAssignment, error: mdError } = await (supabase as any)
        .from("medical_director_assignments")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("user_id", user?.id)
        .eq("is_active", true)
        .single();

      if (mdError || !mdAssignment) {
        throw new Error("You are not an active medical director for this agency");
      }

      // Create verification record
      const { data: verification, error: verError } = await (supabase as any)
        .from("competency_verifications")
        .insert({
          tenant_id: tenant.id,
          competency_id: competencyId,
          medical_director_id: mdAssignment.id,
          verification_type: verificationType,
          notes,
          digital_signature: digitalSignature,
          signature_timestamp: digitalSignature ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (verError) throw verError;

      // Update the competency status
      const newStatus = verificationType === "approve" ? "verified" :
                        verificationType === "reject" ? "rejected" : "pending";

      const { error: updateError } = await (supabase as any)
        .from("employee_competencies")
        .update({
          status: newStatus,
          verified_at: verificationType === "approve" ? new Date().toISOString() : null,
          verified_by: user?.id,
        })
        .eq("id", competencyId);

      if (updateError) throw updateError;

      return verification as CompetencyVerification;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["md-verifications"] });
      queryClient.invalidateQueries({ queryKey: ["employee-competency", variables.competencyId] });
      queryClient.invalidateQueries({ queryKey: ["employee-competencies"] });
      queryClient.invalidateQueries({ queryKey: ["pending-verifications"] });
    },
  });
}

/**
 * Get medical director statistics
 */
export function useMdStats(mdAssignmentId: string | null | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["md-stats", mdAssignmentId],
    queryFn: async () => {
      if (!mdAssignmentId || !tenant?.id) return null;

      const supabase = createClient();

      // Get verification counts
      const { data: verifications, error } = await (supabase as any)
        .from("competency_verifications")
        .select("id, verification_type, created_at")
        .eq("tenant_id", tenant.id)
        .eq("medical_director_id", mdAssignmentId);

      if (error) throw error;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const recentVerifications = (verifications || []).filter(
        (v: any) => new Date(v.created_at) >= thirtyDaysAgo
      );

      const lastWeekVerifications = (verifications || []).filter(
        (v: any) => new Date(v.created_at) >= sevenDaysAgo
      );

      const byType = {
        approve: 0,
        reject: 0,
        request_resubmit: 0,
      };

      (verifications || []).forEach((v: any) => {
        byType[v.verification_type as keyof typeof byType]++;
      });

      // Get pending verifications count
      const { count: pendingCount, error: pendingError } = await (supabase as any)
        .from("employee_competencies")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("status", "completed");

      if (pendingError) throw pendingError;

      return {
        totalVerifications: (verifications || []).length,
        last30Days: recentVerifications.length,
        last7Days: lastWeekVerifications.length,
        byType,
        pendingCount: pendingCount || 0,
        approvalRate: (verifications || []).length > 0
          ? Math.round((byType.approve / (verifications || []).length) * 100)
          : 0,
      };
    },
    enabled: !!mdAssignmentId && !!tenant?.id,
  });
}

/**
 * Get pending verifications for medical director review
 */
export function useMdPendingVerifications(options?: {
  skillCategory?: string;
  limit?: number;
}) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["md-pending-verifications", tenant?.id, options],
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
        .eq("status", "completed")
        .order("completed_at", { ascending: true });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      let results = data || [];

      // Filter by skill category if specified
      if (options?.skillCategory) {
        results = results.filter((c: any) => c.skill?.category === options.skillCategory);
      }

      return results;
    },
    enabled: !!tenant?.id,
  });
}
