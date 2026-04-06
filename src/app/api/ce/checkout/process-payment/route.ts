import { createClient } from "@/lib/supabase/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { chargeCard } from "@/lib/square-ce";
import { sendCoursePurchaseReceipt, sendSubscriptionReceipt } from "@/lib/email-ce";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { type, sourceId, courseId } = await request.json();

    if (!type || !sourceId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createCEAdminClient();

    // Verify CE user exists + accepted terms
    const { data: ceUser } = await admin
      .from("ce_users")
      .select("id, email, first_name, terms_accepted_at")
      .eq("id", user.id)
      .single();

    if (!ceUser) return NextResponse.json({ error: "CE account not found" }, { status: 404 });
    if (!ceUser.terms_accepted_at) return NextResponse.json({ error: "Terms not accepted" }, { status: 403 });

    let amountCents: number;
    let note: string;

    if (type === "subscription") {
      const { data: setting } = await admin
        .from("ce_platform_settings")
        .select("value")
        .eq("key", "annual_subscription_price")
        .single();

      amountCents = Math.round(parseFloat(setting?.value || "99.00") * 100);
      note = "MedicForge CE Annual Subscription";

    } else if (type === "course") {
      if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });

      const { data: course } = await admin
        .from("ce_courses")
        .select("id, title, price, is_free, status")
        .eq("id", courseId)
        .single();

      if (!course || course.status !== "published") {
        return NextResponse.json({ error: "Course not available" }, { status: 404 });
      }
      if (course.is_free || !course.price) {
        return NextResponse.json({ error: "Course is free, no payment needed" }, { status: 400 });
      }

      // Check not already purchased
      const { data: existingPurchase } = await admin
        .from("ce_purchases")
        .select("id")
        .eq("user_id", ceUser.id)
        .eq("course_id", courseId)
        .eq("refunded", false)
        .maybeSingle();

      if (existingPurchase) {
        return NextResponse.json({ error: "Already purchased" }, { status: 409 });
      }

      amountCents = Math.round(course.price * 100);
      note = `MedicForge CE: ${course.title}`;

    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // Charge card via Square
    const { paymentId } = await chargeCard({
      sourceId,
      amountCents,
      idempotencyKey: crypto.createHash("sha256").update(user.id + (courseId || "subscription") + type + Math.floor(Date.now() / 3600000)).digest("hex").slice(0, 32),
      note,
    });

    if (type === "subscription") {
      const now = new Date();
      const expires = new Date(now);
      expires.setFullYear(expires.getFullYear() + 1);

      await admin.from("ce_user_subscriptions").insert({
        user_id: ceUser.id,
        plan: "annual",
        price: amountCents / 100,
        starts_at: now.toISOString(),
        expires_at: expires.toISOString(),
        square_subscription_id: paymentId,
        status: "active",
        auto_renew: false,
      });

      try {
        await sendSubscriptionReceipt(ceUser.email, ceUser.first_name, amountCents / 100, expires.toISOString(), ceUser.id);
      } catch (e) {
        console.error("[CE Email] Subscription receipt failed:", e);
      }

    } else {
      // Insert purchase record
      await admin.from("ce_purchases").insert({
        user_id: ceUser.id,
        course_id: courseId,
        amount: amountCents / 100,
        square_payment_id: paymentId,
        purchased_at: new Date().toISOString(),
        refunded: false,
      });

      try {
        await sendCoursePurchaseReceipt(ceUser.email, ceUser.first_name, note.replace("MedicForge CE: ", ""), amountCents / 100, courseId!, ceUser.id);
      } catch (e) {
        console.error("[CE Email] Course receipt failed:", e);
      }
    }

    return NextResponse.json({ paymentId });

  } catch (err: unknown) {
    console.error("[CE process-payment]", err);
    return NextResponse.json({ error: "Payment processing failed. Please try again." }, { status: 500 });
  }
}
