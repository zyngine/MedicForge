import type { EmailTemplate } from "./email-templates";
import {
  inviteEmail,
  passwordResetEmail,
  authActionEmail,
  type AuthActionKind,
} from "./email-templates";

/**
 * The set of email_action_type values Supabase Auth can hand to the Send Email
 * hook. Anything outside this list is unknown to us and must not be silently
 * dropped — the caller returns an error so Supabase surfaces it instead.
 */
export const AUTH_EMAIL_ACTION_TYPES = [
  "signup",
  "invite",
  "recovery",
  "magiclink",
  "email_change",
  "email_change_new",
  "reauthentication",
] as const;

export type AuthEmailActionType = (typeof AUTH_EMAIL_ACTION_TYPES)[number];

export function isAuthEmailActionType(value: string): value is AuthEmailActionType {
  return (AUTH_EMAIL_ACTION_TYPES as readonly string[]).includes(value);
}

/**
 * Build the `/auth/v1/verify` URL that consumes a one-time token hash and then
 * bounces the user to `redirect_to`. This lives on the Supabase API host, not
 * on the app's own domain.
 */
export function buildConfirmationUrl(params: {
  supabaseUrl: string;
  tokenHash: string;
  actionType: string;
  redirectTo: string;
}): string {
  const url = new URL("/auth/v1/verify", params.supabaseUrl);
  url.searchParams.set("token", params.tokenHash);
  url.searchParams.set("type", params.actionType);
  if (params.redirectTo) {
    url.searchParams.set("redirect_to", params.redirectTo);
  }
  return url.toString();
}

/**
 * Map a Supabase auth email action onto one of our branded templates.
 *
 * `token` is the six-digit OTP that pairs with the link; reauthentication is
 * code-only and has no confirmation URL to follow.
 */
export function authEmailTemplate(input: {
  actionType: AuthEmailActionType;
  confirmationUrl: string;
  token: string;
  userName: string;
  newEmail?: string;
}): EmailTemplate {
  const { actionType, confirmationUrl, token, userName, newEmail } = input;

  switch (actionType) {
    case "invite":
      return inviteEmail({ userName, inviteUrl: confirmationUrl });

    case "recovery":
      return passwordResetEmail({
        userName,
        resetUrl: confirmationUrl,
        expiresIn: "1 hour",
      });

    case "signup":
    case "magiclink":
    case "email_change":
    case "email_change_new":
    case "reauthentication":
      return authActionEmail({
        kind: actionType as AuthActionKind,
        userName,
        actionUrl: confirmationUrl,
        token,
        newEmail,
      });
  }
}
