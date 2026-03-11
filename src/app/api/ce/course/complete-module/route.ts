import { createCEAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { enrollmentId, moduleId, courseId, ceUserId } = await request.json();

    if (!enrollmentId || !moduleId || !courseId || !ceUserId) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const supabase = createCEAdminClient();

    // Upsert module progress
    const now = new Date().toISOString();
    await supabase.from("ce_module_progress").upsert({
      enrollment_id: enrollmentId,
      module_id: moduleId,
      started_at: now,
      completed_at: now,
    }, { onConflict: "enrollment_id,module_id" });

    // Count total modules and completed modules for this enrollment
    const [totalRes, completedRes] = await Promise.all([
      supabase.from("ce_course_modules").select("id", { count: "exact", head: true }).eq("course_id", courseId),
      supabase.from("ce_module_progress").select("id", { count: "exact", head: true })
        .eq("enrollment_id", enrollmentId)
        .not("completed_at", "is", null),
    ]);

    const total = totalRes.count || 1;
    const completed = completedRes.count || 0;
    const progressPercentage = Math.round((completed / total) * 100);

    // Check if there's a quiz for this course — if not, completing all modules = completion
    const { data: quiz } = await supabase.from("ce_quizzes").select("id").eq("course_id", courseId).limit(1).single();
    const allDone = completed >= total;
    const completionStatus = allDone && !quiz ? "completed" : "in_progress";

    await supabase.from("ce_enrollments").update({
      progress_percentage: progressPercentage,
      completion_status: completionStatus,
      ...(completionStatus === "completed" ? { completed_at: now } : {}),
    }).eq("id", enrollmentId);

    return NextResponse.json({ progressPercentage, completionStatus });
  } catch {
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
