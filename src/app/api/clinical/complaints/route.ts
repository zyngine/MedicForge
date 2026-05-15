import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

const ALLOWED_CATEGORIES = ["behavior", "safety", "attendance", "communication", "other"] as const;
const ALLOWED_SUBJECTS = ["preceptor", "student", "site", "other"] as const;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin: AnyClient = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("role, tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile || (profile.role !== "instructor" && profile.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await admin
    .from("clinical_complaints")
    .select(
      "id, course_id, booking_id, filer_role, subject_type, subject_user_id, subject_name, category, description, is_anonymous, status, reviewed_by, reviewed_at, resolution_notes, created_at, updated_at, filer:filed_by_user_id(id, full_name, email)",
    )
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Strip filer info if anonymous and the requester isn't an admin? For now,
  // anonymous means non-admin instructors can see the complaint but not who
  // filed it. Admins always see everything. Cleanest impl: redact in the API.
  const redacted = (data || []).map((c: { is_anonymous: boolean; filer: unknown; filer_role: string }) => {
    if (c.is_anonymous && profile.role !== "admin") {
      return { ...c, filer: null };
    }
    return c;
  });

  return NextResponse.json({ complaints: redacted });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin: AnyClient = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("role, tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile?.tenant_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    course_id,
    booking_id,
    subject_type,
    subject_user_id,
    subject_name,
    category,
    description,
    is_anonymous,
  } = body;

  if (!ALLOWED_SUBJECTS.includes(subject_type)) {
    return NextResponse.json({ error: "Invalid subject_type" }, { status: 400 });
  }
  if (!ALLOWED_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!description || typeof description !== "string" || description.trim().length < 10) {
    return NextResponse.json(
      { error: "Description must be at least 10 characters" },
      { status: 400 },
    );
  }

  // Anonymous filing only available to students (so a preceptor can't anonymously
  // tank a student record without accountability).
  const safeAnonymous = profile.role === "student" ? !!is_anonymous : false;

  const { data, error } = await admin
    .from("clinical_complaints")
    .insert({
      tenant_id: profile.tenant_id,
      course_id: course_id || null,
      booking_id: booking_id || null,
      filed_by_user_id: user.id,
      filer_role: profile.role,
      subject_type,
      subject_user_id: subject_user_id || null,
      subject_name: subject_name?.trim() || null,
      category,
      description: description.trim(),
      is_anonymous: safeAnonymous,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ complaint: data });
}
