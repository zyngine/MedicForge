"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AgencyEmployee {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  certification_level: string;
  state_certification_number: string | null;
  certification_expiration: string | null;
  employee_number: string | null;
  is_active: boolean;
  competencies?: Array<{ id: string; status: string; cycle_id: string; skill?: { id: string; name: string } }>;
}

export interface VerificationCycle {
  id: string;
  name: string;
  cycle_type: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  totalSkills: number;
  completedSkills: number;
  pendingVerifications: number;
  progress: number;
}

export interface AgencySkill {
  id: string;
  name: string;
  description: string | null;
  category: string;
  certification_levels: string[];
  requires_annual_verification: boolean;
  is_required: boolean;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  performed_by: string | null;
  performed_by_name: string | null;
  new_values: Record<string, any> | null;
  old_values: Record<string, any> | null;
  created_at: string;
}

export interface PendingVerification {
  id: string;
  status: string;
  notes: string | null;
  updated_at: string;
  employee: { id: string; first_name: string; last_name: string; certification_level: string } | null;
  skill: { id: string; name: string; category: string } | null;
  cycle: { id: string; name: string } | null;
}

export interface AgencyStats {
  totalEmployees: number;
  activeEmployees: number;
  pendingVerifications: number;
  completedThisCycle: number;
  verificationRate: number;
  upcomingExpirations: number;
}

// ─── Generic fetcher hook ─────────────────────────────────────────────────────

function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsLoading(false);
    }
  }, [url]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, isLoading, error, refetch: fetch_ };
}

// ─── Employees ────────────────────────────────────────────────────────────────

export function useAgencyEmployees() {
  const { data, isLoading, error, refetch } = useFetch<AgencyEmployee[]>("/api/agency/employees");
  const employees = data ?? [];

  const createEmployee = async (input: {
    firstName: string; lastName: string; email?: string; phone?: string;
    certLevel: string; certNumber?: string; certExpiry?: string; employeeId?: string;
  }) => {
    const res = await fetch("/api/agency/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Failed to create employee");
    }
    await refetch();
    return res.json();
  };

  return { employees, isLoading, error, createEmployee, refetch };
}

// ─── Cycles ───────────────────────────────────────────────────────────────────

export function useAgencyCycles() {
  const { data, isLoading, error, refetch } = useFetch<VerificationCycle[]>("/api/agency/cycles");
  const cycles = data ?? [];

  const createCycle = async (input: {
    name: string; cycle_type: string; start_date: string; end_date: string; year?: number;
  }) => {
    const res = await fetch("/api/agency/cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Failed to create cycle");
    }
    await refetch();
    return res.json();
  };

  return { cycles, isLoading, error, createCycle, refetch };
}

// ─── Skills ───────────────────────────────────────────────────────────────────

export function useAgencySkills() {
  const { data, isLoading, error, refetch } = useFetch<AgencySkill[]>("/api/agency/skills");
  return { skills: data ?? [], isLoading, error, refetch };
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export function useAgencyAuditLog() {
  const { data, isLoading, error, refetch } = useFetch<AuditLogEntry[]>("/api/agency/audit-log");
  return { entries: data ?? [], isLoading, error, refetch };
}

// ─── Pending Verifications ────────────────────────────────────────────────────

export function useAgencyVerifications() {
  const { data, isLoading, error, refetch } = useFetch<PendingVerification[]>("/api/agency/verifications");

  const approveVerification = async (id: string) => {
    const res = await fetch(`/api/agency/verifications/${id}/approve`, { method: "POST" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Failed to approve");
    }
    await refetch();
  };

  const denyVerification = async (id: string, reason?: string) => {
    const res = await fetch(`/api/agency/verifications/${id}/deny`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Failed to deny");
    }
    await refetch();
  };

  return { verifications: data ?? [], isLoading, error, approveVerification, denyVerification, refetch };
}

// ─── Stats (Dashboard) ────────────────────────────────────────────────────────

export function useAgencyStats() {
  const { data, isLoading, error, refetch } = useFetch<{ stats: AgencyStats; recentActivity: AuditLogEntry[] }>("/api/agency/stats");
  return {
    stats: data?.stats ?? null,
    recentActivity: data?.recentActivity ?? [],
    isLoading,
    error,
    refetch,
  };
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export function useAgencySettings() {
  const { data, isLoading, error, refetch } = useFetch<Record<string, any>>("/api/agency/settings");

  const saveSettings = async (payload: Record<string, any>) => {
    const res = await fetch("/api/agency/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Failed to save settings");
    }
    await refetch();
    return res.json();
  };

  return { settings: data, isLoading, error, saveSettings, refetch };
}
