// Zoom OAuth - Start authorization flow
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getZoomAuthUrl, isZoomConfigured } from "@/lib/zoom";
import { randomBytes } from "crypto";

export async function GET() {
  // Check if Zoom is configured
  if (!isZoomConfigured()) {
    return NextResponse.json(
      { error: "Zoom integration is not configured" },
      { status: 500 }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Generate state token for CSRF protection
    const state = randomBytes(32).toString("hex");

    // Store state in a cookie for verification on callback
    const authUrl = getZoomAuthUrl(state);

    const response = NextResponse.redirect(authUrl);
    response.cookies.set("zoom_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[Zoom Auth] Error:", error);
    return NextResponse.json(
      { error: "Failed to start Zoom authorization" },
      { status: 500 }
    );
  }
}
