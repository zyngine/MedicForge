// Video Sessions API - Create and list video sessions
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createMeeting, refreshAccessToken } from "@/lib/zoom";

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
      useZoom = true,
      manualLink,
      videoPlatform,
    } = body;

    if (!title || !scheduledStart || !scheduledEnd) {
      return NextResponse.json(
        { error: "Missing required fields: title, scheduledStart, scheduledEnd" },
        { status: 400 }
      );
    }

    let zoomMeetingId = null;
    let zoomMeetingUuid = null;
    let joinUrl = null;
    let startUrl = null;
    let password = null;

    // If using Zoom, create the meeting
    if (useZoom) {
      // Get user's Zoom connection
      const { data: zoomConnection } = await (supabase as any)
        .from("zoom_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (!zoomConnection) {
        return NextResponse.json(
          { error: "Zoom not connected. Please connect your Zoom account first." },
          { status: 400 }
        );
      }

      // Check if token needs refresh
      let accessToken = zoomConnection.access_token;
      const tokenExpires = new Date(zoomConnection.token_expires_at);

      if (tokenExpires <= new Date()) {
        // Refresh the token
        try {
          const newTokens = await refreshAccessToken(zoomConnection.refresh_token);
          accessToken = newTokens.access_token;

          // Update stored tokens
          await (supabase as any)
            .from("zoom_connections")
            .update({
              access_token: newTokens.access_token,
              refresh_token: newTokens.refresh_token,
              token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", zoomConnection.id);
        } catch (refreshError) {
          console.error("[Video Sessions] Token refresh failed:", refreshError);
          return NextResponse.json(
            { error: "Zoom connection expired. Please reconnect your Zoom account." },
            { status: 400 }
          );
        }
      }

      // Calculate duration in minutes
      const start = new Date(scheduledStart);
      const end = new Date(scheduledEnd);
      const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

      // Create Zoom meeting
      try {
        const meeting = await createMeeting(accessToken, {
          topic: title,
          type: 2, // Scheduled meeting
          start_time: start.toISOString(),
          duration: durationMinutes,
          timezone,
          agenda: description,
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: false,
            mute_upon_entry: true,
            waiting_room: true,
          },
        });

        zoomMeetingId = meeting.id.toString();
        zoomMeetingUuid = meeting.uuid;
        joinUrl = meeting.join_url;
        startUrl = meeting.start_url;
        password = meeting.password;
      } catch (zoomError) {
        console.error("[Video Sessions] Zoom meeting creation failed:", zoomError);
        return NextResponse.json(
          { error: "Failed to create Zoom meeting" },
          { status: 500 }
        );
      }
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
        zoom_meeting_id: zoomMeetingId,
        zoom_meeting_uuid: zoomMeetingUuid,
        join_url: joinUrl,
        start_url: startUrl,
        password,
        manual_link: !useZoom ? manualLink : null,
        video_platform: useZoom ? "zoom" : videoPlatform,
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
