"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ClinicalShift, ClinicalShiftWithDetails, ClinicalShiftForm } from "@/types";

interface UseShiftsOptions {
  siteId?: string;
  courseId?: string;
  startDate?: string;
  endDate?: string;
}

export function useClinicalShifts(options: UseShiftsOptions = {}) {
  const [shifts, setShifts] = useState<ClinicalShiftWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchShifts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from("clinical_shifts")
        .select(`
          *,
          site:clinical_sites(*),
          bookings:clinical_shift_bookings(count)
        `)
        .eq("is_active", true)
        .order("shift_date", { ascending: true });

      if (options.siteId) {
        query = query.eq("site_id", options.siteId);
      }

      if (options.courseId) {
        query = query.eq("course_id", options.courseId);
      }

      if (options.startDate) {
        query = query.gte("shift_date", options.startDate);
      }

      if (options.endDate) {
        query = query.lte("shift_date", options.endDate);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transform data to include computed fields
      const transformedShifts: ClinicalShiftWithDetails[] = (data || []).map((shift: any) => ({
        ...shift,
        bookings_count: shift.bookings?.[0]?.count || 0,
        available_slots: shift.capacity - (shift.bookings?.[0]?.count || 0),
        is_available:
          (shift.capacity - (shift.bookings?.[0]?.count || 0)) > 0 &&
          new Date(shift.shift_date) >= new Date(),
      }));

      setShifts(transformedShifts);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch shifts"));
    } finally {
      setIsLoading(false);
    }
  }, [supabase, options.siteId, options.courseId, options.startDate, options.endDate]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const createShift = async (shiftData: ClinicalShiftForm): Promise<ClinicalShift | null> => {
    try {
      const { data, error: createError } = await supabase
        .from("clinical_shifts")
        .insert([shiftData])
        .select()
        .single();

      if (createError) throw createError;

      // Refetch to get the full data with relations
      await fetchShifts();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to create shift"));
      return null;
    }
  };

  const updateShift = async (
    shiftId: string,
    updates: Partial<ClinicalShiftForm>
  ): Promise<ClinicalShift | null> => {
    try {
      const { data, error: updateError } = await supabase
        .from("clinical_shifts")
        .update(updates)
        .eq("id", shiftId)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchShifts();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update shift"));
      return null;
    }
  };

  const deleteShift = async (shiftId: string): Promise<boolean> => {
    try {
      // Soft delete
      const { error: deleteError } = await supabase
        .from("clinical_shifts")
        .update({ is_active: false })
        .eq("id", shiftId);

      if (deleteError) throw deleteError;

      setShifts((prev) => prev.filter((shift) => shift.id !== shiftId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete shift"));
      return false;
    }
  };

  return {
    shifts,
    isLoading,
    error,
    refetch: fetchShifts,
    createShift,
    updateShift,
    deleteShift,
  };
}

export function useClinicalShift(shiftId: string | null) {
  const [shift, setShift] = useState<ClinicalShiftWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (!shiftId) {
      setShift(null);
      setIsLoading(false);
      return;
    }

    const fetchShift = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from("clinical_shifts")
          .select(`
            *,
            site:clinical_sites(*),
            bookings:clinical_shift_bookings(
              *,
              student:users(id, full_name, email)
            )
          `)
          .eq("id", shiftId)
          .single();

        if (fetchError) throw fetchError;

        const transformedShift: ClinicalShiftWithDetails = {
          ...data,
          bookings_count: data.bookings?.length || 0,
          available_slots: data.capacity - (data.bookings?.length || 0),
          is_available:
            (data.capacity - (data.bookings?.length || 0)) > 0 &&
            new Date(data.shift_date) >= new Date(),
        };

        setShift(transformedShift);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch shift"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchShift();
  }, [shiftId, supabase]);

  return { shift, isLoading, error };
}
