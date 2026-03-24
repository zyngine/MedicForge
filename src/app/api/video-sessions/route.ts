// Video Sessions API - Create and list video sessions
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - List video sessions
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const courseId = searchParams.get("courseId");
    const status = searchParams.get("status");
    const upcoming = searchParams.get("upcoming");

    // Use type assertion to handle new tables
    let query = (supabase as any)
      .from("video_sessions")
      .select(`
        *,
        course:courses(id, title),
        creator:users!video_sessions_created_by_fkey(id, full_name)
      `)
      .order("scheduled_start", { ascending: true });

    if (courseId) {
      query = query.eq("course_id", courseId);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (upcoming === "true") {
      query = query
        .gte("scheduled_start", new Date().toISOString())
        .in("status", ["scheduled", "live"]);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Video Sessions] List error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sessions: data });
  } catch (error) {
    console.error("[Video Sessions] Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST - Create a new video session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("users")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "instructor"].includes(profile.role || "")) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      courseId,
      sessionType = "class",
      scheduledStart,
      scheduledEnd,
      timezone = "America/New_York",
      manualLink,
      videoPlatform,
    } = body;

    if (!title || !scheduledStart || !scheduledEnd) {
      return NextResponse.json(
        { error: "Missing required fields: title, scheduledStart, scheduledEnd" },
        { status: 400 }
      );
    }

    // Create video session record
    const { data: session, error: insertError } = await (supabase as any)
      .from("video_sessions")
      .insert({
        tenant_id: profile.tenant_id,
        course_id: courseId || null,
        created_by: user.id,
        title,
        description,
        session_type: sessionType,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        timezone,
        manual_link: manualLink || null,
        video_platform: videoPlatform || "other",
        status: "scheduled",
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Video Sessions] Insert error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("[Video Sessions] Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
