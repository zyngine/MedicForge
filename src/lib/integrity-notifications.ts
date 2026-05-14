// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

import { sendEmail } from "@/lib/notifications/email-service";
import type { EmailTemplate } from "@/lib/notifications/email-templates";

interface FanOutArgs {
  admin: AnySupabase;
  attemptId: string;
  tenantId: string;
  studentUserId: string;
  baseUrl: string;
}

/**
 * When an exam attempt is auto-flagged for academic integrity concerns,
 * fan the alert out to:
 *   1. In-app notifications for every instructor on the course
 *   2. Email to those instructors via the existing email-service
 *
 * Idempotent-ish: we use a single notification link that opens the review
 * page, and we don't dedupe — but we only fire once per flush of events
 * that produced a flag.
 */
export async function notifyInstructorsOfFlag({
  admin,
  attemptId,
  tenantId,
  studentUserId,
  baseUrl,
}: FanOutArgs): Promise<{ notified: number }> {
  const { data: attempt } = await admin
    .from("exam_attempts")
    .select("id, exam_id")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt?.exam_id) return { notified: 0 };

  const { data: exam } = await admin
    .from("standardized_exams")
    .select("id, title, course_id")
    .eq("id", attempt.exam_id)
    .maybeSingle();
  if (!exam) return { notified: 0 };

  let instructorIds: string[] = [];
  if (exam.course_id) {
    const { data: course } = await admin
      .from("courses")
      .select("instructor_id")
      .eq("id", exam.course_id)
      .maybeSingle();
    if (course?.instructor_id) instructorIds.push(course.instructor_id);
    const { data: extras } = await admin
      .from("course_instructors")
      .select("instructor_id")
      .eq("course_id", exam.course_id);
    if (Array.isArray(extras)) {
      extras.forEach((r: { instructor_id: string }) => instructorIds.push(r.instructor_id));
    }
  }
  if (instructorIds.length === 0) {
    const { data: tenantAdmins } = await admin
      .from("users")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("role", "admin");
    instructorIds = (tenantAdmins || []).map((u: { id: string }) => u.id);
  }
  instructorIds = Array.from(new Set(instructorIds));
  if (instructorIds.length === 0) return { notified: 0 };

  const { data: student } = await admin
    .from("users")
    .select("first_name, last_name, email")
    .eq("id", studentUserId)
    .maybeSingle();
  const studentName = student
    ? `${student.first_name || ""} ${student.last_name || ""}`.trim() || student.email || "A student"
    : "A student";

  const link = `${baseUrl}/instructor/exams/integrity/${attemptId}`;
  const title = "Exam integrity flag";
  const message = `${studentName} was auto-flagged on "${exam.title}". Review the event timeline.`;

  // 1. In-app notifications.
  const notifRows = instructorIds.map((uid) => ({
    tenant_id: tenantId,
    user_id: uid,
    title,
    message,
    link,
  }));
  const { error: notifError } = await admin.from("notifications").insert(notifRows);
  if (notifError) {
    console.error("[integrity-notify] notification insert failed:", notifError.message);
  }

  // 2. Email to each instructor (best-effort, fire-and-forget).
  const { data: instructors } = await admin
    .from("users")
    .select("id, email, first_name")
    .in("id", instructorIds);
  await Promise.all(
    ((instructors || []) as { id: string; email: string; first_name: string | null }[]).map((u) => {
      if (!u.email) return Promise.resolve();
      const template: EmailTemplate = {
        subject: `Exam integrity flag — ${exam.title}`,
        html: `
          <p>Hi ${u.first_name || "there"},</p>
          <p><strong>${studentName}</strong> was auto-flagged on the exam <strong>${exam.title}</strong>.</p>
          <p>The integrity monitor detected enough suspicious activity (tab switches, copy/paste, devtools, or similar) to exceed the configured threshold.</p>
          <p><a href="${link}" style="display:inline-block;background:#dc2626;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">Review attempt</a></p>
          <p style="color:#6b7280;font-size:13px">You're receiving this because you're listed as an instructor for this course in MedicForge.</p>
        `.trim(),
        text: `Hi ${u.first_name || "there"},\n\n${studentName} was auto-flagged on the exam ${exam.title}.\n\nReview the attempt: ${link}\n\n— MedicForge`,
      };
      return sendEmail({ to: u.email, template }).catch((e) =>
        console.error("[integrity-notify] email failed:", e),
      );
    }),
  );

  return { notified: instructorIds.length };
}
