"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";

export type AuditAction =
  | "employee_created"
  | "employee_updated"
  | "employee_deactivated"
  | "employee_reactivated"
  | "competency_completed"
  | "competency_verified"
  | "competency_rejected"
  | "cycle_created"
  | "cycle_activated"
  | "cycle_completed"
  | "md_assigned"
  | "md_revoked"
  | "skill_created"
  | "skill_updated"
  | "settings_updated"
  | "bulk_import";

export interface AuditLogEntry {
  id: string;
  tenant_id: string;
  user_id: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  old_values: Record<string, any> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // Joined data
  user?: {
    id: string;
    email: string;
    full_name: string;
  };
}

export interface AuditLogFilters {
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Get audit log entries
 */
export function useAuditLog(options?: {
  filters?: AuditLogFilters;
  limit?: number;
  offset?: number;
}) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["audit-log", tenant?.id, options],
    queryFn: async () => {
      if (!tenant?.id) return { entries: [], total: 0 };

      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("agency_audit_log")
        .select(`
          *,
          user:users(id, email, full_name)
        `, { count: "exact" })
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      // Apply filters
      if (options?.filters?.action) {
        query = query.eq("action", options.filters.action);
      }
      if (options?.filters?.entityType) {
        query = query.eq("entity_type", options.filters.entityType);
      }
      if (options?.filters?.entityId) {
        query = query.eq("entity_id", options.filters.entityId);
      }
      if (options?.filters?.userId) {
        query = query.eq("user_id", options.filters.userId);
      }
      if (options?.filters?.startDate) {
        query = query.gte("created_at", options.filters.startDate);
      }
      if (options?.filters?.endDate) {
        query = query.lte("created_at", options.filters.endDate);
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        entries: (data || []) as AuditLogEntry[],
        total: count || 0,
      };
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Get recent activity for an entity (employee, competency, etc.)
 */
export function useEntityAuditLog(entityType: string, entityId: string | null | undefined, limit: number = 20) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["entity-audit-log", tenant?.id, entityType, entityId],
    queryFn: async () => {
      if (!tenant?.id || !entityId) return [];

      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("agency_audit_log")
        .select(`
          *,
          user:users(id, email, full_name)
        `)
        .eq("tenant_id", tenant.id)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as AuditLogEntry[];
    },
    enabled: !!tenant?.id && !!entityId,
  });
}

/**
 * Get user activity log
 */
export function useUserActivityLog(userId: string | null | undefined, limit: number = 50) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["user-activity-log", tenant?.id, userId],
    queryFn: async () => {
      if (!tenant?.id || !userId) return [];

      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("agency_audit_log")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as AuditLogEntry[];
    },
    enabled: !!tenant?.id && !!userId,
  });
}

/**
 * Log an action to the audit log
 */
export function useLogAuditAction() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      action,
      entityType,
      entityId,
      oldValues,
      newValues,
    }: {
      action: AuditAction;
      entityType: string;
      entityId?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      oldValues?: Record<string, any>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      newValues?: Record<string, any>;
    }) => {
      if (!tenant?.id) throw new Error("No tenant");

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("agency_audit_log")
        .insert({
          tenant_id: tenant.id,
          user_id: user?.id,
          action,
          entity_type: entityType,
          entity_id: entityId,
          old_values: oldValues,
          new_values: newValues,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AuditLogEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-log"] });
    },
  });
}

/**
 * Get audit log statistics
 */
export function useAuditLogStats(daysBack: number = 30) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["audit-log-stats", tenant?.id, daysBack],
    queryFn: async () => {
      if (!tenant?.id) return null;

      const supabase = createClient();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("agency_audit_log")
        .select("action, created_at")
        .eq("tenant_id", tenant.id)
        .gte("created_at", startDate.toISOString());

      if (error) throw error;

      // Count by action
      const byAction: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data || []).forEach((entry: any) => {
        byAction[entry.action] = (byAction[entry.action] || 0) + 1;
      });

      // Count by day
      const byDay: Record<string, number> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data || []).forEach((entry: any) => {
        const day = entry.created_at.split("T")[0];
        byDay[day] = (byDay[day] || 0) + 1;
      });

      return {
        totalEntries: (data || []).length,
        byAction,
        byDay,
        averagePerDay: (data || []).length / daysBack,
      };
    },
    enabled: !!tenant?.id,
  });
}

/**
 * Export audit log to CSV format
 */
export function useExportAuditLog() {
  const { tenant } = useTenant();

  return useMutation({
    mutationFn: async (filters?: AuditLogFilters) => {
      if (!tenant?.id) throw new Error("No tenant");

      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("agency_audit_log")
        .select(`
          id,
          action,
          entity_type,
          entity_id,
          old_values,
          new_values,
          created_at,
          user:users(email, full_name)
        `)
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters?.action) {
        query = query.eq("action", filters.action);
      }
      if (filters?.entityType) {
        query = query.eq("entity_type", filters.entityType);
      }
      if (filters?.startDate) {
        query = query.gte("created_at", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("created_at", filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Convert to CSV format
      const headers = [
        "Timestamp",
        "User",
        "Action",
        "Entity Type",
        "Entity ID",
        "Changes",
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = (data || []).map((entry: any) => [
        entry.created_at,
        entry.user?.full_name || entry.user?.email || "Unknown",
        entry.action,
        entry.entity_type,
        entry.entity_id || "",
        JSON.stringify(entry.new_values || {}),
      ]);

      const csvContent = [
        headers.join(","),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...rows.map((row: any) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      return csvContent;
    },
  });
}
