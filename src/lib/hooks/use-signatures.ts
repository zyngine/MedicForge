"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export interface UserSignature {
  id: string;
  tenant_id: string;
  user_id: string;
  signature_data: string;
  signature_type: "primary" | "preceptor" | "evaluator";
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SignatureVerification {
  id: string;
  tenant_id: string;
  signer_id: string | null;
  signer_name: string;
  signer_credentials: string | null;
  signature_data: string;
  document_type: string;
  document_id: string;
  ip_address: string | null;
  user_agent: string | null;
  signed_at: string;
  verified_hash: string;
}

export interface RecordSignatureInput {
  signerName: string;
  signerCredentials?: string;
  signatureData: string;
  documentType: "clinical_log" | "shift_booking" | "patient_contact" | "skill_attempt";
  documentId: string;
}

// Hook for managing user's saved signatures
export function useUserSignatures() {
  const [signatures, setSignatures] = useState<UserSignature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchSignatures = useCallback(async () => {
    if (!profile?.id) return;

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: fetchError } = await (supabase as any)
        .from("user_signatures")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setSignatures(data || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch signatures"));
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, supabase]);

  useEffect(() => {
    fetchSignatures();
  }, [fetchSignatures]);

  const saveSignature = async (
    signatureData: string,
    signatureType: "primary" | "preceptor" | "evaluator" = "primary",
    isDefault: boolean = true
  ): Promise<UserSignature | null> => {
    if (!profile?.id || !profile?.tenant_id) {
      toast.error("You must be logged in to save a signature");
      return null;
    }

    try {
      // If setting as default, unset other defaults of same type
      if (isDefault) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("user_signatures")
          .update({ is_default: false })
          .eq("user_id", profile.id)
          .eq("signature_type", signatureType);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: insertError } = await (supabase as any)
        .from("user_signatures")
        .insert({
          tenant_id: profile.tenant_id,
          user_id: profile.id,
          signature_data: signatureData,
          signature_type: signatureType,
          is_default: isDefault,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setSignatures((prev) => [data, ...prev]);
      toast.success("Signature saved");
      return data;
    } catch (err) {
      toast.error("Failed to save signature");
      return null;
    }
  };

  const deleteSignature = async (signatureId: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: deleteError } = await (supabase as any)
        .from("user_signatures")
        .delete()
        .eq("id", signatureId);

      if (deleteError) throw deleteError;
      setSignatures((prev) => prev.filter((s) => s.id !== signatureId));
      toast.success("Signature deleted");
      return true;
    } catch (err) {
      toast.error("Failed to delete signature");
      return false;
    }
  };

  const getDefaultSignature = (type: "primary" | "preceptor" | "evaluator" = "primary") => {
    return signatures.find((s) => s.signature_type === type && s.is_default);
  };

  return {
    signatures,
    isLoading,
    error,
    refetch: fetchSignatures,
    saveSignature,
    deleteSignature,
    getDefaultSignature,
  };
}

// Hook for recording signature verifications
export function useSignatureVerification() {
  const { profile } = useUser();
  const supabase = createClient();

  const recordSignature = async (input: RecordSignatureInput): Promise<SignatureVerification | null> => {
    if (!profile?.tenant_id) {
      toast.error("You must be logged in to record a signature");
      return null;
    }

    try {
      // Get client info for audit trail
      const ipAddress = ""; // Would need server-side to get real IP
      const userAgent = typeof window !== "undefined" ? navigator.userAgent : "";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase as any)
        .rpc("record_signature_verification", {
          p_tenant_id: profile.tenant_id,
          p_signer_id: profile.id,
          p_signer_name: input.signerName,
          p_signer_credentials: input.signerCredentials || null,
          p_signature_data: input.signatureData,
          p_document_type: input.documentType,
          p_document_id: input.documentId,
          p_ip_address: ipAddress || null,
          p_user_agent: userAgent || null,
        });

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      console.error("Failed to record signature:", err);
      toast.error("Failed to record signature");
      return null;
    }
  };

  const getDocumentSignatures = async (
    documentType: string,
    documentId: string
  ): Promise<SignatureVerification[]> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: fetchError } = await (supabase as any)
        .from("signature_verifications")
        .select("*")
        .eq("document_type", documentType)
        .eq("document_id", documentId)
        .order("signed_at", { ascending: false });

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      console.error("Failed to fetch signatures:", err);
      return [];
    }
  };

  return {
    recordSignature,
    getDocumentSignatures,
  };
}

// Hook for adding preceptor signature to clinical documents
export function useClinicalSignature(documentType: "clinical_log" | "shift_booking" | "patient_contact") {
  const supabase = createClient();
  const { recordSignature } = useSignatureVerification();

  const tableMap = {
    clinical_log: "clinical_logs",
    shift_booking: "clinical_shift_bookings",
    patient_contact: "clinical_patient_contacts",
  };

  const addPreceptorSignature = async (
    documentId: string,
    signature: {
      signatureData: string;
      name: string;
      credentials: string;
    }
  ): Promise<boolean> => {
    try {
      const table = tableMap[documentType];

      // Update the document with signature
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from(table)
        .update({
          preceptor_signature_data: signature.signatureData,
          preceptor_signature_name: signature.name,
          preceptor_signature_credentials: signature.credentials,
          preceptor_signed_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      if (updateError) throw updateError;

      // Record verification for audit trail
      await recordSignature({
        signerName: signature.name,
        signerCredentials: signature.credentials,
        signatureData: signature.signatureData,
        documentType,
        documentId,
      });

      toast.success("Preceptor signature recorded");
      return true;
    } catch (_err) {
      toast.error("Failed to record signature");
      return false;
    }
  };

  return { addPreceptorSignature };
}

// Hook for skill sheet evaluator signatures
export function useSkillSheetSignature() {
  const supabase = createClient();
  const { recordSignature } = useSignatureVerification();

  const addEvaluatorSignature = async (
    attemptId: string,
    signature: {
      signatureData: string;
      name: string;
      credentials: string;
    }
  ): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from("skill_sheet_attempts")
        .update({
          evaluator_signature_data: signature.signatureData,
          evaluator_signature_name: signature.name,
          evaluator_signature_credentials: signature.credentials,
          evaluator_signed_at: new Date().toISOString(),
        })
        .eq("id", attemptId);

      if (updateError) throw updateError;

      await recordSignature({
        signerName: signature.name,
        signerCredentials: signature.credentials,
        signatureData: signature.signatureData,
        documentType: "skill_attempt",
        documentId: attemptId,
      });

      toast.success("Evaluator signature recorded");
      return true;
    } catch (_err) {
      toast.error("Failed to record signature");
      return false;
    }
  };

  const addStudentSignature = async (
    attemptId: string,
    signatureData: string
  ): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from("skill_sheet_attempts")
        .update({
          student_signature_data: signatureData,
          student_signed_at: new Date().toISOString(),
        })
        .eq("id", attemptId);

      if (updateError) throw updateError;
      toast.success("Student signature recorded");
      return true;
    } catch (_err) {
      toast.error("Failed to record signature");
      return false;
    }
  };

  return { addEvaluatorSignature, addStudentSignature };
}
