import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest) {
  try {
    const { user_id, tenant_id, delete_from_auth = false } = await request.json();

    if (!user_id || !tenant_id) {
      return NextResponse.json(
        { error: "Missing required fields: user_id, tenant_id" },
        { status: 400 }
      );
    }

    // Verify the requesting user is an admin of this tenant
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin: any = createAdminClient();

    // Check if requester is admin of this tenant
    const { data: requesterProfile } = await supabaseAdmin
      .from("users")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (!requesterProfile || requesterProfile.tenant_id !== tenant_id || requesterProfile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized - must be tenant admin" }, { status: 403 });
    }

    // Prevent self-deletion
    if (user_id === user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    // Verify the user being deleted belongs to this tenant
    const { data: userToDelete } = await supabaseAdmin
      .from("users")
      .select("id, email, tenant_id")
      .eq("id", user_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (!userToDelete) {
      return NextResponse.json({ error: "User not found in this tenant" }, { status: 404 });
    }

    // Delete from users table first
    const { error: deleteUserError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", user_id)
      .eq("tenant_id", tenant_id);

    if (deleteUserError) {
      console.error("Failed to delete user from database:", deleteUserError);
      return NextResponse.json(
        { error: "Failed to delete user from database" },
        { status: 500 }
      );
    }

    // If requested, also delete from Supabase Auth
    // This is optional because the user might exist in other tenants
    if (delete_from_auth) {
      // Check if user exists in any other tenant
      const { data: otherTenantProfiles } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("id", user_id);

      // Only delete from auth if user has no other profiles
      if (!otherTenantProfiles || otherTenantProfiles.length === 0) {
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

        if (authDeleteError) {
          console.error("Failed to delete user from auth:", authDeleteError);
          // User is already removed from tenant, just warn about auth deletion failure
          return NextResponse.json({
            success: true,
            warning: "User removed from tenant but failed to delete from authentication system",
            auth_deleted: false,
          });
        }

        return NextResponse.json({
          success: true,
          message: "User completely deleted from system",
          auth_deleted: true,
        });
      } else {
        return NextResponse.json({
          success: true,
          message: "User removed from tenant (exists in other tenants, auth preserved)",
          auth_deleted: false,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "User removed from tenant",
      auth_deleted: false,
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
