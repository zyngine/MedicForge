import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_request: NextRequest) {
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
    if (!["agency_admin", "medical_director"].includes(profile.agency_role ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Return tenant-specific skills AND system defaults
    const { data, error } = await supabase
      .from("skill_library")
      .select("*")
      .or(`tenant_id.eq.${profile.tenant_id},is_system_default.eq.true`)
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("display_order", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id || profile.agency_role !== "agency_admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, category, skill_code, certification_levels, is_required } = body;

    if (!name || !category) {
      return NextResponse.json({ error: "Name and category are required" }, { status: 400 });
    }

    const { data: skill, error } = await adminClient
      .from("skill_library")
      .insert({
        tenant_id: profile.tenant_id,
        name,
        description: description || "",
        category,
        skill_code: skill_code || "",
        certification_levels: certification_levels || [],
        is_required: is_required ?? true,
        is_system_default: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await adminClient.from("agency_audit_log").insert({
      tenant_id: profile.tenant_id,
      action: "skill_created",
      entity_type: "skill",
      entity_id: skill.id,
      performed_by: user.id,
      new_values: { name, category },
    });

    return NextResponse.json({ skill });
  } catch (error) {
    console.error("POST /api/agency/skills error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
