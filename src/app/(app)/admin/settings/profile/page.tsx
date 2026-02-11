"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui";

// Redirect to the main organization page
export default function ProfileSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/organization");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  );
}
