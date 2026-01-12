"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";
import { useUser } from "./use-user";

export interface CalendarToken {
  id: string;
  tenant_id: string;
  user_id: string;
  token: string;
  name: string;
  is_active: boolean;
  created_at: string;
  last_accessed_at: string | null;
}

// Helper to get db with type assertion for new tables
function getDb() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient() as any;
}

export function useCalendarTokens() {
  const { tenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Fetch user's calendar tokens
  const { data: tokens, isLoading } = useQuery({
    queryKey: ["calendar-tokens", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const db = getDb();
      const { data, error } = await db
        .from("calendar_tokens")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CalendarToken[];
    },
    enabled: !!user?.id,
  });

  // Create a new calendar token
  const createTokenMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!tenant?.id || !user?.id) throw new Error("Not authenticated");

      const db = getDb();
      const { data, error } = await db
        .from("calendar_tokens")
        .insert({
          tenant_id: tenant.id,
          user_id: user.id,
          name,
        })
        .select()
        .single();

      if (error) throw error;
      return data as CalendarToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-tokens"] });
    },
  });

  // Revoke (deactivate) a calendar token
  const revokeTokenMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const db = getDb();
      const { error } = await db
        .from("calendar_tokens")
        .update({ is_active: false })
        .eq("id", tokenId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-tokens"] });
    },
  });

  // Delete a calendar token permanently
  const deleteTokenMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const db = getDb();
      const { error } = await db
        .from("calendar_tokens")
        .delete()
        .eq("id", tokenId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-tokens"] });
    },
  });

  return {
    tokens,
    isLoading,
    createToken: createTokenMutation.mutateAsync,
    revokeToken: revokeTokenMutation.mutateAsync,
    deleteToken: deleteTokenMutation.mutateAsync,
    isCreating: createTokenMutation.isPending,
    isRevoking: revokeTokenMutation.isPending,
    isDeleting: deleteTokenMutation.isPending,
    error: createTokenMutation.error || revokeTokenMutation.error || deleteTokenMutation.error,
  };
}
