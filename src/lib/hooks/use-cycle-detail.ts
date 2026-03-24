"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface CycleEmployee {
  id: string;
  first_name: string;
  last_name: string;
  certification_level: string;
  is_active: boolean;
  total: number;
  verified: number;
  pending: number;
  failed: number;
  completion: number;
}

interface CycleDetail {
  cycle: {
    id: string;
    name: string;
    cycle_type: string;
    year: number;
    start_date: string;
    end_date: string;
    is_active: boolean;
    is_locked: boolean;
  };
  employees: CycleEmployee[];
  stats: {
    totalCompetencies: number;
    verified: number;
    pending: number;
    completion: number;
    employeeCount: number;
  };
}

export function useCycleDetail(cycleId: string | undefined) {
  return useQuery({
    queryKey: ["cycle-detail", cycleId],
    queryFn: async (): Promise<CycleDetail> => {
      const res = await fetch(`/api/agency/cycles/${cycleId}`);
      if (!res.ok) throw new Error("Failed to fetch cycle");
      return res.json();
    },
    enabled: !!cycleId,
  });
}

export function useGenerateCompetencies(cycleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input?: { employee_ids?: string[]; skill_ids?: string[] }) => {
      const res = await fetch(`/api/agency/cycles/${cycleId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input || {}),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-detail", cycleId] });
      queryClient.invalidateQueries({ queryKey: ["agency-cycles"] });
    },
  });
}

export function useLockCycle(cycleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locked: boolean) => {
      const res = await fetch(`/api/agency/cycles/${cycleId}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-detail", cycleId] });
      queryClient.invalidateQueries({ queryKey: ["agency-cycles"] });
    },
  });
}
