"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import { useUser } from "./use-user";

// Helper for tables not in generated types
function getDb() {
  return createClient() as any;
}

export interface ScormPackage {
  id: string;
  tenant_id: string;
  course_id: string | null;
  module_id: string | null;
  title: string;
  description: string | null;
  version: "scorm_1.2" | "scorm_2004";
  status: "uploading" | "processing" | "ready" | "error";
  manifest: any;
  entry_point: string | null;
  storage_path: string;
  file_size: number | null;
  launch_mode: string;
  max_attempts: number | null;
  mastery_score: number | null;
  time_limit: number | null;
  uploaded_by: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScormAttempt {
  id: string;
  tenant_id: string;
  package_id: string;
  student_id: string;
  attempt_number: number;
  lesson_status: string | null;
  lesson_location: string | null;
  score_raw: number | null;
  score_min: number | null;
  score_max: number | null;
  score_scaled: number | null;
  session_time: number | null;
  total_time: number | null;
  started_at: string;
  last_accessed_at: string;
  completed_at: string | null;
  cmi_data: Record<string, string> | null;
  interactions: any[] | null;
  objectives: any[] | null;
  created_at: string;
  updated_at: string;
  package?: ScormPackage;
}

/**
 * Get all SCORM packages
 */
export function useScormPackages(options?: {
  courseId?: string;
  moduleId?: string;
  status?: string;
}) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["scorm-packages", options],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const supabase = getDb();
      let query = supabase
        .from("scorm_packages")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (options?.courseId) {
        query = query.eq("course_id", options.courseId);
      }
      if (options?.moduleId) {
        query = query.eq("module_id", options.moduleId);
      }
      if (options?.status) {
        query = query.eq("status", options.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ScormPackage[];
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Get a single SCORM package
 */
export function useScormPackage(packageId: string | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["scorm-package", packageId],
    queryFn: async () => {
      if (!packageId || !tenant?.id) return null;

      const supabase = getDb();
      const { data, error } = await supabase
        .from("scorm_packages")
        .select("*")
        .eq("id", packageId)
        .eq("tenant_id", tenant.id)
        .single();

      if (error) throw error;
      return data as ScormPackage;
    },
    enabled: !!packageId && !!tenant?.id,
  });
}

/**
 * Upload a SCORM package
 */
export function useUploadScormPackage() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      courseId,
      moduleId,
    }: {
      file: File;
      courseId?: string;
      moduleId?: string;
    }) => {
      if (!tenant?.id || !user?.id) {
        throw new Error("Not authenticated");
      }

      const supabase = getDb();

      // Create package record
      const { data: pkg, error: pkgError } = await supabase
        .from("scorm_packages")
        .insert({
          tenant_id: tenant.id,
          course_id: courseId || null,
          module_id: moduleId || null,
          title: file.name.replace(/\.zip$/i, ""),
          version: "scorm_1.2", // Will be detected from manifest
          status: "uploading",
          storage_path: "", // Will be set after upload
          file_size: file.size,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (pkgError) throw pkgError;

      // Upload to storage
      const storagePath = `scorm/${tenant.id}/${pkg.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("scorm-packages")
        .upload(storagePath, file);

      if (uploadError) {
        // Clean up package record on upload failure
        await supabase.from("scorm_packages").delete().eq("id", pkg.id);
        throw uploadError;
      }

      // Update with storage path and set to processing
      const { data: updatedPkg, error: updateError } = await supabase
        .from("scorm_packages")
        .update({
          storage_path: storagePath,
          status: "processing",
        })
        .eq("id", pkg.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return updatedPkg as ScormPackage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scorm-packages"] });
    },
  });
}

/**
 * Update SCORM package after manifest processing
 */
export function useUpdateScormPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      packageId,
      updates,
    }: {
      packageId: string;
      updates: Partial<ScormPackage>;
    }) => {
      const supabase = getDb();

      const { data, error } = await supabase
        .from("scorm_packages")
        .update(updates)
        .eq("id", packageId)
        .select()
        .single();

      if (error) throw error;
      return data as ScormPackage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["scorm-package", data.id] });
      queryClient.invalidateQueries({ queryKey: ["scorm-packages"] });
    },
  });
}

/**
 * Delete SCORM package
 */
export function useDeleteScormPackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (packageId: string) => {
      const supabase = getDb();

      // Get package to find storage path
      const { data: pkg } = await supabase
        .from("scorm_packages")
        .select("storage_path")
        .eq("id", packageId)
        .single();

      // Delete from storage if exists
      if (pkg?.storage_path) {
        await supabase.storage.from("scorm-packages").remove([pkg.storage_path]);
      }

      // Delete package record (cascades to attempts)
      const { error } = await supabase
        .from("scorm_packages")
        .delete()
        .eq("id", packageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scorm-packages"] });
    },
  });
}

/**
 * Get student's SCORM attempts for a package
 */
export function useScormAttempts(packageId: string | undefined) {
  const { tenant } = useTenant();
  const { user } = useUser();

  return useQuery({
    queryKey: ["scorm-attempts", packageId],
    queryFn: async () => {
      if (!packageId || !tenant?.id || !user?.id) return [];

      const supabase = getDb();
      const { data, error } = await supabase
        .from("scorm_attempts")
        .select("*")
        .eq("package_id", packageId)
        .eq("student_id", user.id)
        .order("attempt_number", { ascending: false });

      if (error) throw error;
      return data as ScormAttempt[];
    },
    enabled: !!packageId && !!tenant?.id && !!user?.id,
  });
}

/**
 * Get current/active SCORM attempt
 */
export function useCurrentScormAttempt(packageId: string | undefined) {
  const { tenant } = useTenant();
  const { user } = useUser();

  return useQuery({
    queryKey: ["scorm-attempt-current", packageId],
    queryFn: async () => {
      if (!packageId || !tenant?.id || !user?.id) return null;

      const supabase = getDb();
      const { data, error } = await supabase.rpc("get_or_create_scorm_attempt", {
        p_package_id: packageId,
        p_student_id: user.id,
        p_tenant_id: tenant.id,
      });

      if (error) throw error;
      return data as ScormAttempt;
    },
    enabled: !!packageId && !!tenant?.id && !!user?.id,
  });
}

/**
 * Save SCORM CMI data
 */
export function useSaveScormData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      attemptId,
      cmiData,
    }: {
      attemptId: string;
      cmiData: Record<string, string>;
    }) => {
      const supabase = getDb();

      const { data, error } = await supabase.rpc("save_scorm_data", {
        p_attempt_id: attemptId,
        p_cmi_data: cmiData,
      });

      if (error) throw error;
      return data as ScormAttempt;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["scorm-attempts", data.package_id] });
      queryClient.invalidateQueries({ queryKey: ["scorm-attempt-current", data.package_id] });
    },
  });
}

/**
 * Get all attempts for a package (instructor view)
 */
export function usePackageAttempts(packageId: string | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["scorm-package-attempts", packageId],
    queryFn: async () => {
      if (!packageId || !tenant?.id) return [];

      const supabase = getDb();
      const { data, error } = await supabase
        .from("scorm_attempts")
        .select(`
          *,
          student:users!scorm_attempts_student_id_fkey(id, full_name, email)
        `)
        .eq("package_id", packageId)
        .order("last_accessed_at", { ascending: false });

      if (error) throw error;
      return data as (ScormAttempt & {
        student: { id: string; full_name: string; email: string };
      })[];
    },
    enabled: !!packageId && !!tenant?.id,
  });
}
