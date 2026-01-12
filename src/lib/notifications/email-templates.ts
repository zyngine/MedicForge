// Email template types and generators for MedicForge

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailRecipient {
  email: string;
  name: string;
}

// Brand colors and styles
const BRAND_COLORS = {
  primary: "#2563eb", // blue-600
  primaryDark: "#1d4ed8", // blue-700
  background: "#ffffff",
  text: "#1f2937", // gray-800
  textMuted: "#6b7280", // gray-500
  border: "#e5e7eb", // gray-200
};

// Common email wrapper
function wrapEmail(content: string, previewText?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  ${previewText ? `<meta name="x-apple-disable-message-reformatting"><!--[if !mso]><!--><meta http-equiv="X-UA-Compatible" content="IE=edge"><!--<![endif]--><title>MedicForge</title>` : ""}
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 30px 0; }
    .logo { font-size: 28px; font-weight: bold; color: ${BRAND_COLORS.primary}; text-decoration: none; }
    .content { background: ${BRAND_COLORS.background}; border-radius: 8px; padding: 30px; border: 1px solid ${BRAND_COLORS.border}; }
    .button { display: inline-block; background: ${BRAND_COLORS.primary}; color: white !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .button:hover { background: ${BRAND_COLORS.primaryDark}; }
    .footer { text-align: center; padding: 20px; color: ${BRAND_COLORS.textMuted}; font-size: 14px; }
    .footer a { color: ${BRAND_COLORS.primary}; text-decoration: none; }
    h1 { color: ${BRAND_COLORS.text}; margin-top: 0; }
    p { color: ${BRAND_COLORS.text}; line-height: 1.6; }
    .muted { color: ${BRAND_COLORS.textMuted}; }
    .info-box { background: #f3f4f6; border-radius: 6px; padding: 15px; margin: 15px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 5px 0; }
    .info-label { color: ${BRAND_COLORS.textMuted}; }
    .info-value { font-weight: 600; }
  </style>
</head>
<body>
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>` : ""}
  <div class="container">
    <div class="header">
      <a href="https://www.medicforge.net" class="logo">🔥 MedicForge</a>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} MedicForge. All rights reserved.</p>
      <p>
        <a href="https://www.medicforge.net">Visit MedicForge</a> |
        <a href="https://www.medicforge.net/settings">Email Preferences</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Welcome email for new users
export function welcomeEmail(data: {
  userName: string;
  tenantName: string;
  loginUrl: string;
  role: string;
}): EmailTemplate {
  const content = `
    <h1>Welcome to MedicForge, ${data.userName}!</h1>
    <p>You've been added to <strong>${data.tenantName}</strong> as a${data.role === "instructor" ? "n" : ""} <strong>${data.role}</strong>.</p>
    <p>MedicForge is where first responders are forged. Get ready to learn, practice, and excel in your EMS training.</p>
    <div style="text-align: center;">
      <a href="${data.loginUrl}" class="button">Get Started</a>
    </div>
    <p class="muted" style="font-size: 14px;">If you didn't expect this email, please contact your program administrator.</p>
  `;

  return {
    subject: `Welcome to ${data.tenantName} on MedicForge!`,
    html: wrapEmail(content, `Welcome to ${data.tenantName}! Get started with MedicForge.`),
    text: `Welcome to MedicForge, ${data.userName}!\n\nYou've been added to ${data.tenantName} as a ${data.role}.\n\nGet started: ${data.loginUrl}`,
  };
}

// Assignment due reminder
export function assignmentDueEmail(data: {
  userName: string;
  assignmentTitle: string;
  courseName: string;
  dueDate: string;
  dueTime: string;
  assignmentUrl: string;
}): EmailTemplate {
  const content = `
    <h1>Assignment Due Soon</h1>
    <p>Hi ${data.userName},</p>
    <p>This is a reminder that your assignment is due soon:</p>
    <div class="info-box">
      <p style="margin: 0 0 10px 0;"><strong>${data.assignmentTitle}</strong></p>
      <p style="margin: 0; font-size: 14px;" class="muted">${data.courseName}</p>
    </div>
    <p><strong>Due:</strong> ${data.dueDate} at ${data.dueTime}</p>
    <div style="text-align: center;">
      <a href="${data.assignmentUrl}" class="button">View Assignment</a>
    </div>
    <p class="muted" style="font-size: 14px;">Don't wait until the last minute - start working on it now!</p>
  `;

  return {
    subject: `Reminder: "${data.assignmentTitle}" due ${data.dueDate}`,
    html: wrapEmail(content, `Assignment reminder: ${data.assignmentTitle} is due ${data.dueDate}`),
    text: `Hi ${data.userName},\n\nReminder: "${data.assignmentTitle}" for ${data.courseName} is due ${data.dueDate} at ${data.dueTime}.\n\nView assignment: ${data.assignmentUrl}`,
  };
}

// Grade posted notification
export function gradePostedEmail(data: {
  userName: string;
  assignmentTitle: string;
  courseName: string;
  score: number;
  maxScore: number;
  percentage: number;
  feedback?: string;
  gradesUrl: string;
}): EmailTemplate {
  const content = `
    <h1>Grade Posted</h1>
    <p>Hi ${data.userName},</p>
    <p>Your grade has been posted for:</p>
    <div class="info-box">
      <p style="margin: 0 0 10px 0;"><strong>${data.assignmentTitle}</strong></p>
      <p style="margin: 0; font-size: 14px;" class="muted">${data.courseName}</p>
    </div>
    <div style="text-align: center; padding: 20px;">
      <div style="font-size: 48px; font-weight: bold; color: ${data.percentage >= 70 ? "#16a34a" : "#dc2626"};">
        ${data.percentage}%
      </div>
      <p class="muted">${data.score} / ${data.maxScore} points</p>
    </div>
    ${data.feedback ? `
    <div class="info-box">
      <p style="margin: 0 0 5px 0;"><strong>Instructor Feedback:</strong></p>
      <p style="margin: 0;">${data.feedback}</p>
    </div>
    ` : ""}
    <div style="text-align: center;">
      <a href="${data.gradesUrl}" class="button">View Full Results</a>
    </div>
  `;

  return {
    subject: `Grade Posted: ${data.assignmentTitle} - ${data.percentage}%`,
    html: wrapEmail(content, `Your grade for ${data.assignmentTitle}: ${data.percentage}%`),
    text: `Hi ${data.userName},\n\nYour grade for "${data.assignmentTitle}" in ${data.courseName} has been posted.\n\nScore: ${data.score}/${data.maxScore} (${data.percentage}%)\n\n${data.feedback ? `Feedback: ${data.feedback}\n\n` : ""}View results: ${data.gradesUrl}`,
  };
}

// Course announcement
export function announcementEmail(data: {
  userName: string;
  courseName: string;
  announcementTitle: string;
  announcementContent: string;
  instructorName: string;
  courseUrl: string;
}): EmailTemplate {
  const content = `
    <h1>New Announcement</h1>
    <p>Hi ${data.userName},</p>
    <p>A new announcement has been posted in <strong>${data.courseName}</strong>:</p>
    <div class="info-box">
      <h2 style="margin-top: 0;">${data.announcementTitle}</h2>
      <p>${data.announcementContent}</p>
      <p class="muted" style="margin-bottom: 0; font-size: 14px;">— ${data.instructorName}</p>
    </div>
    <div style="text-align: center;">
      <a href="${data.courseUrl}" class="button">Go to Course</a>
    </div>
  `;

  return {
    subject: `[${data.courseName}] ${data.announcementTitle}`,
    html: wrapEmail(content, `New announcement in ${data.courseName}: ${data.announcementTitle}`),
    text: `Hi ${data.userName},\n\nNew announcement in ${data.courseName}:\n\n${data.announcementTitle}\n\n${data.announcementContent}\n\n— ${data.instructorName}\n\nView course: ${data.courseUrl}`,
  };
}

// Clinical shift reminder
export function clinicalShiftReminderEmail(data: {
  userName: string;
  siteName: string;
  siteAddress: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  notes?: string;
}): EmailTemplate {
  const content = `
    <h1>Clinical Shift Tomorrow</h1>
    <p>Hi ${data.userName},</p>
    <p>This is a reminder about your upcoming clinical shift:</p>
    <div class="info-box">
      <p style="margin: 0 0 10px 0;"><strong>${data.siteName}</strong></p>
      <p style="margin: 0 0 5px 0; font-size: 14px;">${data.siteAddress}</p>
      <hr style="border: none; border-top: 1px solid ${BRAND_COLORS.border}; margin: 10px 0;">
      <p style="margin: 0;"><strong>Date:</strong> ${data.shiftDate}</p>
      <p style="margin: 5px 0 0 0;"><strong>Time:</strong> ${data.startTime} - ${data.endTime}</p>
    </div>
    ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ""}
    <h3>Don't forget to bring:</h3>
    <ul>
      <li>Clinical uniform</li>
      <li>Student ID</li>
      <li>Stethoscope and watch</li>
      <li>Documentation materials</li>
    </ul>
    <p class="muted" style="font-size: 14px;">If you need to cancel, please do so at least 24 hours in advance.</p>
  `;

  return {
    subject: `Clinical Shift Tomorrow: ${data.siteName}`,
    html: wrapEmail(content, `Reminder: Clinical shift at ${data.siteName} on ${data.shiftDate}`),
    text: `Hi ${data.userName},\n\nReminder: Clinical shift tomorrow\n\nSite: ${data.siteName}\nAddress: ${data.siteAddress}\nDate: ${data.shiftDate}\nTime: ${data.startTime} - ${data.endTime}\n\n${data.notes ? `Notes: ${data.notes}` : ""}`,
  };
}

// Password reset
export function passwordResetEmail(data: {
  userName: string;
  resetUrl: string;
  expiresIn: string;
}): EmailTemplate {
  const content = `
    <h1>Reset Your Password</h1>
    <p>Hi ${data.userName},</p>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    <div style="text-align: center;">
      <a href="${data.resetUrl}" class="button">Reset Password</a>
    </div>
    <p class="muted" style="font-size: 14px;">This link will expire in ${data.expiresIn}.</p>
    <p class="muted" style="font-size: 14px;">If you didn't request this, you can safely ignore this email. Your password will remain unchanged.</p>
  `;

  return {
    subject: "Reset Your MedicForge Password",
    html: wrapEmail(content, "Reset your MedicForge password"),
    text: `Hi ${data.userName},\n\nReset your password: ${data.resetUrl}\n\nThis link expires in ${data.expiresIn}.\n\nIf you didn't request this, ignore this email.`,
  };
}

// Skill verification notification
export function skillVerifiedEmail(data: {
  userName: string;
  skillName: string;
  status: "verified" | "needs_practice";
  feedback?: string;
  evaluatorName: string;
  competenciesUrl: string;
}): EmailTemplate {
  const isVerified = data.status === "verified";
  const content = `
    <h1>Skill ${isVerified ? "Verified" : "Needs Practice"}</h1>
    <p>Hi ${data.userName},</p>
    <p>Your skill attempt has been evaluated:</p>
    <div class="info-box">
      <p style="margin: 0 0 10px 0;"><strong>${data.skillName}</strong></p>
      <p style="margin: 0; color: ${isVerified ? "#16a34a" : "#dc2626"}; font-weight: bold;">
        ${isVerified ? "✓ Verified" : "○ Needs Practice"}
      </p>
    </div>
    ${data.feedback ? `
    <div class="info-box">
      <p style="margin: 0 0 5px 0;"><strong>Evaluator Feedback:</strong></p>
      <p style="margin: 0;">${data.feedback}</p>
    </div>
    ` : ""}
    <p class="muted" style="font-size: 14px;">Evaluated by ${data.evaluatorName}</p>
    <div style="text-align: center;">
      <a href="${data.competenciesUrl}" class="button">View Competencies</a>
    </div>
  `;

  return {
    subject: `Skill ${isVerified ? "Verified" : "Needs Practice"}: ${data.skillName}`,
    html: wrapEmail(content, `Your ${data.skillName} skill has been ${isVerified ? "verified" : "marked as needs practice"}`),
    text: `Hi ${data.userName},\n\nYour skill attempt for "${data.skillName}" has been evaluated.\n\nStatus: ${isVerified ? "Verified" : "Needs Practice"}\n\n${data.feedback ? `Feedback: ${data.feedback}\n\n` : ""}Evaluated by ${data.evaluatorName}\n\nView competencies: ${data.competenciesUrl}`,
  };
}

// Enrollment confirmation
export function enrollmentConfirmationEmail(data: {
  userName: string;
  courseName: string;
  instructorName: string;
  startDate: string;
  courseUrl: string;
}): EmailTemplate {
  const content = `
    <h1>Enrollment Confirmed!</h1>
    <p>Hi ${data.userName},</p>
    <p>You've successfully enrolled in:</p>
    <div class="info-box">
      <h2 style="margin-top: 0;">${data.courseName}</h2>
      <p style="margin: 0;"><strong>Instructor:</strong> ${data.instructorName}</p>
      <p style="margin: 5px 0 0 0;"><strong>Starts:</strong> ${data.startDate}</p>
    </div>
    <div style="text-align: center;">
      <a href="${data.courseUrl}" class="button">Go to Course</a>
    </div>
    <h3>What's Next?</h3>
    <ul>
      <li>Review the course syllabus</li>
      <li>Check your upcoming assignments</li>
      <li>Introduce yourself in the discussion forum</li>
    </ul>
    <p>We're excited to have you! Good luck with your studies.</p>
  `;

  return {
    subject: `Enrolled: ${data.courseName}`,
    html: wrapEmail(content, `You're enrolled in ${data.courseName}!`),
    text: `Hi ${data.userName},\n\nYou've successfully enrolled in ${data.courseName}!\n\nInstructor: ${data.instructorName}\nStarts: ${data.startDate}\n\nGo to course: ${data.courseUrl}`,
  };
}
