import { createClient } from "@/lib/supabase/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { courseId } = await request.json();

    if (!courseId) {
      return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
    }

    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createCEAdminClient();

    // Verify CE user exists and has accepted terms
    const { data: ceUser } = await admin
      .from("ce_users")
      .select("id, terms_accepted_at")
      .eq("id", user.id)
      .single();

    if (!ceUser) {
      return NextResponse.json({ error: "CE account not found" }, { status: 404 });
    }
    if (!ceUser.terms_accepted_at) {
      return NextResponse.json({ error: "Terms not accepted" }, { status: 403 });
    }

    // Check if already enrolled
    const { data: existing } = await admin
      .from("ce_enrollments")
      .select("id, completion_status, progress_percentage")
      .eq("user_id", ceUser.id)
      .eq("course_id", courseId)
      .single();

    if (existing) {
      return NextResponse.json(existing);
    }

    // Verify course is published
    const { data: course } = await admin
      .from("ce_courses")
      .select("id, status")
      .eq("id", courseId)
      .single();

    if (!course || course.status !== "published") {
      return NextResponse.json({ error: "Course not available" }, { status: 404 });
    }

    // Create enrollment
    const { data, error } = await admin
      .from("ce_enrollments")
      .insert({
        user_id: ceUser.id,
        course_id: courseId,
        completion_status: "enrolled",
        progress_percentage: 0,
      })
      .select("id, completion_status, progress_percentage")
      .single();

    if (error) {
      console.error("[CE Enroll]", error);
      return NextResponse.json({ error: "Failed to enroll" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[CE Enroll]", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
