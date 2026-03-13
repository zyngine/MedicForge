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

    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminAny = admin as any;

    // Get user's tenant_id
    const { data: profile } = await admin
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 400 });
    }

    // Upsert calendar subscription (get existing or create new)
    const { data: existing } = await adminAny
      .from("calendar_subscriptions")
      .select("token")
      .eq("user_id", user.id)
      .eq("calendar_type", "clinical_shifts")
      .maybeSingle();

    let token: string;

    if (existing) {
      token = existing.token;
    } else {
      const { data: created } = await adminAny
        .from("calendar_subscriptions")
        .insert({
          user_id: user.id,
          tenant_id: profile.tenant_id,
          calendar_type: "clinical_shifts",
        })
        .select("token")
        .single();

      token = created.token;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.medicforge.net";
    const subscriptionUrl = `${appUrl}/api/calendar/${token}`;
    // webcal:// uses same URL but different scheme (triggers calendar app)
    const webcalUrl = subscriptionUrl.replace(/^https?:\/\//, "webcal://");

    return NextResponse.json({ token, subscriptionUrl, webcalUrl });
  } catch (err) {
    console.error("[Calendar Subscribe] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
