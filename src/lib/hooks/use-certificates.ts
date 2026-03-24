"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import { useUser } from "./use-user";

export interface Certificate {
  id: string;
  tenant_id: string;
  student_id: string;
  course_id: string;
  certificate_number: string;
  certificate_type: string;
  title: string;
  issued_at: string;
  expires_at: string | null;
  completion_date: string;
  final_grade: number | null;
  hours_completed: number | null;
  template_id: string | null;
  custom_data: Record<string, unknown>;
  verification_code: string;
  is_revoked: boolean;
  revoked_at: string | null;
  revoked_reason: string | null;
  issued_by: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  student?: {
    id: string;
    full_name: string;
    email: string;
  };
  course?: {
    id: string;
    title: string;
    course_type: string;
  };
  issuer?: {
    id: string;
    full_name: string;
  };
}

export interface CertificateTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  certificate_type: string;
  template_html: string;
  styles: string | null;
  background_image_url: string | null;
  logo_position: string;
  default_title: string | null;
  signature_name: string | null;
  signature_title: string | null;
  signature_image_url: string | null;
  show_grade: boolean;
  show_hours: boolean;
  show_date: boolean;
  show_verification_code: boolean;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IssueCertificateInput {
  student_id: string;
  course_id: string;
  certificate_type?: string;
  title?: string;
  completion_date: string;
  final_grade?: number;
  hours_completed?: number;
  template_id?: string;
  custom_data?: Record<string, unknown>;
  expires_at?: string;
}

// Helper to get supabase client with type assertion for new tables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDb() {
  return createClient() as any;
}

// Fetch certificates with optional filters
export function useCertificates(options?: {
  studentId?: string;
  courseId?: string;
  type?: string;
}) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["certificates", tenant?.id, options],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const db = getDb();
      let query = db
        .from("certificates")
        .select(`
          *,
          student:users!certificates_student_id_fkey(id, full_name, email),
          course:courses(id, title, course_type),
          issuer:users!certificates_issued_by_fkey(id, full_name)
        `)
        .eq("tenant_id", tenant.id)
        .eq("is_revoked", false)
        .order("issued_at", { ascending: false });

      if (options?.studentId) {
        query = query.eq("student_id", options.studentId);
      }
      if (options?.courseId) {
        query = query.eq("course_id", options.courseId);
      }
      if (options?.type) {
        query = query.eq("certificate_type", options.type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Certificate[];
    },
    enabled: !!tenant?.id,
  });
}

// Fetch a single certificate
export function useCertificate(certificateId: string | undefined) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["certificate", certificateId],
    queryFn: async () => {
      if (!certificateId || !tenant?.id) return null;

      const db = getDb();
      const { data, error } = await db
        .from("certificates")
        .select(`
          *,
          student:users!certificates_student_id_fkey(id, full_name, email),
          course:courses(id, title, course_type, course_code),
          issuer:users!certificates_issued_by_fkey(id, full_name),
          template:certificate_templates(*)
        `)
        .eq("id", certificateId)
        .eq("tenant_id", tenant.id)
        .single();

      if (error) throw error;
      return data as Certificate & { template: CertificateTemplate | null };
    },
    enabled: !!certificateId && !!tenant?.id,
  });
}

// Fetch student's own certificates
export function useMyCertificates() {
  const { tenant } = useTenant();
  const { user } = useUser();

  return useQuery({
    queryKey: ["my-certificates", tenant?.id, user?.id],
    queryFn: async () => {
      if (!tenant?.id || !user?.id) return [];

      const db = getDb();
      const { data, error } = await db
        .from("certificates")
        .select(`
          *,
          course:courses(id, title, course_type)
        `)
        .eq("tenant_id", tenant.id)
        .eq("student_id", user.id)
        .eq("is_revoked", false)
        .order("issued_at", { ascending: false });

      if (error) throw error;
      return data as Certificate[];
    },
    enabled: !!tenant?.id && !!user?.id,
  });
}

// Verify a certificate by verification code
export function useVerifyCertificate(verificationCode: string | undefined) {
  return useQuery({
    queryKey: ["verify-certificate", verificationCode],
    queryFn: async () => {
      if (!verificationCode) return null;

      const db = getDb();
      const code = verificationCode.toUpperCase();

      // Try LMS certificates first
      const { data, error } = await db
        .from("certificates")
        .select(`
          *,
          student:users!certificates_student_id_fkey(id, full_name),
          course:courses(id, title, course_type),
          tenant:tenants(id, name, logo_url)
        `)
        .eq("verification_code", code)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      // If found in LMS certificates
      if (data) {
        if (data.is_revoked) {
          return {
            valid: false,
            message: "This certificate has been revoked",
            revokedAt: data.revoked_at,
            reason: data.revoked_reason,
          };
        }

        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          return {
            valid: false,
            message: "This certificate has expired",
            expiredAt: data.expires_at,
          };
        }

        return {
          valid: true,
          certificate: data as Certificate & { tenant: { id: string; name: string; logo_url: string } },
        };
      }

      // Not found in LMS — try CE certificates
      const { data: ceData, error: ceError } = await (db as any)
        .from("ce_certificates")
        .select(`
          *,
          student:ce_users!ce_certificates_user_id_fkey(id, full_name, email),
          course:ce_courses!ce_certificates_course_id_fkey(id, title, ce_hours)
        `)
        .eq("verification_code", code)
        .single();

      if (ceError) {
        if (ceError.code === "PGRST116") {
          return { valid: false, message: "Certificate not found" };
        }
        throw ceError;
      }

      if (ceData.expires_at && new Date(ceData.expires_at) < new Date()) {
        return {
          valid: false,
          message: "This certificate has expired",
          expiredAt: ceData.expires_at,
        };
      }

      // Map CE certificate data to the same shape as LMS certificates
      const mappedCertificate: Certificate & { tenant: { id: string; name: string; logo_url: string } } = {
        id: ceData.id,
        tenant_id: "",
        student_id: ceData.user_id,
        course_id: ceData.course_id,
        certificate_number: ceData.certificate_number,
        certificate_type: "ce_completion",
        title: `CE Certificate - ${ceData.course_title}`,
        issued_at: ceData.issued_at,
        expires_at: ceData.expires_at || null,
        completion_date: ceData.completion_date,
        final_grade: null,
        hours_completed: Number(ceData.ceh_hours),
        template_id: null,
        custom_data: {},
        verification_code: ceData.verification_code,
        is_revoked: false,
        revoked_at: null,
        revoked_reason: null,
        issued_by: null,
        pdf_url: ceData.pdf_url || null,
        created_at: ceData.issued_at,
        updated_at: ceData.issued_at,
        student: ceData.student
          ? { id: ceData.student.id, full_name: ceData.student.full_name, email: ceData.student.email }
          : { id: ceData.user_id, full_name: ceData.user_name, email: "" },
        course: ceData.course
          ? { id: ceData.course.id, title: ceData.course.title, course_type: "ce" }
          : { id: ceData.course_id, title: ceData.course_title, course_type: "ce" },
        tenant: { id: "", name: ceData.provider_name || "MedicForge", logo_url: "" },
      };

      return {
        valid: true,
        certificate: mappedCertificate,
      };
    },
    enabled: !!verificationCode,
  });
}

// Issue a certificate
export function useIssueCertificate() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: IssueCertificateInput) => {
      if (!tenant?.id || !user?.id) throw new Error("Not authenticated");

      // Get the course for the title
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("title")
        .eq("id", input.course_id)
        .single();

      if (courseError) throw courseError;

      const db = getDb();

      // Get default template if not specified
      let templateId = input.template_id;
      if (!templateId) {
        const { data: template } = await db
          .from("certificate_templates")
          .select("id")
          .eq("tenant_id", tenant.id)
          .eq("is_default", true)
          .eq("is_active", true)
          .single();
        templateId = template?.id;
      }

      const { data, error } = await db
        .from("certificates")
        .insert({
          tenant_id: tenant.id,
          student_id: input.student_id,
          course_id: input.course_id,
          certificate_type: input.certificate_type || "completion",
          title: input.title || `Certificate of Completion - ${course.title}`,
          completion_date: input.completion_date,
          final_grade: input.final_grade,
          hours_completed: input.hours_completed,
          template_id: templateId,
          custom_data: input.custom_data || {},
          expires_at: input.expires_at,
          issued_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Certificate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
    },
  });
}

// Revoke a certificate
export function useRevokeCertificate() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ certificateId, reason }: { certificateId: string; reason: string }) => {
      if (!tenant?.id) throw new Error("Not authenticated");

      const db = getDb();
      const { data, error } = await db
        .from("certificates")
        .update({
          is_revoked: true,
          revoked_at: new Date().toISOString(),
          revoked_reason: reason,
        })
        .eq("id", certificateId)
        .eq("tenant_id", tenant.id)
        .select()
        .single();

      if (error) throw error;
      return data as Certificate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
    },
  });
}

// Fetch certificate templates
export function useCertificateTemplates() {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["certificate-templates", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const db = getDb();
      const { data, error } = await db
        .from("certificate_templates")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as CertificateTemplate[];
    },
    enabled: !!tenant?.id,
  });
}

// Bulk issue certificates
export function useBulkIssueCertificates() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inputs: IssueCertificateInput[]) => {
      if (!tenant?.id || !user?.id) throw new Error("Not authenticated");

      const db = getDb();
      const results = [];
      for (const input of inputs) {
        const { data, error } = await db
          .from("certificates")
          .insert({
            tenant_id: tenant.id,
            student_id: input.student_id,
            course_id: input.course_id,
            certificate_type: input.certificate_type || "completion",
            title: input.title || "Certificate of Completion",
            completion_date: input.completion_date,
            final_grade: input.final_grade,
            hours_completed: input.hours_completed,
            template_id: input.template_id,
            custom_data: input.custom_data || {},
            expires_at: input.expires_at,
            issued_by: user.id,
          })
          .select()
          .single();

        if (error) {
          results.push({ success: false, student_id: input.student_id, error: error.message });
        } else {
          results.push({ success: true, student_id: input.student_id, certificate: data });
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
    },
  });
}
