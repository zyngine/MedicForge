import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AgencyRole = "agency_admin" | "medical_director" | "field_supervisor";

interface AgencyAuthResult {
  userId: string;
  tenantId: string;
  agencyRole: AgencyRole;
  adminClient: ReturnType<typeof createAdminClient>;
}

/**
 * Authenticate an agency API request and return user context.
 * @param requiredRoles — if provided, the user must have one of these roles
 * @returns AgencyAuthResult or a NextResponse error
 */
export async function requireAgencyAuth(
  requiredRoles?: AgencyRole[]
): Promise<AgencyAuthResult | NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("users")
    .select("tenant_id, agency_role")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id || !profile.agency_role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (requiredRoles && !requiredRoles.includes(profile.agency_role as AgencyRole)) {
    return NextResponse.json({ error: `Forbidden — requires ${requiredRoles.join(" or ")}` }, { status: 403 });
  }

  return {
    userId: user.id,
    tenantId: profile.tenant_id,
    agencyRole: profile.agency_role as AgencyRole,
    adminClient,
  };
}

/** Type guard to check if auth result is an error response */
export function isAuthError(result: AgencyAuthResult | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
