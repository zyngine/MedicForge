import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import Stripe from "stripe";

// Use service role for webhook (no user context)
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ThinEvent {
  id: string;
  object: string;
  type: string;
  livemode: boolean;
  created: string;
  related_object?: { id: string; type: string; url: string };
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const stripe = getStripeClient();

  // Parse the body to check event type before signature verification
  let parsedBody: ThinEvent;
  try {
    parsedBody = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // V2 thin events have v1. or v2. prefixed types
  const isThinEvent = parsedBody.type?.startsWith("v1.") || parsedBody.type?.startsWith("v2.");

  try {
    // Verify signature using Stripe's method
    stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    // Handle V2 ping events
    if (parsedBody.type === "v2.core.event_destination.ping") {
      return NextResponse.json({ received: true, message: "pong" });
    }

    // Handle thin events (V2 webhooks)
    if (isThinEvent) {
      await handleThinEvent(stripe, parsedBody);
      return NextResponse.json({ received: true });
    }

    // Handle V1 snapshot events - re-parse as Stripe.Event
    const event = JSON.parse(body) as Stripe.Event;
    await handleSnapshotEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function handleThinEvent(stripe: Stripe, thinEvent: ThinEvent) {
  switch (thinEvent.type) {
    case "v1.checkout.session.completed": {
      const session = await stripe.checkout.sessions.retrieve(
        thinEvent.related_object!.id
      );
      await handleCheckoutCompleted(session);
      break;
    }

    case "v1.customer.subscription.created":
    case "v1.customer.subscription.updated": {
      const subscription = await stripe.subscriptions.retrieve(
        thinEvent.related_object!.id
      );
      await handleSubscriptionUpdate(subscription);
      break;
    }

    case "v1.customer.subscription.deleted": {
      const subscription = await stripe.subscriptions.retrieve(
        thinEvent.related_object!.id
      );
      await handleSubscriptionDeleted(subscription);
      break;
    }

    case "v1.invoice.payment_succeeded": {
      const invoice = await stripe.invoices.retrieve(
        thinEvent.related_object!.id
      );
      await handleInvoicePaymentSucceeded(invoice);
      break;
    }

    case "v1.invoice.payment_failed": {
      const invoice = await stripe.invoices.retrieve(
        thinEvent.related_object!.id
      );
      await handleInvoicePaymentFailed(invoice);
      break;
    }

    default:
      console.log(`Unhandled thin event type: ${thinEvent.type}`);
  }
}

async function handleSnapshotEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdate(subscription);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentSucceeded(invoice);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentFailed(invoice);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const tenantId = session.metadata?.tenant_id;
  const tier = session.metadata?.tier;

  if (!tenantId || !tier) {
    console.error("Missing metadata in checkout session");
    return;
  }

  // Update tenant with subscription info
  await supabase
    .from("tenants")
    .update({
      stripe_subscription_id: session.subscription as string,
      subscription_tier: tier as "free" | "pro" | "institution" | "enterprise",
      subscription_status: "active",
      trial_ends_at: null,
    })
    .eq("id", tenantId);

  // Record in subscription history
  await supabase.from("subscription_history").insert({
    tenant_id: tenantId,
    tier: tier as "free" | "pro" | "institution" | "enterprise",
    started_at: new Date().toISOString(),
    stripe_invoice_id: session.invoice as string,
  });

  console.log(`Subscription activated for tenant ${tenantId}: ${tier}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata?.tenant_id;

  if (!tenantId) {
    // Try to find tenant by subscription ID
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("stripe_subscription_id", subscription.id)
      .single();

    if (!tenant) {
      console.error("Could not find tenant for subscription:", subscription.id);
      return;
    }
  }

  const status = mapStripeStatus(subscription.status);

  await supabase
    .from("tenants")
    .update({
      subscription_status: status,
    })
    .eq("stripe_subscription_id", subscription.id);

  console.log(`Subscription updated: ${subscription.id} -> ${status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Downgrade to free tier
  await supabase
    .from("tenants")
    .update({
      subscription_tier: "free",
      subscription_status: "canceled",
      stripe_subscription_id: null,
    })
    .eq("stripe_subscription_id", subscription.id);

  // Close subscription history
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  if (tenant) {
    await supabase
      .from("subscription_history")
      .update({ ended_at: new Date().toISOString() })
      .eq("tenant_id", tenant.id)
      .is("ended_at", null);
  }

  console.log(`Subscription canceled: ${subscription.id}`);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Get subscription ID from the invoice using type assertion
  const invoiceData = invoice as unknown as { subscription?: string | { id: string } | null };
  const subscriptionId = typeof invoiceData.subscription === 'string'
    ? invoiceData.subscription
    : invoiceData.subscription?.id;

  if (!subscriptionId) return;

  // Update subscription status to active
  await supabase
    .from("tenants")
    .update({
      subscription_status: "active",
    })
    .eq("stripe_subscription_id", subscriptionId);

  console.log(`Payment succeeded for subscription: ${subscriptionId}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // Get subscription ID from the invoice using type assertion
  const invoiceData = invoice as unknown as { subscription?: string | { id: string } | null };
  const subscriptionId = typeof invoiceData.subscription === 'string'
    ? invoiceData.subscription
    : invoiceData.subscription?.id;

  if (!subscriptionId) return;

  // Update subscription status to past_due
  await supabase
    .from("tenants")
    .update({
      subscription_status: "past_due",
    })
    .eq("stripe_subscription_id", subscriptionId);

  console.log(`Payment failed for subscription: ${subscriptionId}`);
}

function mapStripeStatus(
  status: Stripe.Subscription.Status
): "active" | "canceled" | "past_due" | "trialing" {
  switch (status) {
    case "active":
      return "active";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    case "past_due":
    case "incomplete":
      return "past_due";
    case "trialing":
      return "trialing";
    default:
      return "active";
  }
}
