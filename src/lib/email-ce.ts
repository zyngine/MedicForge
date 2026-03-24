/**
 * CE Platform email notifications via Resend REST API.
 * No package required — just set RESEND_API_KEY in .env.local.
 * If the key is missing, emails are logged to console and skipped gracefully.
 */

import { createCEAdminClient } from "@/lib/supabase/admin";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.CE_FROM_EMAIL || "noreply@medicforge.net";
const ADMIN_EMAIL = process.env.CE_ADMIN_EMAIL || "ce@medicforge.net";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://medicforge.net";

// ---------------------------------------------------------------------------
// Email log metadata passed by each caller
// ---------------------------------------------------------------------------

interface EmailLogMeta {
  emailType: string;
  userId?: string | null;
}

// ---------------------------------------------------------------------------
// Base sender
// ---------------------------------------------------------------------------

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  meta: EmailLogMeta
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("[CE Email] RESEND_API_KEY not configured — skipping:", subject, "→", to);
    return;
  }

  let status: string = "failed";
  let resendMessageId: string | null = null;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      resendMessageId = data.id ?? null;
      status = "sent";
    } else {
      const err = await res.json().catch(() => ({}));
      console.error("[CE Email] Failed to send:", subject, err);
    }
  } catch (err) {
    console.error("[CE Email] Network error sending:", subject, err);
  }

  // Log to ce_email_log
  try {
    const supabase = createCEAdminClient();
    await supabase.from("ce_email_log").insert({
      user_id: meta.userId ?? null,
      email_type: meta.emailType,
      subject,
      status,
      resend_message_id: resendMessageId,
    });
  } catch (logErr) {
    console.error("[CE Email] Failed to log email to ce_email_log:", logErr);
  }
}

// ---------------------------------------------------------------------------
// HTML base layout
// ---------------------------------------------------------------------------

function layout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:40px 16px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111827">
  <div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#b91c1c;padding:20px 32px">
      <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.5px">MedicForge CE</span>
    </div>
    <div style="padding:32px">
      ${content}
    </div>
    <div style="padding:16px 32px 24px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af">
      MedicForge CE &mdash; EMS Continuing Education &bull;
      <a href="${BASE_URL}/ce" style="color:#b91c1c;text-decoration:none">${BASE_URL.replace("https://", "")}/ce</a>
    </div>
  </div>
</body>
</html>`;
}

function btn(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#b91c1c;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;font-size:14px;margin-top:16px">${label}</a>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;font-size:13px;color:#6b7280;white-space:nowrap">${label}</td>
    <td style="padding:8px 12px;font-size:13px;color:#111827;font-weight:500">${value}</td>
  </tr>`;
}

function table(rows: string): string {
  return `<table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:6px;margin:20px 0;border:1px solid #e5e7eb">
    <tbody>${rows}</tbody>
  </table>`;
}

// ---------------------------------------------------------------------------
// Welcome email — sent after CE account creation
// ---------------------------------------------------------------------------

export async function sendWelcomeEmail(to: string, firstName: string, userId?: string): Promise<void> {
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:20px">Welcome, ${firstName}!</h2>
    <p style="color:#4b5563;line-height:1.6;margin:0 0 16px">
      Your MedicForge CE account is ready. Browse our quality continuing education courses
      and start earning CEH hours toward your NREMT recertification.
    </p>
    ${btn(`${BASE_URL}/ce/catalog`, "Browse Courses")}
    <p style="color:#6b7280;font-size:13px;margin-top:24px">
      Need help? Reply to this email or visit our
      <a href="${BASE_URL}/ce/contact" style="color:#b91c1c">contact page</a>.
    </p>
  `);

  await sendEmail(to, "Welcome to MedicForge CE", html, {
    emailType: "welcome",
    userId,
  });
}

// ---------------------------------------------------------------------------
// Course purchase receipt
// ---------------------------------------------------------------------------

export async function sendCoursePurchaseReceipt(
  to: string,
  firstName: string,
  courseTitle: string,
  amount: number,
  courseId: string,
  userId?: string
): Promise<void> {
  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:20px">Purchase Confirmed</h2>
    <p style="color:#4b5563;line-height:1.6;margin:0 0 4px">Hi ${firstName}, your payment was successful.</p>
    ${table(
      row("Course", courseTitle) +
      row("Amount", `$${amount.toFixed(2)}`) +
      row("Date", new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))
    )}
    <p style="color:#4b5563;font-size:14px;margin:0">You now have full access to this course.</p>
    ${btn(`${BASE_URL}/ce/course/${courseId}`, "Start Course")}
  `);

  await sendEmail(to, `Purchase Confirmed — ${courseTitle}`, html, {
    emailType: "purchase_receipt",
    userId,
  });
}

// ---------------------------------------------------------------------------
// Annual subscription receipt
// ---------------------------------------------------------------------------

export async function sendSubscriptionReceipt(
  to: string,
  firstName: string,
  amount: number,
  expiresAt: string,
  userId?: string
): Promise<void> {
  const expires = new Date(expiresAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:20px">Annual Subscription Activated</h2>
    <p style="color:#4b5563;line-height:1.6;margin:0 0 4px">Hi ${firstName}, welcome to all-access CE!</p>
    ${table(
      row("Plan", "Annual Subscription") +
      row("Amount", `$${amount.toFixed(2)}`) +
      row("Access until", expires) +
      row("Date", new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))
    )}
    <p style="color:#4b5563;font-size:14px;margin:0">
      Your subscription gives you unlimited access to all MedicForge CE courses.
    </p>
    ${btn(`${BASE_URL}/ce/catalog`, "Browse All Courses")}
  `);

  await sendEmail(to, "Annual CE Subscription Confirmed", html, {
    emailType: "subscription_receipt",
    userId,
  });
}

// ---------------------------------------------------------------------------
// Course completion + certificate notification
// ---------------------------------------------------------------------------

export async function sendCourseCompletionEmail(
  to: string,
  firstName: string,
  courseTitle: string,
  cehHours: number,
  certNumber: string,
  expiresAt: string | null,
  userId?: string
): Promise<void> {
  const expiryRow = expiresAt
    ? row("Certificate expires", new Date(expiresAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }))
    : "";

  const html = layout(`
    <h2 style="margin:0 0 8px;font-size:20px">Certificate Issued — Congratulations!</h2>
    <p style="color:#4b5563;line-height:1.6;margin:0 0 4px">
      Great work, ${firstName}! You've completed <strong>${courseTitle}</strong>.
    </p>
    ${table(
      row("Course", courseTitle) +
      row("CEH Hours earned", `${cehHours} hour${cehHours !== 1 ? "s" : ""}`) +
      row("Certificate #", certNumber) +
      row("Issued", new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })) +
      expiryRow
    )}
    <p style="color:#4b5563;font-size:14px;margin:0">
      Your certificate is available in your transcript and can be downloaded as a PDF.
    </p>
    ${btn(`${BASE_URL}/ce/transcript`, "View Certificate")}
  `);

  await sendEmail(to, `Certificate Issued — ${courseTitle}`, html, {
    emailType: "course_completion",
    userId,
  });
}

// ---------------------------------------------------------------------------
// Contact form — forwards submission to admin
// ---------------------------------------------------------------------------

export async function sendContactFormEmail(
  name: string,
  email: string,
  topic: string | null,
  message: string
): Promise<void> {
  const html = layout(`
    <h2 style="margin:0 0 16px;font-size:18px">CE Contact Form Submission</h2>
    ${table(
      row("From", `${name} &lt;${email}&gt;`) +
      row("Topic", topic || "General inquiry") +
      row("Submitted", new Date().toLocaleString())
    )}
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin-top:4px">
      <p style="margin:0;font-size:14px;line-height:1.6;white-space:pre-wrap">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
    </div>
    <p style="font-size:13px;color:#6b7280;margin-top:16px">Reply directly to this email to respond to ${name}.</p>
  `);

  await sendEmail(ADMIN_EMAIL, `CE Contact: ${topic || "General inquiry"} — ${name}`, html, {
    emailType: "contact_form",
  });
}
