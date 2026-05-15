import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

const ALLOWED_STATUSES = ["open", "reviewed", "resolved", "dismissed"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  const body = await request.json();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (typeof body.status === "string") {
    if (!ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = body.status;
    if (body.status !== "open") {
      update.reviewed_by = user.id;
      update.reviewed_at = new Date().toISOString();
    }
  }
  if (typeof body.resolution_notes === "string") {
    update.resolution_notes = body.resolution_notes.trim() || null;
  }

  const { error } = await admin
    .from("clinical_complaints")
    .update(update)
    .eq("id", id)
    .eq("tenant_id", profile.tenant_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
