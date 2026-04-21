import { createClient } from "@/lib/supabase/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import {
  chargeCard,
  createCustomer,
  saveCardOnFile,
  createSubscription,
} from "@/lib/square-ce";
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin: any = createCEAdminClient();

    // Verify CE user exists + accepted terms
    const { data: ceUser } = await admin
      .from("ce_users")
      .select("id, email, first_name, last_name, terms_accepted_at")
      .eq("id", user.id)
      .single();

    if (!ceUser) return NextResponse.json({ error: "CE account not found" }, { status: 404 });
    if (!ceUser.terms_accepted_at) return NextResponse.json({ error: "Terms not accepted" }, { status: 403 });

    const idempotencyBase = crypto
      .createHash("sha256")
      .update(user.id + (courseId || "subscription") + type + Math.floor(Date.now() / 3600000))
      .digest("hex")
      .slice(0, 32);

    // ─── Annual subscription (auto-renewing) ─────────────────────────────────
    if (type === "subscription") {
      const planVariationId = process.env.SQUARE_SUBSCRIPTION_PLAN_VARIATION_ID;
      if (!planVariationId) {
        return NextResponse.json(
          { error: "Subscription plan not configured" },
          { status: 500 }
        );
      }

      // 1. Check for existing active subscription
      const { data: existingSub } = await admin
        .from("ce_user_subscriptions")
        .select("id, status, square_subscription_id")
        .eq("user_id", ceUser.id)
        .in("status", ["active", "past_due"])
        .maybeSingle();

      if (existingSub) {
        return NextResponse.json({ error: "You already have an active subscription" }, { status: 409 });
      }

      // 2. Create/reuse Square customer
      let customerId: string;
      const { data: priorSub } = await admin
        .from("ce_user_subscriptions")
        .select("square_customer_id")
        .eq("user_id", ceUser.id)
        .not("square_customer_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (priorSub?.square_customer_id) {
        customerId = priorSub.square_customer_id;
      } else {
        const { customerId: newCustomerId } = await createCustomer({
          email: ceUser.email,
          firstName: ceUser.first_name,
          lastName: ceUser.last_name,
          idempotencyKey: `${idempotencyBase}-cust`,
        });
        customerId = newCustomerId;
      }

      // 3. Save card on file
      const { cardId, lastFour, brand } = await saveCardOnFile({
        sourceId,
        customerId,
        idempotencyKey: `${idempotencyBase}-card`,
      });

      // 4. Create the subscription in Square
      const { subscriptionId, status, startDate, nextBillingDate } = await createSubscription({
        customerId,
        cardId,
        planVariationId,
        idempotencyKey: `${idempotencyBase}-sub`,
      });

      // 5. Record in our DB
      const now = new Date();
      const expires = new Date(now);
      expires.setFullYear(expires.getFullYear() + 1);

      await admin.from("ce_user_subscriptions").insert({
        user_id: ceUser.id,
        plan: "annual",
        price: 69.00,
        starts_at: startDate || now.toISOString().slice(0, 10),
        expires_at: expires.toISOString().slice(0, 10),
        square_subscription_id: subscriptionId,
        square_customer_id: customerId,
        square_card_id: cardId,
        card_last_four: lastFour,
        card_brand: brand,
        status: "active",
        auto_renew: true,
        last_payment_at: now.toISOString(),
        next_billing_at: nextBillingDate || expires.toISOString().slice(0, 10),
      });

      try {
        await sendSubscriptionReceipt(
          ceUser.email,
          ceUser.first_name,
          69.00,
          expires.toISOString(),
          ceUser.id
        );
      } catch (e) {
        console.error("[CE Email] Subscription receipt failed:", e);
      }

      return NextResponse.json({ paymentId: subscriptionId, subscriptionId, status });
    }

    // ─── One-time course purchase (existing logic) ───────────────────────────
    if (type === "course") {
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

      const amountCents = Math.round(course.price * 100);
      const note = `MedicForge CE: ${course.title}`;

      const { paymentId } = await chargeCard({
        sourceId,
        amountCents,
        idempotencyKey: idempotencyBase,
        note,
      });

      await admin.from("ce_purchases").insert({
        user_id: ceUser.id,
        course_id: courseId,
        amount: amountCents / 100,
        square_payment_id: paymentId,
        purchased_at: new Date().toISOString(),
        refunded: false,
      });

      try {
        await sendCoursePurchaseReceipt(
          ceUser.email,
          ceUser.first_name,
          course.title,
          amountCents / 100,
          courseId,
          ceUser.id
        );
      } catch (e) {
        console.error("[CE Email] Course receipt failed:", e);
      }

      return NextResponse.json({ paymentId });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  } catch (err: unknown) {
    console.error("[CE process-payment]", err);
    const msg = err instanceof Error ? err.message : "Payment processing failed. Please try again.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
