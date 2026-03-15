"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ShiftBooking, ShiftBookingWithDetails, BookingStatus, Preceptor } from "@/types";

// Helper to transform database booking to ShiftBookingWithDetails type
const transformBooking = (data: any): ShiftBookingWithDetails => ({
  ...data,
  shift: data.shift ? {
    ...data.shift,
    site: data.shift.site ? {
      ...data.shift.site,
      preceptors: (data.shift.site.preceptors || []) as Preceptor[],
    } : undefined,
  } : undefined,
});

interface UseBookingsOptions {
  studentId?: string;
  shiftId?: string;
  status?: BookingStatus | BookingStatus[];
}

export function useShiftBookings(options: UseBookingsOptions = {}) {
  const [bookings, setBookings] = useState<ShiftBookingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchBookings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from("clinical_shift_bookings")
        .select(`
          *,
          shift:clinical_shifts(
            *,
            site:clinical_sites(*)
          ),
          student:users(id, full_name, email)
        `)
        .order("booked_at", { ascending: false });

      if (options.studentId) {
        query = query.eq("student_id", options.studentId);
      }

      if (options.shiftId) {
        query = query.eq("shift_id", options.shiftId);
      }

      if (options.status) {
        if (Array.isArray(options.status)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          query = query.in("status", options.status as any[]);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          query = query.eq("status", options.status as any);
        }
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setBookings((data || []).map(transformBooking));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch bookings"));
    } finally {
      setIsLoading(false);
    }
  }, [supabase, options.studentId, options.shiftId, options.status]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Book a shift using the atomic database function
  const bookShift = async (shiftId: string): Promise<ShiftBooking | null> => {
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

      // Use the atomic booking function
      const { data, error: bookError } = await supabase.rpc("book_clinical_shift", {
        p_shift_id: shiftId,
        p_student_id: userData.user.id,
        p_tenant_id: userProfile.tenant_id,
      });

      if (bookError) throw bookError;

      await fetchBookings();

      // Transform database response to ShiftBooking type
      if (!data) return null;
      return {
        ...data,
        status: data.status ?? "booked",
        booked_at: data.booked_at ?? new Date().toISOString(),
        created_at: data.created_at ?? new Date().toISOString(),
        updated_at: data.updated_at ?? new Date().toISOString(),
      } as ShiftBooking;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to book shift";
      setError(new Error(errorMessage));
      throw err;
    }
  };

  // Cancel a booking
  const cancelBooking = async (
    bookingId: string,
    reason?: string
  ): Promise<boolean> => {
    try {
      const { error: cancelError } = await supabase
        .from("clinical_shift_bookings")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason || null,
        })
        .eq("id", bookingId);

      if (cancelError) throw cancelError;

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                status: "cancelled" as const,
                cancelled_at: new Date().toISOString(),
                cancellation_reason: reason || null,
              }
            : booking
        )
      );

      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to cancel booking"));
      return false;
    }
  };

  // Check in to a shift
  const checkIn = async (bookingId: string): Promise<boolean> => {
    try {
      const { error: checkInError } = await supabase
        .from("clinical_shift_bookings")
        .update({
          check_in_time: new Date().toISOString(),
        })
        .eq("id", bookingId);

      if (checkInError) throw checkInError;

      await fetchBookings();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to check in"));
      return false;
    }
  };

  // Check out of a shift
  const checkOut = async (
    bookingId: string,
    data: {
      hours_completed: number;
      preceptor_name?: string;
      preceptor_signature?: string;
      notes?: string;
    }
  ): Promise<boolean> => {
    try {
      const { error: checkOutError } = await supabase
        .from("clinical_shift_bookings")
        .update({
          check_out_time: new Date().toISOString(),
          status: "completed",
          ...data,
        })
        .eq("id", bookingId);

      if (checkOutError) throw checkOutError;

      await fetchBookings();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to check out"));
      return false;
    }
  };

  // Mark booking status (for instructors)
  const updateBookingStatus = async (
    bookingId: string,
    status: BookingStatus
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from("clinical_shift_bookings")
        .update({ status })
        .eq("id", bookingId);

      if (updateError) throw updateError;

      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId ? { ...booking, status } : booking
        )
      );

      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update booking status"));
      return false;
    }
  };

  // Request a shift via the POC approval workflow
  const requestShift = async (
    shiftId: string,
    requestNotes?: string
  ): Promise<{ bookingId: string } | null> => {
    try {
      const res = await fetch(`/api/clinical/shifts/${shiftId}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_notes: requestNotes || null }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request shift");

      await fetchBookings();
      return { bookingId: data.bookingId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to request shift";
      setError(new Error(msg));
      throw err;
    }
  };

  // Cancel a booking via the API (handles notifications + audit log)
  const cancelMyBooking = async (
    bookingId: string,
    reason?: string
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/clinical/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || null }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to cancel booking");
      }

      await fetchBookings();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to cancel booking"));
      return false;
    }
  };

  return {
    bookings,
    isLoading,
    error,
    refetch: fetchBookings,
    bookShift,
    requestShift,
    cancelBooking,
    cancelMyBooking,
    checkIn,
    checkOut,
    updateBookingStatus,
  };
}

// Hook for getting bookings for the current user
export function useMyBookings() {
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

  return useShiftBookings({ studentId: userId || undefined });
}
