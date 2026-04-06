import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Verify the user is a platform admin
async function verifyPlatformAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const adminClient = createAdminClient();
  const { data: isPlatformAdmin } = await adminClient
    .from("platform_admins")
    .select("id")
    .eq("user_id", user.id)
    .single();

  return !!isPlatformAdmin;
}

// PATCH - Update tenant subscription
export async function PATCH(request: Request) {
  console.log("[Platform Admin API] Updating tenant subscription");

  try {
    // Verify platform admin
    const isAdmin = await verifyPlatformAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Platform admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tenantId, subscription_tier, subscription_status, payment_method, subscription_notes, trial_ends_at, slug } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Validate and check slug uniqueness if provided
    if (slug !== undefined) {
      const slugRegex = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
      if (!slugRegex.test(slug)) {
        return NextResponse.json(
          { error: "Slug must be 3–50 characters: lowercase letters, numbers, and hyphens only (cannot start or end with a hyphen)" },
          { status: 400 }
        );
      }
      // Check uniqueness — exclude current tenant
      const { data: existing } = await adminClient
        .from("tenants")
        .select("id")
        .eq("slug", slug)
        .neq("id", tenantId)
        .single();
      if (existing) {
        return NextResponse.json(
          { error: `The slug "${slug}" is already taken by another tenant` },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (slug !== undefined) updateData.slug = slug;
    if (subscription_tier !== undefined) {
      updateData.subscription_tier = subscription_tier;
    }
    if (subscription_status !== undefined) {
      updateData.subscription_status = subscription_status;
    }
    if (payment_method !== undefined) {
      updateData.payment_method = payment_method;
    }
    if (subscription_notes !== undefined) {
      updateData.subscription_notes = subscription_notes;
    }
    if (trial_ends_at !== undefined) {
      updateData.trial_ends_at = trial_ends_at;
    }

    const { data, error } = await adminClient
      .from("tenants")
      .update(updateData)
      .eq("id", tenantId)
      .select()
      .single();

    if (error) {
      console.error("[Platform Admin API] Update error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    console.log("[Platform Admin API] Tenant updated successfully:", data.id);

    return NextResponse.json({ success: true, tenant: data });
  } catch (err) {
    console.error("[Platform Admin API] Unexpected error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

// GET - List all tenants (for platform admins)
export async function GET() {
  try {
    const isAdmin = await verifyPlatformAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Platform admin access required" },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tenants: data });
  } catch (err) {
    console.error("[Platform Admin API] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
