import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { sendEmail } from "@/lib/notifications/email-service";
import {
  authEmailTemplate,
  buildConfirmationUrl,
  isAuthEmailActionType,
} from "@/lib/notifications/auth-email-templates";

/**
 * Supabase Auth "Send Email" hook.
 *
 * Supabase Auth normally delivers invitations, password resets, signup
 * confirmations and magic links itself over SMTP. With this hook enabled it
 * stops doing that and POSTs here instead, handing us the one-time token so we
 * can send the message through Resend — the same path the rest of the app
 * already uses. No SMTP server is involved anywhere.
 *
 * Setup:
 *   1. Supabase dashboard -> Authentication -> Hooks -> Send Email
 *   2. Type "HTTPS", URI https://www.medicforge.net/api/auth/hooks/send-email
 *   3. Copy the generated secret (v1,whsec_...) into SEND_EMAIL_HOOK_SECRET
 *      in Vercel, for every environment you deploy.
 *   4. Leave the Email provider enabled — hook enabled + provider enabled is
 *      what makes the hook take over sending.
 *
 * The request is signed with Standard Webhooks. An unsigned or badly signed
 * request is rejected: this endpoint mints password-reset and invite links, so
 * an unauthenticated caller must never be able to make it send one.
 */

// Supabase gives HTTP hooks a short timeout and runs them inside the auth
// transaction, so keep this on the Node runtime and do exactly one thing.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SendEmailHookPayload {
  user: {
    email: string;
    new_email?: string | null;
    user_metadata?: { full_name?: string } | null;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

function hookError(message: string, status: number) {
  return NextResponse.json(
    { error: { http_code: status, message } },
    { status }
  );
}

export async function POST(request: Request) {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET;

  if (!secret) {
    console.error(
      "[send-email hook] SEND_EMAIL_HOOK_SECRET is not set — refusing to send. " +
        "Auth emails will not be delivered until it is configured."
    );
    return hookError("Email hook is not configured", 500);
  }

  // The signature covers the exact bytes Supabase sent, so verify before
  // parsing — never re-serialize the body first.
  const rawBody = await request.text();

  let payload: SendEmailHookPayload;
  try {
    const wh = new Webhook(secret.replace("v1,whsec_", ""));
    payload = wh.verify(
      rawBody,
      Object.fromEntries(request.headers)
    ) as SendEmailHookPayload;
  } catch (err) {
    console.error("[send-email hook] Signature verification failed:", err);
    return hookError("Invalid signature", 401);
  }

  const { user, email_data: emailData } = payload;

  if (!user?.email || !emailData?.token_hash || !emailData?.email_action_type) {
    return hookError("Malformed hook payload", 400);
  }

  const actionType = emailData.email_action_type;

  if (!isAuthEmailActionType(actionType)) {
    // Better to fail loudly than to swallow an action type we don't render —
    // a silently dropped password reset is indistinguishable from a broken one.
    console.error("[send-email hook] Unsupported email_action_type:", actionType);
    return hookError(`Unsupported email action type: ${actionType}`, 400);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    console.error("[send-email hook] NEXT_PUBLIC_SUPABASE_URL is not set");
    return hookError("Email hook is not configured", 500);
  }

  const userName =
    user.user_metadata?.full_name?.trim() || user.email.split("@")[0];

  // email_change with Secure Email Change on produces two token pairs: the
  // current address verifies with token_hash_new, the new address with
  // token_hash. The names are reversed for backwards compatibility, so this
  // pairing is deliberate and not a typo.
  const isChangeToCurrentAddress =
    actionType === "email_change" && !!emailData.token_hash_new;

  const tokenHash = isChangeToCurrentAddress
    ? (emailData.token_hash_new as string)
    : emailData.token_hash;

  const token = isChangeToCurrentAddress
    ? emailData.token
    : emailData.token_new || emailData.token;

  const recipient =
    actionType === "email_change_new" && user.new_email
      ? user.new_email
      : user.email;

  const confirmationUrl = buildConfirmationUrl({
    supabaseUrl,
    tokenHash,
    actionType,
    redirectTo: emailData.redirect_to || emailData.site_url,
  });

  const template = authEmailTemplate({
    actionType,
    confirmationUrl,
    token,
    userName,
    newEmail: user.new_email ?? undefined,
  });

  const result = await sendEmail({ to: recipient, template });

  if (!result.success) {
    // Returning non-200 makes Supabase surface the failure to the caller
    // instead of reporting a successful invite that never left the building.
    console.error(
      `[send-email hook] Resend rejected the ${actionType} email:`,
      result.error
    );
    return hookError(result.error || "Failed to send email", 500);
  }

  return NextResponse.json({});
}
