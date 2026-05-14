import { NextResponse } from "next/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendCourseAssignmentEmail } from "@/lib/email-ce";

interface AssignTarget {
  target_type: "user" | "certification" | "all_agency";
  target_value?: string | null;
}

async function getAgencyAdmin() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;
  const admin = createCEAdminClient();
  const { data: ce } = await admin
    .from("ce_users")
    .select("id, role, agency_id, first_name, last_name")
    .eq("id", user.id)
    .single();
  if (!ce || ce.role !== "agency_admin" || !ce.agency_id) return null;
  return {
    userId: user.id as string,
    agencyId: ce.agency_id as string,
    fullName: `${ce.first_name || ""} ${ce.last_name || ""}`.trim(),
  };
}

export async function POST(request: Request) {
  const ctx = await getAgencyAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { course_id, targets, due_date } = body as {
    course_id: string;
    targets: AssignTarget[];
    due_date?: string | null;
  };

  if (!course_id) return NextResponse.json({ error: "Missing course_id" }, { status: 400 });
  if (!Array.isArray(targets) || targets.length === 0) {
    return NextResponse.json({ error: "No targets provided" }, { status: 400 });
  }
  for (const t of targets) {
    if (!["user", "certification", "all_agency"].includes(t.target_type)) {
      return NextResponse.json({ error: "Invalid target_type" }, { status: 400 });
    }
  }

  const admin = createCEAdminClient();

  // Confirm agency tier covers the catalog. Otherwise agency assignment makes no sense
  // (employees would hit a paywall on enroll).
  const { data: agency } = await admin
    .from("ce_agencies")
    .select("id, name, subscription_tier")
    .eq("id", ctx.agencyId)
    .single();
  if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });
  const tier = agency.subscription_tier;
  if (!(tier === "enterprise" || tier === "enterprise_plus" || tier === "custom")) {
    return NextResponse.json(
      { error: "Course assignment requires an Enterprise subscription. Please upgrade to assign CE courses to employees." },
      { status: 402 },
    );
  }

  // Verify course is published.
  const { data: course } = await admin
    .from("ce_courses")
    .select("id, title, status")
    .eq("id", course_id)
    .maybeSingle();
  if (!course || course.status !== "published") {
    return NextResponse.json({ error: "Course not available" }, { status: 404 });
  }

  // Resolve all target rules to a unique set of user IDs (agency members only).
  const userIds = new Set<string>();
  for (const t of targets) {
    if (t.target_type === "all_agency") {
      const { data: all } = await admin
        .from("ce_users")
        .select("id")
        .eq("agency_id", ctx.agencyId);
      (all || []).forEach((u: { id: string }) => userIds.add(u.id));
    } else if (t.target_type === "certification" && t.target_value) {
      const { data: byCert } = await admin
        .from("ce_users")
        .select("id")
        .eq("agency_id", ctx.agencyId)
        .eq("certification_level", t.target_value);
      (byCert || []).forEach((u: { id: string }) => userIds.add(u.id));
    } else if (t.target_type === "user" && t.target_value) {
      // Sanity-check the user belongs to the agency before assigning.
      const { data: u } = await admin
        .from("ce_users")
        .select("id")
        .eq("id", t.target_value)
        .eq("agency_id", ctx.agencyId)
        .maybeSingle();
      if (u) userIds.add(u.id);
    }
  }

  const userIdList = Array.from(userIds);
  if (userIdList.length === 0) {
    return NextResponse.json({ error: "No matching employees" }, { status: 400 });
  }

  // Find users who don't already have an enrollment for this course; create one
  // for each. Existing enrollments are left alone (we don't overwrite progress).
  const { data: existing } = await admin
    .from("ce_enrollments")
    .select("user_id")
    .eq("course_id", course_id)
    .in("user_id", userIdList);
  const alreadyEnrolled = new Set<string>(
    ((existing || []) as { user_id: string }[]).map((e) => e.user_id),
  );
  const newUserIds = userIdList.filter((id) => !alreadyEnrolled.has(id));

  if (newUserIds.length > 0) {
    const rows = newUserIds.map((uid) => ({
      user_id: uid,
      course_id,
      assigned_by: ctx.userId,
      assigned_at: new Date().toISOString(),
      due_date: due_date || null,
      completion_status: "enrolled",
      progress_percentage: 0,
    }));
    const { error: insertErr } = await admin.from("ce_enrollments").insert(rows);
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Update due_date on existing enrollments if the admin chose one and it differs.
  if (due_date && alreadyEnrolled.size > 0) {
    await admin
      .from("ce_enrollments")
      .update({ due_date, assigned_by: ctx.userId, assigned_at: new Date().toISOString() })
      .eq("course_id", course_id)
      .in("user_id", Array.from(alreadyEnrolled));
  }

  // In-app notifications for every user (new + existing) so they all see the assignment.
  const notifRows = userIdList.map((uid) => ({
    user_id: uid,
    type: "course_assigned",
    title: `${agency.name} assigned: ${course.title}`,
    message: due_date
      ? `Due ${new Date(due_date).toLocaleDateString()}`
      : "Open My Training to get started.",
    link: `/ce/course/${course_id}`,
  }));
  await admin.from("ce_notifications").insert(notifRows);

  // Fire-and-forget emails. Look up first names + emails in one query.
  const { data: profiles } = await admin
    .from("ce_users")
    .select("id, first_name, email")
    .in("id", userIdList);
  await Promise.all(
    ((profiles || []) as { id: string; first_name: string | null; email: string }[]).map((p) =>
      sendCourseAssignmentEmail(
        p.email,
        p.first_name || "there",
        course.title,
        course.id,
        agency.name,
        due_date || null,
        p.id,
      ).catch((e) => console.error("[CE Assign Email]", e)),
    ),
  );

  return NextResponse.json({
    success: true,
    enrolled: newUserIds.length,
    already_enrolled: alreadyEnrolled.size,
    total_targeted: userIdList.length,
  });
}
