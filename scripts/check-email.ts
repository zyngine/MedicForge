/**
 * Email delivery diagnostics.
 *
 *   npm run check:email                 # configuration + Resend account check
 *   npm run check:email -- you@you.com  # also send a live test email
 *
 * MedicForge sends mail through two independent pipelines. When "emails aren't
 * sending", the first job is working out which one is broken:
 *
 *   1. Supabase Auth  — user invitations, password resets, email confirmation.
 *      Sent by Supabase itself using the SMTP provider configured in the
 *      Supabase dashboard (Authentication -> Emails -> SMTP Settings). If no
 *      custom SMTP is configured the project falls back to Supabase's built-in
 *      testing service, which is rate limited to a handful of messages per hour
 *      and only delivers to addresses belonging to the project's team members.
 *      RESEND_API_KEY has no effect on this path. This script cannot test it —
 *      it is dashboard configuration, not application code.
 *
 *   2. Resend REST API — everything the app sends itself: clinical shift
 *      notices, agency notifications, CE receipts and certificates, the
 *      invitation email resend. This is what the script below exercises.
 */

import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const RESEND_API = "https://api.resend.com";

function mask(value: string | undefined): string {
  if (!value) return "\x1b[31mNOT SET\x1b[0m";
  if (value.length <= 8) return "set";
  return `set (${value.slice(0, 4)}…${value.slice(-2)})`;
}

function domainOf(fromField: string): string {
  // Accepts "Name <a@b.com>" or "a@b.com".
  const match = fromField.match(/<([^>]+)>/);
  const address = match ? match[1] : fromField;
  return address.split("@")[1]?.trim().toLowerCase() ?? "";
}

async function main() {
  const testRecipient = process.argv[2];

  console.log("\n=== 1. Environment ===\n");

  const apiKey = process.env.RESEND_API_KEY;
  const lmsFrom = process.env.EMAIL_FROM || "MedicForge <noreply@medicforge.net>";
  const ceFrom = process.env.CE_FROM_EMAIL || "noreply@medicforge.net";
  const ceAdmin = process.env.CE_ADMIN_EMAIL || "ce@medicforge.net";

  const hookSecret = process.env.SEND_EMAIL_HOOK_SECRET;

  console.log(`  RESEND_API_KEY   ${mask(apiKey)}`);
  console.log(`  EMAIL_FROM       ${lmsFrom}${process.env.EMAIL_FROM ? "" : "   (default)"}`);
  console.log(`  CE_FROM_EMAIL    ${ceFrom}${process.env.CE_FROM_EMAIL ? "" : "   (default)"}`);
  console.log(`  CE_ADMIN_EMAIL   ${ceAdmin}${process.env.CE_ADMIN_EMAIL ? "" : "   (default)"}`);
  console.log(`  SEND_EMAIL_HOOK_SECRET  ${mask(hookSecret)}`);

  if (!hookSecret) {
    console.log(
      "\n  \x1b[33mThe Supabase Send Email hook is not configured here.\x1b[0m Invitations," +
        "\n  password resets, signup confirmations and magic links are sent by Supabase" +
        "\n  Auth, not by this app — without the hook they go over Supabase's built-in" +
        "\n  SMTP, which is limited to a couple of messages an hour and only delivers to" +
        "\n  project team members." +
        "\n" +
        "\n  Configure it at: Supabase dashboard -> Authentication -> Hooks -> Send Email" +
        "\n    Type: HTTPS" +
        "\n    URI:  https://www.medicforge.net/api/auth/hooks/send-email" +
        "\n  then put the generated v1,whsec_... secret in SEND_EMAIL_HOOK_SECRET." +
        "\n  Leave the Email provider itself enabled, or signups turn off entirely."
    );
  } else if (!hookSecret.startsWith("v1,whsec_")) {
    console.log(
      "\n  \x1b[31mSEND_EMAIL_HOOK_SECRET does not start with \"v1,whsec_\".\x1b[0m Paste the" +
        "\n  whole value Supabase generated, prefix included.\n"
    );
  }

  if (!apiKey) {
    console.log(
      "\n  \x1b[31mRESEND_API_KEY is not set.\x1b[0m Every app-sent email is skipped when it is" +
        "\n  missing — src/lib/email-ce.ts logs a warning and returns, and" +
        "\n  src/lib/notifications/email-service.ts returns { success: false }." +
        "\n  Set it locally in .env.local and, for the deployed app, in the Vercel" +
        "\n  project settings for every environment you deploy to.\n"
    );
    process.exit(1);
  }

  console.log("\n=== 2. Resend API key ===\n");

  const domainsRes = await fetch(`${RESEND_API}/domains`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!domainsRes.ok) {
    const body = await domainsRes.text();
    console.log(`  \x1b[31mResend rejected the key: HTTP ${domainsRes.status}\x1b[0m`);
    console.log(`  ${body}`);
    console.log(
      "\n  A 401 means the key is wrong or was revoked. A 403 usually means the key" +
        "\n  is restricted to sending only, which is fine for the app but blocks this" +
        "\n  check — skip to the test send below.\n"
    );
    process.exit(1);
  }

  const domainsBody = (await domainsRes.json()) as {
    data?: Array<{ name: string; status: string; region?: string }>;
  };
  const domains = domainsBody.data ?? [];

  console.log(`  Key accepted. ${domains.length} domain(s) on this account:`);
  for (const d of domains) {
    const ok = d.status === "verified";
    console.log(`    ${ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} ${d.name} — ${d.status}`);
  }

  console.log("\n=== 3. Sender domains ===\n");

  const verified = new Set(
    domains.filter((d) => d.status === "verified").map((d) => d.name.toLowerCase())
  );

  let senderProblem = false;
  for (const [label, from] of [
    ["EMAIL_FROM (LMS)", lmsFrom],
    ["CE_FROM_EMAIL (CE)", ceFrom],
  ] as const) {
    const domain = domainOf(from);
    const ok = verified.has(domain);
    if (!ok) senderProblem = true;
    console.log(
      `  ${ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} ${label}: ${from} → ${domain || "(no domain)"}`
    );
  }

  if (senderProblem) {
    console.log(
      "\n  \x1b[31mAt least one sender domain is not verified on this Resend account.\x1b[0m" +
        "\n  Resend rejects those sends with 403 and the app currently discards that" +
        "\n  error, so the UI reports success and nothing arrives. Verify the domain" +
        "\n  in the Resend dashboard, or point EMAIL_FROM / CE_FROM_EMAIL at a domain" +
        "\n  that already is.\n"
    );
  }

  if (!testRecipient) {
    console.log(
      "\n  Pass an address to send a live test message:" +
        "\n    npm run check:email -- you@example.com\n"
    );
    return;
  }

  console.log(`\n=== 4. Test send to ${testRecipient} ===\n`);

  for (const [label, from] of [
    ["LMS", lmsFrom],
    ["CE", ceFrom],
  ] as const) {
    const res = await fetch(`${RESEND_API}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [testRecipient],
        subject: `MedicForge ${label} email test`,
        html: `<p>Test message from <code>scripts/check-email.ts</code> using the ${label} sender (<code>${from}</code>).</p>`,
        text: `Test message from scripts/check-email.ts using the ${label} sender (${from}).`,
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log(`  \x1b[32m✓\x1b[0m ${label} sender accepted — message id ${(body as { id?: string }).id}`);
    } else {
      console.log(`  \x1b[31m✗\x1b[0m ${label} sender rejected — HTTP ${res.status}`);
      console.log(`     ${JSON.stringify(body)}`);
    }
  }

  console.log(
    "\n  If both sends were accepted but nothing arrives, the message left Resend." +
      "\n  Check the Resend dashboard's Emails log for bounces or spam complaints." +
      "\n\n  Remember that user invitations and password resets do NOT use Resend —" +
      "\n  they are sent by Supabase Auth. See the note at the top of this file.\n"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
