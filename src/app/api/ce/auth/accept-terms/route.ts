import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const now = new Date().toISOString();

    const { error } = await adminClient
      .from("ce_users")
      .update({
        terms_accepted_at: now,
        privacy_accepted_at: now,
        updated_at: now,
      })
      .eq("id", user.id);

    if (error) {
      console.error("[CE Accept Terms] Error:", error);
      return NextResponse.json({ error: "Failed to record acceptance" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[CE Accept Terms] Unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
