import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import webpush from "web-push";

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:support@medicforge.net",
    vapidPublicKey,
    vapidPrivateKey
  );
}

interface PushNotificationPayload {
  userId?: string;
  userIds?: string[];
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  notificationId?: string;
}

/**
 * POST /api/push/send
 * Send push notification to user(s)
 * Requires authentication as admin or instructor
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Get user's role and tenant
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("role, tenant_id")
    .eq("id", user.id)
    .single();

  if (userError || !userData) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  // Only admins and instructors can send push notifications
  if (!userData.role || !["admin", "instructor"].includes(userData.role)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // Parse request body
  let payload: PushNotificationPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { userId, userIds, title, body, icon, badge, data, notificationId } = payload;

  if (!title || !body) {
    return NextResponse.json(
      { error: "title and body are required" },
      { status: 400 }
    );
  }

  if (!userId && !userIds) {
    return NextResponse.json(
      { error: "userId or userIds is required" },
      { status: 400 }
    );
  }

  // Get target user IDs
  const targetUserIds = userIds || (userId ? [userId] : []);

  // Fetch active push subscriptions for target users
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subscriptions, error: subError } = await (supabase as any)
    .from("push_subscriptions")
    .select("*")
    .eq("tenant_id", userData.tenant_id)
    .eq("is_active", true)
    .in("user_id", targetUserIds);

  if (subError) {
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({
      success: true,
      sent: 0,
      message: "No active push subscriptions found",
    });
  }

  // Build push notification payload
  const pushPayload = JSON.stringify({
    title,
    body,
    icon: icon || "/icons/icon-192x192.png",
    badge: badge || "/icons/icon-72x72.png",
    data: {
      ...data,
      notificationId,
      timestamp: Date.now(),
    },
  });

  // Send notifications
  const results = await Promise.allSettled(
    subscriptions.map(async (sub: { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, pushPayload);

        // Log successful send
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("push_notification_logs")
          .insert({
            tenant_id: userData.tenant_id,
            user_id: sub.user_id,
            subscription_id: sub.id,
            notification_id: notificationId,
            title,
            body,
            data,
            status: "sent",
            sent_at: new Date().toISOString(),
          });

        return { subscriptionId: sub.id, success: true };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const statusCode = (error as { statusCode?: number })?.statusCode;

        // If subscription is expired/invalid, mark as inactive
        if (statusCode === 404 || statusCode === 410) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from("push_subscriptions")
            .update({ is_active: false })
            .eq("id", sub.id);
        }

        // Log failed send
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("push_notification_logs")
          .insert({
            tenant_id: userData.tenant_id,
            user_id: sub.user_id,
            subscription_id: sub.id,
            notification_id: notificationId,
            title,
            body,
            data,
            status: "failed",
            error_message: errorMessage,
          });

        return { subscriptionId: sub.id, success: false, error: errorMessage };
      }
    })
  );

  const sent = results.filter(
    (r) => r.status === "fulfilled" && r.value.success
  ).length;
  const failed = results.length - sent;

  return NextResponse.json({
    success: true,
    sent,
    failed,
    total: results.length,
  });
}
