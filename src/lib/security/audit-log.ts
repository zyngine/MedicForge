"use client";

import { createClient } from "@/lib/supabase/client";

// Audit log event types
export type AuditEventType =
  // Authentication events
  | "auth.login"
  | "auth.logout"
  | "auth.password_change"
  | "auth.password_reset"
  | "auth.mfa_enabled"
  | "auth.mfa_disabled"
  // User management
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "user.role_changed"
  | "user.suspended"
  | "user.reactivated"
  // Course management
  | "course.created"
  | "course.updated"
  | "course.deleted"
  | "course.published"
  | "course.archived"
  // Enrollment
  | "enrollment.created"
  | "enrollment.dropped"
  | "enrollment.completed"
  // Assignment/Grading
  | "assignment.created"
  | "assignment.published"
  | "submission.created"
  | "submission.graded"
  | "grade.modified"
  | "curve.applied"
  // Clinical
  | "clinical_shift.created"
  | "clinical_shift.booked"
  | "clinical_shift.cancelled"
  | "patient_contact.created"
  | "patient_contact.verified"
  // Admin
  | "settings.updated"
  | "subscription.changed"
  | "data.exported"
  | "data.imported"
  | "bulk_action.performed";

export interface AuditLogEntry {
  id?: string;
  tenant_id: string;
  user_id: string;
  user_email?: string;
  event_type: AuditEventType;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

// Log an audit event
export async function logAuditEvent(entry: Omit<AuditLogEntry, "id" | "created_at">): Promise<void> {
  try {
    const supabase = createClient();

    // Use type assertion since audit_logs may not be in generated types yet
    await (supabase as any).from("audit_logs").insert({
      tenant_id: entry.tenant_id,
      user_id: entry.user_id,
      user_email: entry.user_email,
      event_type: entry.event_type,
      resource_type: entry.resource_type,
      resource_id: entry.resource_id,
      details: entry.details,
      ip_address: entry.ip_address,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    });
  } catch (error) {
    // Don't throw - audit logging should never break the app
    console.error("Failed to log audit event:", error);
  }
}

// Helper to create audit logger for a specific context
export function createAuditLogger(tenantId: string, userId: string, userEmail?: string) {
  return {
    log: (
      eventType: AuditEventType,
      resourceType: string,
      resourceId?: string,
      details?: Record<string, unknown>
    ) => {
      return logAuditEvent({
        tenant_id: tenantId,
        user_id: userId,
        user_email: userEmail,
        event_type: eventType,
        resource_type: resourceType,
        resource_id: resourceId,
        details,
      });
    },

    // Convenience methods
    logLogin: () =>
      logAuditEvent({
        tenant_id: tenantId,
        user_id: userId,
        user_email: userEmail,
        event_type: "auth.login",
        resource_type: "session",
      }),

    logLogout: () =>
      logAuditEvent({
        tenant_id: tenantId,
        user_id: userId,
        user_email: userEmail,
        event_type: "auth.logout",
        resource_type: "session",
      }),

    logGradeChange: (
      submissionId: string,
      oldScore: number,
      newScore: number,
      reason?: string
    ) =>
      logAuditEvent({
        tenant_id: tenantId,
        user_id: userId,
        user_email: userEmail,
        event_type: "grade.modified",
        resource_type: "submission",
        resource_id: submissionId,
        details: { old_score: oldScore, new_score: newScore, reason },
      }),

    logCurveApplied: (assignmentId: string, curveType: string, parameters: unknown) =>
      logAuditEvent({
        tenant_id: tenantId,
        user_id: userId,
        user_email: userEmail,
        event_type: "curve.applied",
        resource_type: "assignment",
        resource_id: assignmentId,
        details: { curve_type: curveType, parameters },
      }),

    logUserRoleChange: (targetUserId: string, oldRole: string, newRole: string) =>
      logAuditEvent({
        tenant_id: tenantId,
        user_id: userId,
        user_email: userEmail,
        event_type: "user.role_changed",
        resource_type: "user",
        resource_id: targetUserId,
        details: { old_role: oldRole, new_role: newRole },
      }),

    logDataExport: (exportType: string, recordCount: number) =>
      logAuditEvent({
        tenant_id: tenantId,
        user_id: userId,
        user_email: userEmail,
        event_type: "data.exported",
        resource_type: exportType,
        details: { record_count: recordCount },
      }),

    logBulkAction: (action: string, resourceType: string, resourceIds: string[]) =>
      logAuditEvent({
        tenant_id: tenantId,
        user_id: userId,
        user_email: userEmail,
        event_type: "bulk_action.performed",
        resource_type: resourceType,
        details: { action, resource_ids: resourceIds, count: resourceIds.length },
      }),
  };
}

// Format event type for display
export function formatEventType(eventType: AuditEventType): string {
  const formats: Record<string, string> = {
    "auth.login": "User logged in",
    "auth.logout": "User logged out",
    "auth.password_change": "Password changed",
    "auth.password_reset": "Password reset requested",
    "auth.mfa_enabled": "MFA enabled",
    "auth.mfa_disabled": "MFA disabled",
    "user.created": "User created",
    "user.updated": "User updated",
    "user.deleted": "User deleted",
    "user.role_changed": "User role changed",
    "user.suspended": "User suspended",
    "user.reactivated": "User reactivated",
    "course.created": "Course created",
    "course.updated": "Course updated",
    "course.deleted": "Course deleted",
    "course.published": "Course published",
    "course.archived": "Course archived",
    "enrollment.created": "Student enrolled",
    "enrollment.dropped": "Student dropped",
    "enrollment.completed": "Course completed",
    "assignment.created": "Assignment created",
    "assignment.published": "Assignment published",
    "submission.created": "Assignment submitted",
    "submission.graded": "Submission graded",
    "grade.modified": "Grade modified",
    "curve.applied": "Curve applied",
    "clinical_shift.created": "Clinical shift created",
    "clinical_shift.booked": "Clinical shift booked",
    "clinical_shift.cancelled": "Clinical shift cancelled",
    "patient_contact.created": "Patient contact logged",
    "patient_contact.verified": "Patient contact verified",
    "settings.updated": "Settings updated",
    "subscription.changed": "Subscription changed",
    "data.exported": "Data exported",
    "data.imported": "Data imported",
    "bulk_action.performed": "Bulk action performed",
  };

  return formats[eventType] || eventType;
}

// Event severity for filtering/display
export function getEventSeverity(eventType: AuditEventType): "info" | "warning" | "critical" {
  const critical = [
    "auth.password_change",
    "auth.password_reset",
    "auth.mfa_disabled",
    "user.deleted",
    "user.suspended",
    "user.role_changed",
    "course.deleted",
    "grade.modified",
    "data.exported",
    "subscription.changed",
  ];

  const warning = [
    "user.updated",
    "course.archived",
    "enrollment.dropped",
    "clinical_shift.cancelled",
    "curve.applied",
    "bulk_action.performed",
  ];

  if (critical.includes(eventType)) return "critical";
  if (warning.includes(eventType)) return "warning";
  return "info";
}
