"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "./use-tenant";

export interface StorageUsage {
  used_bytes: number;
  limit_bytes: number;
  used_percentage: number;
  tier: string;
}

export interface QuotaCheckResult {
  allowed: boolean;
  error?: string;
  current_bytes: number;
  limit_bytes: number;
  remaining_bytes: number;
}

// Format bytes to human readable string
export function formatBytes(bytes: number): string {
  if (bytes === -1) return "Unlimited";
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function useStorageQuota() {
  const { tenant } = useTenant();
  const [isChecking, setIsChecking] = useState(false);
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch current storage usage
  const fetchUsage = useCallback(async () => {
    if (!tenant?.id) return null;

    setIsChecking(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: rpcError } = await (supabase as any).rpc(
        "get_storage_usage",
        { p_tenant_id: tenant.id }
      );

      if (rpcError) throw rpcError;

      const usageData = data as StorageUsage;
      setUsage(usageData);
      return usageData;
    } catch (err) {
      console.error("Failed to fetch storage usage:", err);
      setError("Failed to fetch storage usage");
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [tenant?.id]);

  // Check if a file can be uploaded based on quota
  const checkQuota = useCallback(
    async (fileSizeBytes: number): Promise<QuotaCheckResult> => {
      if (!tenant?.id) {
        return {
          allowed: false,
          error: "No tenant context",
          current_bytes: 0,
          limit_bytes: 0,
          remaining_bytes: 0,
        };
      }

      try {
        const supabase = createClient();
        const { data, error: rpcError } = await (supabase as any).rpc(
          "check_storage_quota",
          {
            p_tenant_id: tenant.id,
            p_file_size_bytes: fileSizeBytes,
          }
        );

        if (rpcError) throw rpcError;

        return data as QuotaCheckResult;
      } catch (err) {
        console.error("Failed to check storage quota:", err);
        return {
          allowed: false,
          error: "Failed to check quota",
          current_bytes: 0,
          limit_bytes: 0,
          remaining_bytes: 0,
        };
      }
    },
    [tenant?.id]
  );

  // Check if upload is allowed and return formatted error if not
  const canUpload = useCallback(
    async (fileSizeBytes: number): Promise<{ allowed: boolean; message?: string }> => {
      const result = await checkQuota(fileSizeBytes);

      if (!result.allowed) {
        if (result.error === "Storage quota exceeded") {
          const currentUsage = formatBytes(result.current_bytes);
          const limit = formatBytes(result.limit_bytes);
          const fileSize = formatBytes(fileSizeBytes);
          return {
            allowed: false,
            message: `Storage quota exceeded. You're using ${currentUsage} of ${limit}. This file (${fileSize}) would exceed your limit. Please upgrade your plan or delete some files.`,
          };
        }
        return {
          allowed: false,
          message: result.error || "Cannot upload file",
        };
      }

      return { allowed: true };
    },
    [checkQuota]
  );

  // Get formatted usage strings
  const getUsageDisplay = useCallback(() => {
    if (!usage) return null;

    return {
      used: formatBytes(usage.used_bytes),
      limit: formatBytes(usage.limit_bytes),
      remaining: formatBytes(
        usage.limit_bytes === -1 ? -1 : usage.limit_bytes - usage.used_bytes
      ),
      percentage: usage.used_percentage,
      isUnlimited: usage.limit_bytes === -1,
    };
  }, [usage]);

  return {
    usage,
    isChecking,
    error,
    fetchUsage,
    checkQuota,
    canUpload,
    getUsageDisplay,
    formatBytes,
  };
}
