import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { name, email, topic, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Log to console for now — swap with Resend/email service when configured
    console.log("[CE Contact Form]", { name, email, topic, message, timestamp: new Date().toISOString() });

    // TODO: Send email via Resend or similar:
    // await resend.emails.send({
    //   from: "noreply@medicforge.net",
    //   to: "ce@medicforge.net",
    //   subject: `CE Contact: ${topic || "General inquiry"} from ${name}`,
    //   text: `From: ${name} <${email}>\nTopic: ${topic}\n\n${message}`,
    // });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[CE Contact] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
