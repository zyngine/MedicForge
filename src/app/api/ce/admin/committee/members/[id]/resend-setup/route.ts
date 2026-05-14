import { NextResponse } from "next/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getCeAdmin() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;
  const admin = createCEAdminClient();
  const { data: ce } = await admin
    .from("ce_users")
    .select("id, role")
    .eq("id", user.id)
    .single();
  if (!ce || ce.role !== "admin") return null;
  return { userId: user.id as string };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getCeAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createCEAdminClient();
  const { data: member } = await admin
    .from("ce_committee_members")
    .select("id, user_id, email")
    .eq("id", id)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!member.user_id) {
    return NextResponse.json(
      { error: "Member has no linked account. Use 'Grant access' first." },
      { status: 400 },
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (request.headers.get("origin") ?? "https://medicforge.net");

  // generateLink with type='recovery' sends a password reset email through
  // Supabase's configured SMTP — works whether the user has a password yet
  // or not, so it doubles as a "set initial password" email for invitees.
  const { error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: (member.email as string).toLowerCase(),
    options: { redirectTo: `${baseUrl}/ce/reset-password` },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
