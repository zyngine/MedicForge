import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getInstructor() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from("users")
    .select("id, role, tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile || (profile.role !== "instructor" && profile.role !== "admin")) return null;
  return { userId: user.id as string, tenantId: profile.tenant_id as string };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await params;
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // RLS will scope to the caller's tenant.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supa as any)
    .from("lesson_attachments")
    .select("id, title, kind, file_url, mime_type, file_size, bunny_video_id, storage_path, order_index, created_at")
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ attachments: data || [] });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await params;
  const ctx = await getInstructor();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  // Verify the lesson belongs to this tenant.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lesson } = await (admin as any)
    .from("lessons")
    .select("id, tenant_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson || lesson.tenant_id !== ctx.tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { title, kind, file_url, mime_type, file_size, bunny_video_id, storage_path } = body;
  if (!title || !kind || !file_url) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!["pdf", "powerpoint", "word", "excel", "video_upload", "video_url", "other"].includes(kind)) {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingCount } = await (admin as any)
    .from("lesson_attachments")
    .select("id", { count: "exact", head: true })
    .eq("lesson_id", lessonId);
  const nextOrder = (existingCount as { count?: number } | null)?.count ?? 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("lesson_attachments")
    .insert({
      tenant_id: ctx.tenantId,
      lesson_id: lessonId,
      title: title.trim(),
      kind,
      file_url,
      mime_type: mime_type || null,
      file_size: file_size || null,
      bunny_video_id: bunny_video_id || null,
      storage_path: storage_path || null,
      order_index: nextOrder,
      uploaded_by: ctx.userId,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ attachment: data });
}
