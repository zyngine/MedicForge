import { NextRequest, NextResponse } from "next/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/square-ce";

const GRACE_PERIOD_DAYS = 7;

export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get("x-square-hmacsha256-signature") || "";
    const notificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.medicforge.net"}/api/ce/webhooks/square`;

    const isValid = await verifyWebhookSignature(body, signature, notificationUrl);
    if (!isValid) {
      console.warn("[Square Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);
    const eventId = event.event_id;
    const eventType = event.type;

    if (!eventId || !eventType) {
      return NextResponse.json({ error: "Malformed event" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin: any = createCEAdminClient();

    // Idempotency: record event and skip if already processed
    const { data: existing } = await admin
      .from("ce_square_webhook_events")
      .select("id, processed_at")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existing?.processed_at) {
      return NextResponse.json({ success: true, duplicate: true });
    }

    if (!existing) {
      await admin.from("ce_square_webhook_events").insert({
        event_id: eventId,
        event_type: eventType,
        payload: event,
      });
    }

    try {
      await handleEvent(admin, event);
      await admin
        .from("ce_square_webhook_events")
        .update({ processed_at: new Date().toISOString(), error: null })
        .eq("event_id", eventId);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("[Square Webhook] Handler error:", errMsg);
      await admin
        .from("ce_square_webhook_events")
        .update({ error: errMsg })
        .eq("event_id", eventId);
      // Return 200 so Square doesn't retry malformed data, but log the error
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Square Webhook] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleEvent(admin: any, event: any) {
  const type = event.type;
  const obj = event.data?.object;
  if (!obj) return;

  switch (type) {
    case "subscription.created":
    case "subscription.updated": {
      const sub = obj.subscription;
      if (!sub?.id) return;

      const updates: Record<string, unknown> = {};
      if (sub.status) updates.status = mapSquareStatus(sub.status);
      if (sub.charged_through_date) updates.next_billing_at = sub.charged_through_date;
      if (sub.canceled_date) {
        updates.canceled_at = sub.canceled_date;
        updates.auto_renew = false;
      }

      await admin
        .from("ce_user_subscriptions")
        .update(updates)
        .eq("square_subscription_id", sub.id);
      break;
    }

    case "invoice.payment_made": {
      const invoice = obj.invoice;
      const subscriptionId = invoice?.subscription_id;
      if (!subscriptionId) return;

      // Payment succeeded — extend expiration, clear grace period, mark active
      const paidAt = invoice.primary_recipient?.updated_at || new Date().toISOString();
      const nextExpiration = new Date();
      nextExpiration.setFullYear(nextExpiration.getFullYear() + 1);

      await admin
        .from("ce_user_subscriptions")
        .update({
          status: "active",
          last_payment_at: paidAt,
          expires_at: nextExpiration.toISOString().slice(0, 10),
          grace_period_ends_at: null,
        })
        .eq("square_subscription_id", subscriptionId);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = obj.invoice;
      const subscriptionId = invoice?.subscription_id;
      if (!subscriptionId) return;

      // Enter grace period — user still has access for 7 days
      const graceEnd = new Date();
      graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS);

      await admin
        .from("ce_user_subscriptions")
        .update({
          status: "past_due",
          grace_period_ends_at: graceEnd.toISOString(),
        })
        .eq("square_subscription_id", subscriptionId);

      // TODO: trigger "payment failed, update card" email
      break;
    }

    case "invoice.canceled": {
      const invoice = obj.invoice;
      const subscriptionId = invoice?.subscription_id;
      if (!subscriptionId) return;

      await admin
        .from("ce_user_subscriptions")
        .update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
          auto_renew: false,
        })
        .eq("square_subscription_id", subscriptionId);
      break;
    }

    default:
      // Unhandled event type — logged but no action
      break;
  }
}

function mapSquareStatus(squareStatus: string): string {
  // Square statuses: ACTIVE, PAUSED, CANCELED, DEACTIVATED, PENDING
  switch (squareStatus) {
    case "ACTIVE": return "active";
    case "PAUSED": return "paused";
    case "CANCELED":
    case "DEACTIVATED": return "canceled";
    case "PENDING": return "pending";
    default: return squareStatus.toLowerCase();
  }
}
