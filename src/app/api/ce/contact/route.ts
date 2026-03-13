import { NextRequest, NextResponse } from "next/server";
import { sendContactFormEmail } from "@/lib/email-ce";

export async function POST(req: NextRequest) {
  try {
    const { name, email, topic, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    try {
      await sendContactFormEmail(name, email, topic, message);
    } catch (e) {
      console.error("[CE Contact] Email failed:", e);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[CE Contact] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
