"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ClinicalPatientContact, ClinicalPatientContactWithDetails, PatientContactForm, VitalSigns, MedicationGiven, Preceptor } from "@/types";

type VerificationStatus = "pending" | "verified" | "rejected";

// Helper to transform database contact to ClinicalPatientContactWithDetails type
const transformContact = (data: any): ClinicalPatientContactWithDetails => ({
  ...data,
  vitals: (data.vitals || []) as VitalSigns[],
  skills_performed: (data.skills_performed || []) as string[],
  medications_given: (data.medications_given || []) as MedicationGiven[],
  procedures: (data.procedures || []) as string[],
  student: data.student || undefined,
  booking: data.booking ? {
    ...data.booking,
    shift: data.booking.shift ? {
      ...data.booking.shift,
      site: data.booking.shift.site ? {
        ...data.booking.shift.site,
        preceptors: (data.booking.shift.site.preceptors || []) as Preceptor[],
      } : undefined,
    } : undefined,
  } : undefined,
});

interface UsePatientContactsOptions {
  studentId?: string;
  courseId?: string;
  bookingId?: string;
  status?: VerificationStatus | VerificationStatus[];
}

export function usePatientContacts(options: UsePatientContactsOptions = {}) {
  const [contacts, setContacts] = useState<ClinicalPatientContactWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchContacts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from("clinical_patient_contacts")
        .select(`
          *,
          student:users(id, full_name, email),
          booking:clinical_shift_bookings(
            *,
            shift:clinical_shifts(
              *,
              site:clinical_sites(*)
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (options.studentId) {
        query = query.eq("student_id", options.studentId);
      }

      if (options.courseId) {
        query = query.eq("course_id", options.courseId);
      }

      if (options.bookingId) {
        query = query.eq("booking_id", options.bookingId);
      }

      if (options.status) {
        if (Array.isArray(options.status)) {
          query = query.in("verification_status", options.status);
        } else {
          query = query.eq("verification_status", options.status);
        }
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setContacts((data || []).map(transformContact));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch patient contacts"));
    } finally {
      setIsLoading(false);
    }
  }, [supabase, options.studentId, options.courseId, options.bookingId, options.status]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Create a new patient contact
  const createContact = async (
    contactData: PatientContactForm & { booking_id: string; course_id?: string }
  ): Promise<ClinicalPatientContactWithDetails | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Get user's tenant_id
      const { data: userProfile } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", userData.user.id)
        .single();

      if (!userProfile) throw new Error("User profile not found");

      const { data, error: createError } = await supabase
        .from("clinical_patient_contacts")
        .insert([
          {
            ...contactData,
            vitals: contactData.vitals as any,
            skills_performed: contactData.skills_performed as any,
            medications_given: contactData.medications_given as any,
            procedures: contactData.procedures as any,
            tenant_id: userProfile.tenant_id,
            student_id: userData.user.id,
            verification_status: "pending",
          },
        ])
        .select()
        .single();

      if (createError) throw createError;

      await fetchContacts();
      return transformContact(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to create patient contact"));
      return null;
    }
  };

  // Update a patient contact
  const updateContact = async (
    contactId: string,
    updates: Partial<PatientContactForm>
  ): Promise<ClinicalPatientContactWithDetails | null> => {
    try {
      const { data, error: updateError } = await supabase
        .from("clinical_patient_contacts")
        .update({
          ...updates,
          vitals: updates.vitals as any,
          skills_performed: updates.skills_performed as any,
          medications_given: updates.medications_given as any,
          procedures: updates.procedures as any,
        })
        .eq("id", contactId)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchContacts();
      return transformContact(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update patient contact"));
      return null;
    }
  };

  // Delete a patient contact (only if pending)
  const deleteContact = async (contactId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from("clinical_patient_contacts")
        .delete()
        .eq("id", contactId)
        .eq("verification_status", "pending"); // Only allow deletion of pending contacts

      if (deleteError) throw deleteError;

      setContacts((prev) => prev.filter((contact) => contact.id !== contactId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete patient contact"));
      return false;
    }
  };

  // Verify a patient contact (instructor only)
  const verifyContact = async (
    contactId: string,
    feedback?: string
  ): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { error: verifyError } = await supabase
        .from("clinical_patient_contacts")
        .update({
          verification_status: "verified",
          verified_by: userData.user.id,
          verified_at: new Date().toISOString(),
          preceptor_feedback: feedback || null,
        })
        .eq("id", contactId);

      if (verifyError) throw verifyError;

      await fetchContacts();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to verify patient contact"));
      return false;
    }
  };

  // Reject a patient contact (instructor only)
  const rejectContact = async (
    contactId: string,
    feedback: string
  ): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { error: rejectError } = await supabase
        .from("clinical_patient_contacts")
        .update({
          verification_status: "rejected",
          verified_by: userData.user.id,
          verified_at: new Date().toISOString(),
          preceptor_feedback: feedback,
        })
        .eq("id", contactId);

      if (rejectError) throw rejectError;

      await fetchContacts();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to reject patient contact"));
      return false;
    }
  };

  return {
    contacts,
    isLoading,
    error,
    refetch: fetchContacts,
    createContact,
    updateContact,
    deleteContact,
    verifyContact,
    rejectContact,
  };
}

// Hook for getting a single patient contact
export function usePatientContact(contactId: string | null) {
  const [contact, setContact] = useState<ClinicalPatientContactWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (!contactId) {
      setContact(null);
      setIsLoading(false);
      return;
    }

    const fetchContact = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("clinical_patient_contacts")
          .select(`
            *,
            student:users(id, full_name, email),
            booking:clinical_shift_bookings(
              *,
              shift:clinical_shifts(
                *,
                site:clinical_sites(*)
              )
            )
          `)
          .eq("id", contactId)
          .single();

        if (fetchError) throw fetchError;

        setContact(transformContact(data));
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch patient contact"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchContact();
  }, [contactId, supabase]);

  return { contact, isLoading, error };
}

// Hook for getting patient contacts for the current user
export function useMyPatientContacts() {
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserId(data.user.id);
      }
    };
    getUser();
  }, [supabase]);

  return usePatientContacts({ studentId: userId || undefined });
}
