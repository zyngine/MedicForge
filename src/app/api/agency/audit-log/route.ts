import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (profile.agency_role !== "agency_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const VALID_ACTIONS = [
      "verification_approved", "verification_rejected",
      "employee_added", "employee_deactivated",
      "skill_updated", "skill_created",
      "cycle_created", "settings_updated",
    ];

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);

    if (action && !VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid action filter" }, { status: 400 });
    }

    let query = supabase
      .from("agency_audit_log")
      .select("*")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (action) query = query.eq("action", action);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
