// Email service for sending notifications via Resend or fallback to console logging in development

import type { EmailTemplate } from "./email-templates";

interface SendEmailOptions {
  to: string | string[];
  template: EmailTemplate;
  from?: string;
  replyTo?: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Resend API client (uses fetch, no external dependency needed)
async function sendWithResend(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }

  const fromEmail = options.from || process.env.EMAIL_FROM || "MedicForge <noreply@medicforge.net>";
  const recipients = Array.isArray(options.to) ? options.to : [options.to];

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipients,
        subject: options.template.subject,
        html: options.template.html,
        text: options.template.text,
        reply_to: options.replyTo,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

// Development fallback - logs to console
function logEmailToConsole(options: SendEmailOptions): SendEmailResult {
  const recipients = Array.isArray(options.to) ? options.to.join(", ") : options.to;

  console.log("\n📧 EMAIL WOULD BE SENT (Development Mode)");
  console.log("━".repeat(50));
  console.log(`To: ${recipients}`);
  console.log(`Subject: ${options.template.subject}`);
  console.log("━".repeat(50));
  console.log("Text Content:");
  console.log(options.template.text);
  console.log("━".repeat(50) + "\n");

  return {
    success: true,
    messageId: `dev_${Date.now()}`,
  };
}

/**
 * Send an email using the configured email service
 *
 * In production with RESEND_API_KEY set, emails are sent via Resend.
 * In development, emails are logged to the console.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const isProduction = process.env.NODE_ENV === "production";
  const hasResendKey = !!process.env.RESEND_API_KEY;

  // Use Resend in production or if API key is available
  if (hasResendKey) {
    return sendWithResend(options);
  }

  // Fallback to console logging in development
  if (!isProduction) {
    return logEmailToConsole(options);
  }

  // Production without email service configured
  console.warn("Email service not configured. Set RESEND_API_KEY to enable email sending.");
  return {
    success: false,
    error: "Email service not configured",
  };
}

/**
 * Send email to multiple recipients (batch)
 */
export async function sendBulkEmails(
  emails: Array<{ to: string; template: EmailTemplate }>
): Promise<{ sent: number; failed: number; results: SendEmailResult[] }> {
  const results: SendEmailResult[] = [];
  let sent = 0;
  let failed = 0;

  for (const email of emails) {
    // Add small delay to avoid rate limiting
    if (results.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const result = await sendEmail({
      to: email.to,
      template: email.template,
    });

    results.push(result);
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed, results };
}

// Re-export template generators for convenience
export * from "./email-templates";
