import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

interface StudentImportRow {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  certification_level?: string;
  student_id?: string;
  cohort?: string;
  start_date?: string;
  expected_graduation?: string;
}

interface ImportResult {
  identifier: string;
  success: boolean;
  error?: string;
  invited?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { students, tenant_id } = await request.json();

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { error: "No students provided" },
        { status: 400 }
      );
    }

    if (!tenant_id) {
      return NextResponse.json(
        { error: "Tenant ID is required" },
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

    if (!requesterProfile || requesterProfile.tenant_id !== tenant_id ||
        !["admin", "instructor"].includes(requesterProfile.role || "")) {
      return NextResponse.json(
        { error: "Unauthorized - must be tenant admin or instructor" },
        { status: 403 }
      );
    }

    const results: ImportResult[] = [];

    for (const student of students as StudentImportRow[]) {
      const email = student.email?.trim().toLowerCase();
      const fullName = `${student.first_name?.trim() || ""} ${student.last_name?.trim() || ""}`.trim();

      try {
        // Check if user already exists in this tenant
        const { data: existingUser } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("email", email)
          .eq("tenant_id", tenant_id)
          .single();

        if (existingUser) {
          results.push({
            identifier: email,
            success: false,
            error: "User already exists in this organization",
          });
          continue;
        }

        // Check if email exists in auth (might be in another tenant)
        const { data: { users: filteredUsers } } = await supabaseAdmin.auth.admin.listUsers({
          filter: email,
        });
        const existingAuthUser = filteredUsers?.find(
          (u: any) => u.email?.toLowerCase() === email
        );

        let authUserId: string;
        let invited = false;

        if (existingAuthUser) {
          // User exists in auth but not in this tenant
          authUserId = existingAuthUser.id;
        } else {
          // Create new auth user with invite
          const { data: inviteData, error: inviteError } =
            await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
              data: {
                full_name: fullName,
                role: "student",
                tenant_id,
              },
              redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.medicforge.net"}/auth/callback`,
            });

          if (inviteError) {
            results.push({
              identifier: email,
              success: false,
              error: inviteError.message,
            });
            continue;
          }

          if (!inviteData.user) {
            results.push({
              identifier: email,
              success: false,
              error: "Failed to create user invitation",
            });
            continue;
          }

          authUserId = inviteData.user.id;
          invited = true;
        }

        // Create user profile in users table
        const { error: insertError } = await supabaseAdmin.from("users").insert({
          id: authUserId,
          tenant_id,
          email,
          full_name: fullName,
          role: "student",
          phone: student.phone?.trim() || null,
          is_active: true,
        });

        if (insertError) {
          results.push({
            identifier: email,
            success: false,
            error: insertError.message,
          });
          continue;
        }

        results.push({
          identifier: email,
          success: true,
          invited,
        });
      } catch (err) {
        results.push({
          identifier: email,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: students.length,
        imported: successCount,
        failed: failedCount,
      },
    });
  } catch (error) {
    console.error("Student import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
