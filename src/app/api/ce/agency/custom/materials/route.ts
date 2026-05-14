import { NextResponse } from "next/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getAgencyAdmin() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;
  const admin = createCEAdminClient();
  const { data: ce } = await admin
    .from("ce_users")
    .select("id, role, agency_id")
    .eq("id", user.id)
    .single();
  if (!ce || ce.role !== "agency_admin" || !ce.agency_id) return null;
  return { userId: user.id as string, agencyId: ce.agency_id as string };
}

export async function POST(request: Request) {
  const ctx = await getAgencyAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { title, description, content_type, content_url, content_metadata } = body;
  if (!title || !content_type || !content_url) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!["pdf", "video_upload", "video_url", "scorm"].includes(content_type)) {
    return NextResponse.json({ error: "Invalid content_type" }, { status: 400 });
  }

  const admin = createCEAdminClient();
  const { data, error } = await admin
    .from("ce_custom_materials")
    .insert({
      agency_id: ctx.agencyId,
      title,
      description: description || null,
      content_type,
      content_url,
      content_metadata: content_metadata || {},
      created_by: ctx.userId,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ material: data });
}
