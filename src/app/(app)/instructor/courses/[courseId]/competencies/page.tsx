"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui";

// Redirect to competencies page (course-level competencies are managed at instructor level)
export default function CourseCompetenciesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/instructor/outcomes");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  );
}
