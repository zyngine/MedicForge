import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  sendEmail,
  welcomeEmail,
  assignmentDueEmail,
  gradePostedEmail,
  announcementEmail,
  clinicalShiftReminderEmail,
  enrollmentConfirmationEmail,
  skillVerifiedEmail,
} from "@/lib/notifications/email-service";

// Supported email types
type EmailType =
  | "welcome"
  | "assignment_due"
  | "grade_posted"
  | "announcement"
  | "clinical_reminder"
  | "enrollment_confirmation"
  | "skill_verified";

interface SendEmailRequest {
  type: EmailType;
  to: string;
  data: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's role to check permissions
    const { data: userData } = await supabase
      .from("users")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    // Only admins and instructors can send emails
    if (!userData || !userData.role || !["admin", "instructor"].includes(userData.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only admins and instructors can send emails" },
        { status: 403 }
      );
    }

    const body: SendEmailRequest = await request.json();

    if (!body.type || !body.to || !body.data) {
      return NextResponse.json(
        { error: "Missing required fields: type, to, data" },
        { status: 400 }
      );
    }

    // Generate template based on type
    let template;
    switch (body.type) {
      case "welcome":
        template = welcomeEmail({
          userName: body.data.userName,
          tenantName: body.data.tenantName,
          loginUrl: body.data.loginUrl || `${process.env.NEXT_PUBLIC_APP_URL}/login`,
          role: body.data.role,
        });
        break;

      case "assignment_due":
        template = assignmentDueEmail({
          userName: body.data.userName,
          assignmentTitle: body.data.assignmentTitle,
          courseName: body.data.courseName,
          dueDate: body.data.dueDate,
          dueTime: body.data.dueTime,
          assignmentUrl: body.data.assignmentUrl,
        });
        break;

      case "grade_posted":
        template = gradePostedEmail({
          userName: body.data.userName,
          assignmentTitle: body.data.assignmentTitle,
          courseName: body.data.courseName,
          score: body.data.score,
          maxScore: body.data.maxScore,
          percentage: body.data.percentage,
          feedback: body.data.feedback,
          gradesUrl: body.data.gradesUrl,
        });
        break;

      case "announcement":
        template = announcementEmail({
          userName: body.data.userName,
          courseName: body.data.courseName,
          announcementTitle: body.data.announcementTitle,
          announcementContent: body.data.announcementContent,
          instructorName: body.data.instructorName,
          courseUrl: body.data.courseUrl,
        });
        break;

      case "clinical_reminder":
        template = clinicalShiftReminderEmail({
          userName: body.data.userName,
          siteName: body.data.siteName,
          siteAddress: body.data.siteAddress,
          shiftDate: body.data.shiftDate,
          startTime: body.data.startTime,
          endTime: body.data.endTime,
          notes: body.data.notes,
        });
        break;

      case "enrollment_confirmation":
        template = enrollmentConfirmationEmail({
          userName: body.data.userName,
          courseName: body.data.courseName,
          instructorName: body.data.instructorName,
          startDate: body.data.startDate,
          courseUrl: body.data.courseUrl,
        });
        break;

      case "skill_verified":
        template = skillVerifiedEmail({
          userName: body.data.userName,
          skillName: body.data.skillName,
          status: body.data.status,
          feedback: body.data.feedback,
          evaluatorName: body.data.evaluatorName,
          competenciesUrl: body.data.competenciesUrl,
        });
        break;

      default:
        return NextResponse.json(
          { error: `Unknown email type: ${body.type}` },
          { status: 400 }
        );
    }

    // Send the email
    const result = await sendEmail({
      to: body.to,
      template,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
