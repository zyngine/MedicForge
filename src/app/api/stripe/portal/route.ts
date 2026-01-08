import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/server";
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
    const { tenantId } = body as { tenantId: string };

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
      return NextResponse.json(
        { error: "Not authorized to manage this tenant" },
        { status: 403 }
      );
    }

    if (!tenant.stripe_customer_id) {
      return NextResponse.json(
        { error: "No billing account found. Please subscribe first." },
        { status: 400 }
      );
    }

    const stripe = getStripeClient();

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
