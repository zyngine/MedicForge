import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

// Service-role client bypasses RLS — only used after verifying the requester is an admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the requester is an admin of their tenant
    const { data: requesterProfile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (profileError || !requesterProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (requesterProfile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden — admin role required" }, { status: 403 });
    }

    // Fetch all users for this tenant using service role (bypasses RLS)
    const { data: users, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id, email, full_name, role, avatar_url, is_active, created_at")
      .eq("tenant_id", requesterProfile.tenant_id)
      .order("created_at", { ascending: false });

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    return NextResponse.json({ users: users ?? [] });
  } catch (error) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the requester is an admin
    const { data: requesterProfile, error: profileError } = await supabaseAdmin
      .from("users")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (profileError || !requesterProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (requesterProfile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden — admin role required" }, { status: 403 });
    }

    const { userId, updates } = await request.json();

    if (!userId || !updates) {
      return NextResponse.json({ error: "Missing userId or updates" }, { status: 400 });
    }

    // Ensure the target user belongs to the same tenant
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from("users")
      .select("id, tenant_id")
      .eq("id", userId)
      .single();

    if (targetError || !targetUser || targetUser.tenant_id !== requesterProfile.tenant_id) {
      return NextResponse.json({ error: "User not found in your organization" }, { status: 404 });
    }

    // Only allow updating safe fields
    const allowedUpdates: Record<string, unknown> = {};
    if (updates.role && ["admin", "instructor", "student"].includes(updates.role)) {
      allowedUpdates.role = updates.role;
    }
    if (updates.full_name !== undefined) allowedUpdates.full_name = updates.full_name;
    if (updates.is_active !== undefined) allowedUpdates.is_active = updates.is_active;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("users")
      .update(allowedUpdates)
      .eq("id", userId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating user:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("PATCH /api/admin/users error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
