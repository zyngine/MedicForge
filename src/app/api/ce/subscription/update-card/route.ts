import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { saveCardOnFile, updateSubscriptionCard, disableCard } from "@/lib/square-ce";
import crypto from "crypto";

// Update the payment card on file for an existing subscription.
// Creates a new card in Square, swaps it on the subscription, then disables the old card.
export async function POST(request: NextRequest) {
  try {
    const { sourceId } = await request.json();
    if (!sourceId) {
      return NextResponse.json({ error: "Missing card token" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin: any = createCEAdminClient();

    const { data: sub } = await admin
      .from("ce_user_subscriptions")
      .select("id, square_subscription_id, square_customer_id, square_card_id, status")
      .eq("user_id", user.id)
      .in("status", ["active", "past_due"])
      .maybeSingle();

    if (!sub || !sub.square_subscription_id || !sub.square_customer_id) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
    }

    const idempotencyKey = crypto
      .createHash("sha256")
      .update(user.id + sourceId + Math.floor(Date.now() / 3600000))
      .digest("hex")
      .slice(0, 32);

    // 1. Save the new card on file
    const { cardId: newCardId, lastFour, brand } = await saveCardOnFile({
      sourceId,
      customerId: sub.square_customer_id,
      idempotencyKey,
    });

    // 2. Swap it on the subscription
    await updateSubscriptionCard(sub.square_subscription_id, newCardId);

    // 3. Disable the old card (cleanup)
    const oldCardId = sub.square_card_id;
    if (oldCardId && oldCardId !== newCardId) {
      try {
        await disableCard(oldCardId);
      } catch {
        // Non-fatal — old card may already be invalid
      }
    }

    // 4. Update our record
    await admin
      .from("ce_user_subscriptions")
      .update({
        square_card_id: newCardId,
        card_last_four: lastFour,
        card_brand: brand,
      })
      .eq("id", sub.id);

    return NextResponse.json({ success: true, lastFour, brand });
  } catch (err) {
    console.error("[CE Update Card]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update card" },
      { status: 500 }
    );
  }
}
