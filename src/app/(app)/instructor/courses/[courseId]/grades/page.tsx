"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui";

// Redirect to gradebook filtered by this course
export default function CourseGradesPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;

  useEffect(() => {
    router.replace(`/instructor/gradebook?course=${courseId}`);
  }, [router, courseId]);

  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  );
}
