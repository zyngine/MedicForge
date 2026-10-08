import { NextResponse } from "next/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendCommitteeSetupEmail } from "@/lib/email-ce";

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

  // NOTE: auth.admin.generateLink() only *builds* the action link — Supabase
  // does not send an email for it. This route used to stop after the call and
  // report success, so the member never received anything. We generate the
  // recovery link (which works whether or not they already have a password, so
  // it doubles as "set your initial password") and deliver it ourselves.
  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: (member.email as string).toLowerCase(),
    options: { redirectTo: `${baseUrl}/ce/reset-password` },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const actionLink: string | undefined = linkData?.properties?.action_link;
  if (!actionLink) {
    return NextResponse.json({ error: "Failed to generate setup link" }, { status: 500 });
  }

  const sent = await sendCommitteeSetupEmail(
    member.email as string,
    actionLink,
    member.user_id as string,
  );

  if (!sent) {
    // Return the link rather than claiming success the member never saw.
    return NextResponse.json(
      {
        error: "Could not send the setup email. Share this link with the member directly.",
        setupLink: actionLink,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true });
}
