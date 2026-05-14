import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

const BUNNY_API_KEY = process.env.BUNNY_STREAM_API_KEY;
const BUNNY_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID;

export async function POST(request: NextRequest) {
  try {
    // Verify user is a CE admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ceUser } = await (supabase as any)
      .from("ce_users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!ceUser || (ceUser.role !== "admin" && ceUser.role !== "agency_admin")) {
      return NextResponse.json({ error: "CE admin or agency admin access required" }, { status: 403 });
    }

    if (!BUNNY_API_KEY || !BUNNY_LIBRARY_ID) {
      return NextResponse.json({ error: "Video hosting not configured" }, { status: 500 });
    }

    const { title } = await request.json();

    // Create a video in Bunny Stream
    const createResponse = await fetch(
      `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
      {
        method: "POST",
        headers: {
          "AccessKey": BUNNY_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: title || "Untitled Video" }),
      }
    );

    if (!createResponse.ok) {
      const err = await createResponse.text();
      console.error("Bunny create video error:", err);
      return NextResponse.json({ error: "Failed to create video" }, { status: 500 });
    }

    const video = await createResponse.json();

    // Generate TUS auth signature for direct browser upload
    // Bunny TUS requires: SHA256(library_id + api_key + expiration_time + video_id)
    const expirationTime = Math.floor(Date.now() / 1000) + 7200; // 2 hours
    const signaturePayload = `${BUNNY_LIBRARY_ID}${BUNNY_API_KEY}${expirationTime}${video.guid}`;
    const authSignature = crypto.createHash("sha256").update(signaturePayload).digest("hex");

    return NextResponse.json({
      videoId: video.guid,
      libraryId: BUNNY_LIBRARY_ID,
      authSignature,
      authExpire: expirationTime,
      embedUrl: `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${video.guid}`,
    });
  } catch (error) {
    console.error("Video create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
