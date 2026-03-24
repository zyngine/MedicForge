import { createCEAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendCourseCompletionEmail } from "@/lib/email-ce";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { enrollmentId, quizId, courseId, ceUserId, answers } = await request.json();

    if (!enrollmentId || !quizId || !courseId || !ceUserId || !answers) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Auth check
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (ceUserId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const supabase = createCEAdminClient();

    // Load quiz settings
    const { data: quiz } = await supabase.from("ce_quizzes").select("passing_score, max_attempts").eq("id", quizId).single();
    if (!quiz) return NextResponse.json({ error: "Quiz not found." }, { status: 404 });

    // Check attempt count
    const { count: attemptCount } = await supabase
      .from("ce_quiz_attempts")
      .select("id", { count: "exact", head: true })
      .eq("enrollment_id", enrollmentId)
      .eq("quiz_id", quizId);

    if ((attemptCount || 0) >= quiz.max_attempts) {
      return NextResponse.json({ error: `Maximum of ${quiz.max_attempts} attempts reached.` }, { status: 400 });
    }

    const attemptNumber = (attemptCount || 0) + 1;

    // Load questions with correct answers
    const { data: questions } = await supabase
      .from("ce_quiz_questions")
      .select("id, correct_answer")
      .eq("quiz_id", quizId);

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: "No questions found." }, { status: 404 });
    }

    // Grade
    let correct = 0;
    for (const q of questions) {
      if (answers[q.id] === q.correct_answer) correct++;
    }
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= quiz.passing_score;
    const now = new Date().toISOString();

    // Record attempt
    await supabase.from("ce_quiz_attempts").insert({
      enrollment_id: enrollmentId,
      quiz_id: quizId,
      attempt_number: attemptNumber,
      started_at: now,
      completed_at: now,
      score,
      is_passing: passed,
      answers,
    });

    if (passed) {
      // Mark enrollment complete
      await supabase.from("ce_enrollments").update({
        completion_status: "completed",
        completed_at: now,
        progress_percentage: 100,
      }).eq("id", enrollmentId);

      // Get data needed for certificate
      const [enrollRes, courseRes, userRes] = await Promise.all([
        supabase.from("ce_enrollments").select("enrolled_at").eq("id", enrollmentId).single(),
        supabase.from("ce_courses").select("title, course_number, ceh_hours, is_capce_accredited, capce_course_number, expiration_months").eq("id", courseId).single(),
        supabase.from("ce_users").select("first_name, last_name, nremt_id, email").eq("id", ceUserId).single(),
      ]);

      const course = courseRes.data;
      const user = userRes.data;

      if (course && user) {
        // Generate certificate number: MF-YEAR-XXXXX
        const year = new Date().getFullYear();
        const certNumber = `MF-${year}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

        const expiresAt = course.expiration_months
          ? new Date(Date.now() + course.expiration_months * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
          : null;

        const verificationCode = crypto.randomBytes(16).toString("hex");

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
          is_capce_accredited: course.is_capce_accredited || false,
          capce_course_number: course.capce_course_number || null,
          verification_code: verificationCode,
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

    return NextResponse.json({ score, passed, attemptNumber, passingScore: quiz.passing_score });
  } catch {
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
