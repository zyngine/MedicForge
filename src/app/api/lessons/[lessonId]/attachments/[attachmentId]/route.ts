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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ lessonId: string; attachmentId: string }> },
) {
  const { lessonId, attachmentId } = await params;
  const ctx = await getInstructor();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: att } = await (admin as any)
    .from("lesson_attachments")
    .select("id, tenant_id, storage_path")
    .eq("id", attachmentId)
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (!att || att.tenant_id !== ctx.tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (att.storage_path) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).storage.from("lesson-materials").remove([att.storage_path]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("lesson_attachments")
    .delete()
    .eq("id", attachmentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
