import { createCEAdminClient } from "@/lib/supabase/admin";
import { sendCourseCompletionEmail } from "@/lib/email-ce";
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

    // Issue certificate for quiz-free courses on completion
    if (completionStatus === "completed") {
      const { data: existingCert } = await supabase
        .from("ce_certificates")
        .select("id")
        .eq("enrollment_id", enrollmentId)
        .limit(1)
        .single();

      if (!existingCert) {
        const [courseRes, userRes] = await Promise.all([
          supabase.from("ce_courses").select("title, course_number, ceh_hours, capce_approved, expiration_months").eq("id", courseId).single(),
          supabase.from("ce_users").select("first_name, last_name, nremt_id, email").eq("id", ceUserId).single(),
        ]);

        const course = courseRes.data;
        const user = userRes.data;

        if (course && user) {
          const year = new Date().getFullYear();
          const rand = String(Math.floor(10000 + Math.random() * 90000));
          const certNumber = `MF-${year}-${rand}`;
          const expiresAt = course.expiration_months
            ? new Date(Date.now() + course.expiration_months * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
            : null;

          await supabase.from("ce_certificates").insert({
            enrollment_id: enrollmentId,
            user_id: ceUserId,
            course_id: courseId,
            certificate_number: certNumber,
            issued_at: now,
            expires_at: expiresAt,
            user_name: `${user.first_name} ${user.last_name}`.trim(),
            user_nremt_id: user.nremt_id || null,
            course_title: course.title,
            course_number: course.course_number || certNumber,
            ceh_hours: course.ceh_hours,
            completion_date: now.split("T")[0],
            is_capce_accredited: course.capce_approved || false,
          });

          if (user.email) {
            try {
              await sendCourseCompletionEmail(user.email, user.first_name, course.title, course.ceh_hours, certNumber, expiresAt);
            } catch (e) {
              console.error("[CE Email] Completion email failed:", e);
            }
          }
        }
      }
    }

    return NextResponse.json({ progressPercentage, completionStatus });
  } catch {
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
