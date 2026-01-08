import { NextRequest, NextResponse } from "next/server";
import { getStripeClient, PRICE_IDS, PriceTier } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tier, tenantId } = body as { tier: PriceTier; tenantId: string };

    if (!tier || !PRICE_IDS[tier]) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });
    }

    // Get tenant info
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Check if user is admin of this tenant
    const { data: userProfile } = await supabase
      .from("users")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (userProfile?.tenant_id !== tenantId || userProfile?.role !== "admin") {
      return NextResponse.json({ error: "Not authorized to manage this tenant" }, { status: 403 });
    }

    const stripe = getStripeClient();

    // Create or get Stripe customer
    let customerId = tenant.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: tenant.name,
        metadata: {
          tenant_id: tenantId,
        },
      });
      customerId = customer.id;

      // Save customer ID to tenant
      await supabase
        .from("tenants")
        .update({ stripe_customer_id: customerId })
        .eq("id", tenantId);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: PRICE_IDS[tier],
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing?canceled=true`,
      metadata: {
        tenant_id: tenantId,
        tier,
      },
      subscription_data: {
        metadata: {
          tenant_id: tenantId,
          tier,
        },
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
