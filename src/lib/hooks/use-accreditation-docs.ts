"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export type DocumentCategory =
  | "program_information"
  | "personnel"
  | "curriculum"
  | "clinical_affiliations"
  | "equipment"
  | "policies"
  | "assessment"
  | "outcomes"
  | "meeting_minutes"
  | "other";

export type DocumentStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "expired"
  | "archived";

export interface AccreditationDocument {
  id: string;
  tenant_id: string;
  category: DocumentCategory;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  status: DocumentStatus;
  version: number;
  effective_date: string | null;
  expiration_date: string | null;
  tags: string[];
  uploaded_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  uploader?: { id: string; full_name: string };
  reviewer?: { id: string; full_name: string };
}

export interface AccreditationRequirement {
  id: string;
  standard_code: string;
  standard_name: string;
  description: string;
  required_documents: string[];
  evidence_type: string[];
  is_required: boolean;
  category: DocumentCategory;
}

// Standard CoAEMSP requirements
export const COAEMSP_REQUIREMENTS: AccreditationRequirement[] = [
  {
    id: "1",
    standard_code: "III.A",
    standard_name: "Program Goals",
    description: "The program must have clearly stated goals appropriate to the content and level of the program.",
    required_documents: ["Mission statement", "Program goals document", "Outcome objectives"],
    evidence_type: ["policy", "report"],
    is_required: true,
    category: "program_information",
  },
  {
    id: "2",
    standard_code: "III.B.1",
    standard_name: "Program Director Qualifications",
    description: "Program Director must be qualified by education and experience.",
    required_documents: ["CV/Resume", "Credentials verification", "Job description"],
    evidence_type: ["cv", "credential"],
    is_required: true,
    category: "personnel",
  },
  {
    id: "3",
    standard_code: "III.B.2",
    standard_name: "Medical Director Qualifications",
    description: "Medical Director must be a qualified physician.",
    required_documents: ["CV/Resume", "Medical license", "Board certification", "Agreement letter"],
    evidence_type: ["cv", "credential", "agreement"],
    is_required: true,
    category: "personnel",
  },
  {
    id: "4",
    standard_code: "III.B.3",
    standard_name: "Faculty Qualifications",
    description: "Faculty must be qualified by education, training, and experience.",
    required_documents: ["Faculty roster", "Individual CVs", "Credential files"],
    evidence_type: ["roster", "cv", "credential"],
    is_required: true,
    category: "personnel",
  },
  {
    id: "5",
    standard_code: "III.C",
    standard_name: "Clinical Affiliations",
    description: "Clinical affiliations must be sufficient to provide student clinical experiences.",
    required_documents: ["Affiliation agreements", "Clinical site list", "Preceptor rosters"],
    evidence_type: ["agreement", "roster"],
    is_required: true,
    category: "clinical_affiliations",
  },
  {
    id: "6",
    standard_code: "III.D",
    standard_name: "Equipment and Supplies",
    description: "Equipment and supplies must be adequate to achieve program goals.",
    required_documents: ["Equipment inventory", "Maintenance records", "Safety documentation"],
    evidence_type: ["inventory", "maintenance"],
    is_required: true,
    category: "equipment",
  },
  {
    id: "7",
    standard_code: "IV.A",
    standard_name: "Curriculum",
    description: "Curriculum must meet national EMS education standards.",
    required_documents: ["Curriculum outline", "Syllabi", "Competency mapping"],
    evidence_type: ["curriculum", "syllabus"],
    is_required: true,
    category: "curriculum",
  },
  {
    id: "8",
    standard_code: "V.A",
    standard_name: "Outcomes Assessment",
    description: "Program must assess student learning outcomes.",
    required_documents: ["Assessment plan", "Outcome reports", "Advisory committee minutes"],
    evidence_type: ["plan", "report", "minutes"],
    is_required: true,
    category: "assessment",
  },
  {
    id: "9",
    standard_code: "V.B",
    standard_name: "Program Effectiveness",
    description: "Program must demonstrate effectiveness in achieving outcomes.",
    required_documents: ["Retention data", "Certification rates", "Employment rates", "Graduate surveys"],
    evidence_type: ["data", "survey"],
    is_required: true,
    category: "outcomes",
  },
];

export function useAccreditationDocuments(category?: DocumentCategory) {
  const [documents, setDocuments] = useState<AccreditationDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
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
      let query = (supabase as any)
        .from("accreditation_documents")
        .select(`
          *,
          uploader:users!accreditation_documents_uploaded_by_fkey(id, full_name),
          reviewer:users!accreditation_documents_reviewed_by_fkey(id, full_name)
        `)
        .eq("tenant_id", profile.tenant_id)
        .neq("status", "archived")
        .order("updated_at", { ascending: false });

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setDocuments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch documents"));
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, category, supabase]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadDocument = async (
    file: File,
    metadata: {
      category: DocumentCategory;
      title: string;
      description?: string;
      effective_date?: string;
      expiration_date?: string;
      tags?: string[];
    }
  ): Promise<AccreditationDocument | null> => {
    if (!profile?.tenant_id || !profile?.id) {
      toast.error("You must be logged in to upload documents");
      return null;
    }

    try {
      // Upload file to storage
      const timestamp = Date.now();
      const filename = `${profile.tenant_id}/accreditation/${metadata.category}/${timestamp}-${file.name}`;

      const { data: _uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filename, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(filename);

      // Create document record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: insertError } = await (supabase as any)
        .from("accreditation_documents")
        .insert({
          tenant_id: profile.tenant_id,
          category: metadata.category,
          title: metadata.title,
          description: metadata.description || null,
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          status: "draft",
          version: 1,
          effective_date: metadata.effective_date || null,
          expiration_date: metadata.expiration_date || null,
          tags: metadata.tags || [],
          uploaded_by: profile.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setDocuments((prev) => [data, ...prev]);
      toast.success("Document uploaded successfully");
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
      const { error: updateError } = await (supabase as any)
        .from("accreditation_documents")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) throw updateError;

      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
      );
      toast.success("Document updated");
      return true;
    } catch (_err) {
      toast.error("Failed to update document");
      return false;
    }
  };

  const approveDocument = async (id: string, notes?: string): Promise<boolean> => {
    if (!profile?.id) return false;

    return updateDocument(id, {
      status: "approved",
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
      notes,
    });
  };

  const archiveDocument = async (id: string): Promise<boolean> => {
    return updateDocument(id, { status: "archived" });
  };

  const deleteDocument = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: deleteError } = await (supabase as any)
        .from("accreditation_documents")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast.success("Document deleted");
      return true;
    } catch (_err) {
      toast.error("Failed to delete document");
      return false;
    }
  };

  // Get compliance status
  const getComplianceStatus = useCallback(() => {
    const compliance: Record<string, { required: number; uploaded: number; approved: number }> = {};

    for (const req of COAEMSP_REQUIREMENTS) {
      if (!compliance[req.category]) {
        compliance[req.category] = { required: 0, uploaded: 0, approved: 0 };
      }
      compliance[req.category].required += req.required_documents.length;
    }

    for (const doc of documents) {
      if (compliance[doc.category]) {
        compliance[doc.category].uploaded++;
        if (doc.status === "approved") {
          compliance[doc.category].approved++;
        }
      }
    }

    return compliance;
  }, [documents]);

  // Get expiring documents
  const getExpiringDocuments = useCallback((daysAhead: number = 30) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);

    return documents.filter((d) => {
      if (!d.expiration_date) return false;
      const expDate = new Date(d.expiration_date);
      return expDate <= cutoff && expDate >= new Date();
    });
  }, [documents]);

  return {
    documents,
    isLoading,
    error,
    refetch: fetchDocuments,
    uploadDocument,
    updateDocument,
    approveDocument,
    archiveDocument,
    deleteDocument,
    getComplianceStatus,
    getExpiringDocuments,
    requirements: COAEMSP_REQUIREMENTS,
  };
}
