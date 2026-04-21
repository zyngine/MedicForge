import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { cancelSubscription } from "@/lib/square-ce";

// Cancel a subscription. Per policy: access continues until the end of the
// paid period (charged_through_date), then doesn't renew.
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin: any = createCEAdminClient();

    const { data: sub } = await admin
      .from("ce_user_subscriptions")
      .select("id, square_subscription_id, status, expires_at")
      .eq("user_id", user.id)
      .in("status", ["active", "past_due"])
      .maybeSingle();

    if (!sub) {
      return NextResponse.json({ error: "No active subscription to cancel" }, { status: 404 });
    }

    if (!sub.square_subscription_id) {
      return NextResponse.json({ error: "Cannot cancel — subscription has no Square ID" }, { status: 400 });
    }

    // Tell Square to cancel at period end
    const { chargedThroughDate } = await cancelSubscription(sub.square_subscription_id);

    // Update our record — user keeps access until expires_at / chargedThroughDate
    await admin
      .from("ce_user_subscriptions")
      .update({
        auto_renew: false,
        canceled_at: new Date().toISOString(),
        // Keep status "active" — they still have access until period ends
        // Webhook will eventually flip to canceled when Square deactivates
      })
      .eq("id", sub.id);

    return NextResponse.json({
      success: true,
      accessUntil: chargedThroughDate || sub.expires_at,
    });
  } catch (err) {
    console.error("[CE Cancel Subscription]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cancellation failed" },
      { status: 500 }
    );
  }
}
