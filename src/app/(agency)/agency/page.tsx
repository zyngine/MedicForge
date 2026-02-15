"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui";

export default function AgencyPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/agency/dashboard");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  );
}
