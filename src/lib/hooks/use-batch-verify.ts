"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useBatchVerify() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { competency_ids: string[]; verification_method?: string; notes?: string }) => {
      const res = await fetch("/api/agency/verifications/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to batch verify");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-detail"] });
      queryClient.invalidateQueries({ queryKey: ["agency-verifications"] });
      queryClient.invalidateQueries({ queryKey: ["employee-competencies"] });
    },
  });
}
