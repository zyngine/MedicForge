"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export type ComplianceStatus = "compliant" | "partial" | "non_compliant" | "not_applicable" | "pending_review";
export type DocumentStatus = "draft" | "under_review" | "approved" | "expired" | "archived";

export interface CoAEMSPStandard {
  id: string;
  standard_code: string;
  title: string;
  description: string;
  category: string;
  certification_level: string;
  required_evidence: string[];
  is_active: boolean;
}

export interface AccreditationDocument {
  id: string;
  tenant_id: string;
  standard_id: string | null;
  document_type: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  version: number;
  status: DocumentStatus;
  valid_from: string | null;
  valid_until: string | null;
  uploaded_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface AccreditationCompliance {
  id: string;
  tenant_id: string;
  standard_id: string;
  course_id: string | null;
  status: ComplianceStatus;
  evidence_document_ids: string[];
  notes: string | null;
  action_items: string[];
  reviewed_by: string | null;
  reviewed_at: string | null;
  next_review_date: string | null;
  standard?: CoAEMSPStandard;
}

export interface ProgramOutcome {
  id: string;
  tenant_id: string;
  cohort_year: number;
  certification_level: string;
  students_enrolled: number;
  students_graduated: number;
  students_withdrawn: number;
  retention_rate: number | null;
  completion_rate: number | null;
  positive_placement_rate: number | null;
  nremt_first_attempt_pass: number;
  cognitive_pass_rate: number | null;
  psychomotor_pass_rate: number | null;
}

export interface AccreditationReport {
  id: string;
  tenant_id: string;
  report_type: string;
  report_period_start: string | null;
  report_period_end: string | null;
  title: string;
  generated_data: unknown;
  status: string;
  created_at: string;
}

// Hook for CoAEMSP standards
export function useCoAEMSPStandards(certificationLevel?: string) {
  const [standards, setStandards] = useState<CoAEMSPStandard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchStandards = async () => {
      try {
        setIsLoading(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (supabase as any)
          .from("coaemsp_standards")
          .select("*")
          .eq("is_active", true)
          .order("standard_code");

        if (certificationLevel) {
          query = query.eq("certification_level", certificationLevel);
        }

        const { data, error } = await query;
        if (error) throw error;
        setStandards(data || []);
      } catch (err) {
        console.error("Failed to fetch standards:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStandards();
  }, [certificationLevel, supabase]);

  // Group standards by category
  const standardsByCategory = standards.reduce((acc, std) => {
    if (!acc[std.category]) {
      acc[std.category] = [];
    }
    acc[std.category].push(std);
    return acc;
  }, {} as Record<string, CoAEMSPStandard[]>);

  return { standards, standardsByCategory, isLoading };
}

// Hook for accreditation documents
export function useAccreditationDocuments() {
  const [documents, setDocuments] = useState<AccreditationDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchDocuments = useCallback(async () => {
    if (!profile?.tenant_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("accreditation_documents")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, supabase]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadDocument = async (input: {
    standard_id?: string;
    document_type: string;
    title: string;
    description?: string;
    file_url: string;
    file_name: string;
    file_size: number;
    valid_from?: string;
    valid_until?: string;
  }): Promise<AccreditationDocument | null> => {
    if (!profile?.tenant_id || !profile?.id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("accreditation_documents")
        .insert({
          tenant_id: profile.tenant_id,
          standard_id: input.standard_id || null,
          document_type: input.document_type,
          title: input.title,
          description: input.description || null,
          file_url: input.file_url,
          file_name: input.file_name,
          file_size: input.file_size,
          valid_from: input.valid_from || null,
          valid_until: input.valid_until || null,
          uploaded_by: profile.id,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      setDocuments((prev) => [data, ...prev]);
      toast.success("Document uploaded");
      return data;
    } catch (err) {
      console.error("Failed to upload document:", err);
      toast.error("Failed to upload document");
      return null;
    }
  };

  const updateDocument = async (
    id: string,
    updates: Partial<AccreditationDocument>
  ): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("accreditation_documents")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
      return true;
    } catch (err) {
      toast.error("Failed to update document");
      return false;
    }
  };

  const approveDocument = async (id: string): Promise<boolean> => {
    if (!profile?.id) return false;
    return updateDocument(id, {
      status: "approved",
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    });
  };

  return {
    documents,
    isLoading,
    refetch: fetchDocuments,
    uploadDocument,
    updateDocument,
    approveDocument,
  };
}

// Hook for compliance tracking
export function useComplianceTracking(courseId?: string) {
  const [compliance, setCompliance] = useState<AccreditationCompliance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchCompliance = useCallback(async () => {
    if (!profile?.tenant_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("accreditation_compliance")
        .select(`
          *,
          standard:coaemsp_standards(*)
        `)
        .eq("tenant_id", profile.tenant_id);

      if (courseId) {
        query = query.eq("course_id", courseId);
      }

      const { data, error } = await query.order("standard(standard_code)");
      if (error) throw error;
      setCompliance(data || []);
    } catch (err) {
      console.error("Failed to fetch compliance:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, courseId, supabase]);

  useEffect(() => {
    fetchCompliance();
  }, [fetchCompliance]);

  const updateComplianceStatus = async (
    standardId: string,
    status: ComplianceStatus,
    notes?: string,
    actionItems?: string[]
  ): Promise<boolean> => {
    if (!profile?.tenant_id || !profile?.id) return false;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("accreditation_compliance")
        .upsert({
          tenant_id: profile.tenant_id,
          standard_id: standardId,
          course_id: courseId || null,
          status,
          notes: notes || null,
          action_items: actionItems || [],
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString(),
        });

      if (error) throw error;
      await fetchCompliance();
      toast.success("Compliance status updated");
      return true;
    } catch (err) {
      toast.error("Failed to update compliance");
      return false;
    }
  };

  const linkDocumentToCompliance = async (
    standardId: string,
    documentId: string
  ): Promise<boolean> => {
    const item = compliance.find((c) => c.standard_id === standardId);
    if (!item) return false;

    const newDocIds = [...(item.evidence_document_ids || []), documentId];
    return updateComplianceStatus(standardId, item.status, item.notes || undefined, item.action_items);
  };

  // Calculate overall compliance stats
  const complianceStats = {
    total: compliance.length,
    compliant: compliance.filter((c) => c.status === "compliant").length,
    partial: compliance.filter((c) => c.status === "partial").length,
    nonCompliant: compliance.filter((c) => c.status === "non_compliant").length,
    pending: compliance.filter((c) => c.status === "pending_review").length,
    overallRate:
      compliance.length > 0
        ? (compliance.filter((c) => c.status === "compliant").length / compliance.length) * 100
        : 0,
  };

  return {
    compliance,
    complianceStats,
    isLoading,
    refetch: fetchCompliance,
    updateComplianceStatus,
    linkDocumentToCompliance,
  };
}

// Hook for program outcomes
export function useProgramOutcomes() {
  const [outcomes, setOutcomes] = useState<ProgramOutcome[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchOutcomes = useCallback(async () => {
    if (!profile?.tenant_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("program_outcomes")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .order("cohort_year", { ascending: false });

      if (error) throw error;
      setOutcomes(data || []);
    } catch (err) {
      console.error("Failed to fetch outcomes:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, supabase]);

  useEffect(() => {
    fetchOutcomes();
  }, [fetchOutcomes]);

  const saveOutcome = async (input: Partial<ProgramOutcome>): Promise<boolean> => {
    if (!profile?.tenant_id) return false;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("program_outcomes")
        .upsert({
          tenant_id: profile.tenant_id,
          ...input,
        });

      if (error) throw error;
      await fetchOutcomes();
      toast.success("Outcome data saved");
      return true;
    } catch (err) {
      toast.error("Failed to save outcome data");
      return false;
    }
  };

  return {
    outcomes,
    isLoading,
    refetch: fetchOutcomes,
    saveOutcome,
  };
}

// Hook for generating accreditation reports
export function useAccreditationReports() {
  const [reports, setReports] = useState<AccreditationReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchReports = useCallback(async () => {
    if (!profile?.tenant_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("accreditation_reports")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, supabase]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const generateReport = async (
    reportType: string,
    startDate: string,
    endDate: string,
    title: string
  ): Promise<AccreditationReport | null> => {
    if (!profile?.tenant_id || !profile?.id) {
      toast.error("You must be logged in");
      return null;
    }

    setIsGenerating(true);
    try {
      // Generate report data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: reportData, error: generateError } = await (supabase as any)
        .rpc("generate_coaemsp_report", {
          p_tenant_id: profile.tenant_id,
          p_start_date: startDate,
          p_end_date: endDate,
        });

      if (generateError) throw generateError;

      // Save report
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("accreditation_reports")
        .insert({
          tenant_id: profile.tenant_id,
          report_type: reportType,
          report_period_start: startDate,
          report_period_end: endDate,
          title,
          generated_data: reportData,
          status: "draft",
          generated_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;
      setReports((prev) => [data, ...prev]);
      toast.success("Report generated");
      return data;
    } catch (err) {
      console.error("Failed to generate report:", err);
      toast.error("Failed to generate report");
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    reports,
    isLoading,
    isGenerating,
    refetch: fetchReports,
    generateReport,
  };
}
