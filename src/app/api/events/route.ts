import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();
    if (!profile?.tenant_id) return NextResponse.json({ error: "No tenant" }, { status: 400 });

    const { data: events, error } = await supabase
      .from("events")
      .select("*, course:courses(id, title)")
      .eq("tenant_id", profile.tenant_id)
      .order("start_time", { ascending: true });

    if (error) throw error;
    return NextResponse.json(events ?? []);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();
    if (!profile?.tenant_id) return NextResponse.json({ error: "No tenant" }, { status: 400 });
    if (!["instructor", "admin"].includes(profile.role ?? "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, event_type, start_time, end_time, course_id, description, location } = body;

    if (!title || !start_time || !end_time || !course_id) {
      return NextResponse.json({ error: "title, start_time, end_time, and course_id are required" }, { status: 400 });
    }

    const { data: event, error } = await supabase
      .from("events")
      .insert({
        tenant_id: profile.tenant_id,
        course_id,
        title,
        event_type: event_type || "class",
        start_time,
        end_time,
        description: description || null,
        location: location || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(event, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
