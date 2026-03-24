// Agency email template generators
// Uses the existing EmailTemplate interface from email-templates.ts
// Sent via sendEmail() from email-service.ts — NO new npm dependencies

import type { EmailTemplate } from "./email-templates";

export function mdInviteTemplate(params: {
  mdName: string;
  agencyName: string;
  registrationUrl: string;
  invitedByName: string;
  expiresAt: string;
}): EmailTemplate {
  const expiryDate = new Date(params.expiresAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return {
    subject: `You've been invited as Medical Director for ${params.agencyName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Medical Director Invitation</h2>
        <p>Hello Dr. ${params.mdName},</p>
        <p><strong>${params.invitedByName}</strong> has invited you to join <strong>${params.agencyName}</strong> as a Medical Director on MedicForge.</p>
        <p>As Medical Director, you'll be able to review and verify employee competencies for the agency.</p>
        <p style="margin: 24px 0;">
          <a href="${params.registrationUrl}" style="background: #C53030; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Accept Invitation
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">This invitation expires on ${expiryDate}.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">MedicForge — EMS Workforce Management</p>
      </div>
    `,
    text: `Dr. ${params.mdName}, ${params.invitedByName} has invited you to join ${params.agencyName} as Medical Director on MedicForge. Accept: ${params.registrationUrl} (expires ${expiryDate})`,
  };
}

export function expiringCertTemplate(params: {
  employeeName: string;
  agencyName: string;
  certLevel: string;
  expirationDate: string;
  daysUntil: number;
}): EmailTemplate {
  return {
    subject: `Certification expiring in ${params.daysUntil} days — ${params.employeeName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Certification Expiration Notice</h2>
        <p>The following employee's certification is expiring soon:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Employee</strong></td><td style="padding: 8px; border: 1px solid #eee;">${params.employeeName}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Cert Level</strong></td><td style="padding: 8px; border: 1px solid #eee;">${params.certLevel}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Expiration</strong></td><td style="padding: 8px; border: 1px solid #eee;">${params.expirationDate}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Days Until</strong></td><td style="padding: 8px; border: 1px solid #eee;">${params.daysUntil} days</td></tr>
        </table>
        <p style="color: #999; font-size: 12px;">MedicForge — ${params.agencyName}</p>
      </div>
    `,
    text: `${params.employeeName}'s ${params.certLevel} certification expires on ${params.expirationDate} (${params.daysUntil} days). — ${params.agencyName}`,
  };
}

export function pendingVerificationTemplate(params: {
  mdName: string;
  agencyName: string;
  pendingCount: number;
  dashboardUrl: string;
}): EmailTemplate {
  return {
    subject: `${params.pendingCount} competencies awaiting your verification`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Pending Verifications</h2>
        <p>Hello Dr. ${params.mdName},</p>
        <p>There are <strong>${params.pendingCount}</strong> employee competencies awaiting your review at <strong>${params.agencyName}</strong>.</p>
        <p style="margin: 24px 0;">
          <a href="${params.dashboardUrl}" style="background: #C53030; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Review Verifications
          </a>
        </p>
        <p style="color: #999; font-size: 12px;">MedicForge — EMS Workforce Management</p>
      </div>
    `,
    text: `Dr. ${params.mdName}, there are ${params.pendingCount} competencies awaiting your review at ${params.agencyName}. Review: ${params.dashboardUrl}`,
  };
}
