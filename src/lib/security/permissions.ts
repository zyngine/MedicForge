// Role-based access control system

export type UserRole = "admin" | "instructor" | "student";

export type Permission =
  // Course permissions
  | "course.create"
  | "course.read"
  | "course.update"
  | "course.delete"
  | "course.publish"
  | "course.archive"
  // Module permissions
  | "module.create"
  | "module.read"
  | "module.update"
  | "module.delete"
  // Lesson permissions
  | "lesson.create"
  | "lesson.read"
  | "lesson.update"
  | "lesson.delete"
  // Assignment permissions
  | "assignment.create"
  | "assignment.read"
  | "assignment.update"
  | "assignment.delete"
  | "assignment.publish"
  // Submission permissions
  | "submission.create"
  | "submission.read"
  | "submission.read_own"
  | "submission.grade"
  // Grade permissions
  | "grade.read"
  | "grade.read_own"
  | "grade.update"
  | "grade.apply_curve"
  | "grade.export"
  // User management
  | "user.create"
  | "user.read"
  | "user.update"
  | "user.delete"
  | "user.change_role"
  | "user.impersonate"
  // Enrollment
  | "enrollment.create"
  | "enrollment.read"
  | "enrollment.update"
  | "enrollment.delete"
  // Clinical
  | "clinical_site.create"
  | "clinical_site.read"
  | "clinical_site.update"
  | "clinical_site.delete"
  | "clinical_shift.create"
  | "clinical_shift.read"
  | "clinical_shift.update"
  | "clinical_shift.delete"
  | "clinical_shift.book"
  | "clinical_shift.cancel"
  | "patient_contact.create"
  | "patient_contact.read"
  | "patient_contact.read_own"
  | "patient_contact.verify"
  // Competency
  | "skill.create"
  | "skill.read"
  | "skill.update"
  | "skill.delete"
  | "skill_attempt.create"
  | "skill_attempt.read"
  | "skill_attempt.verify"
  // Discussion
  | "discussion.create"
  | "discussion.read"
  | "discussion.update"
  | "discussion.delete"
  | "discussion.moderate"
  // Announcement
  | "announcement.create"
  | "announcement.read"
  | "announcement.update"
  | "announcement.delete"
  // Settings
  | "settings.read"
  | "settings.update"
  // Subscription/Billing
  | "billing.read"
  | "billing.update"
  // Reports
  | "report.view"
  | "report.export"
  // Audit
  | "audit.read";

// Role-permission mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Admins have all permissions
    "course.create", "course.read", "course.update", "course.delete", "course.publish", "course.archive",
    "module.create", "module.read", "module.update", "module.delete",
    "lesson.create", "lesson.read", "lesson.update", "lesson.delete",
    "assignment.create", "assignment.read", "assignment.update", "assignment.delete", "assignment.publish",
    "submission.create", "submission.read", "submission.read_own", "submission.grade",
    "grade.read", "grade.read_own", "grade.update", "grade.apply_curve", "grade.export",
    "user.create", "user.read", "user.update", "user.delete", "user.change_role", "user.impersonate",
    "enrollment.create", "enrollment.read", "enrollment.update", "enrollment.delete",
    "clinical_site.create", "clinical_site.read", "clinical_site.update", "clinical_site.delete",
    "clinical_shift.create", "clinical_shift.read", "clinical_shift.update", "clinical_shift.delete", "clinical_shift.book", "clinical_shift.cancel",
    "patient_contact.create", "patient_contact.read", "patient_contact.read_own", "patient_contact.verify",
    "skill.create", "skill.read", "skill.update", "skill.delete",
    "skill_attempt.create", "skill_attempt.read", "skill_attempt.verify",
    "discussion.create", "discussion.read", "discussion.update", "discussion.delete", "discussion.moderate",
    "announcement.create", "announcement.read", "announcement.update", "announcement.delete",
    "settings.read", "settings.update",
    "billing.read", "billing.update",
    "report.view", "report.export",
    "audit.read",
  ],
  instructor: [
    // Instructors can manage courses and grade students
    "course.create", "course.read", "course.update", "course.publish", "course.archive",
    "module.create", "module.read", "module.update", "module.delete",
    "lesson.create", "lesson.read", "lesson.update", "lesson.delete",
    "assignment.create", "assignment.read", "assignment.update", "assignment.delete", "assignment.publish",
    "submission.read", "submission.grade",
    "grade.read", "grade.update", "grade.apply_curve", "grade.export",
    "user.read",
    "enrollment.create", "enrollment.read", "enrollment.update",
    "clinical_site.read",
    "clinical_shift.create", "clinical_shift.read", "clinical_shift.update", "clinical_shift.delete",
    "patient_contact.read", "patient_contact.verify",
    "skill.read",
    "skill_attempt.read", "skill_attempt.verify",
    "discussion.create", "discussion.read", "discussion.update", "discussion.moderate",
    "announcement.create", "announcement.read", "announcement.update", "announcement.delete",
    "report.view", "report.export",
  ],
  student: [
    // Students have limited permissions
    "course.read",
    "module.read",
    "lesson.read",
    "assignment.read",
    "submission.create", "submission.read_own",
    "grade.read_own",
    "clinical_shift.read", "clinical_shift.book", "clinical_shift.cancel",
    "patient_contact.create", "patient_contact.read_own",
    "skill.read",
    "skill_attempt.create",
    "discussion.create", "discussion.read",
    "announcement.read",
  ],
};

// Check if a role has a specific permission
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// Check if a role has any of the specified permissions
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

// Check if a role has all of the specified permissions
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

// Get all permissions for a role
export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

// Permission categories for UI display
export const PERMISSION_CATEGORIES = {
  courses: {
    label: "Courses",
    permissions: ["course.create", "course.read", "course.update", "course.delete", "course.publish", "course.archive"],
  },
  content: {
    label: "Content",
    permissions: ["module.create", "module.read", "module.update", "module.delete", "lesson.create", "lesson.read", "lesson.update", "lesson.delete"],
  },
  assignments: {
    label: "Assignments",
    permissions: ["assignment.create", "assignment.read", "assignment.update", "assignment.delete", "assignment.publish"],
  },
  grading: {
    label: "Grading",
    permissions: ["submission.read", "submission.grade", "grade.read", "grade.update", "grade.apply_curve", "grade.export"],
  },
  users: {
    label: "Users",
    permissions: ["user.create", "user.read", "user.update", "user.delete", "user.change_role"],
  },
  clinical: {
    label: "Clinical",
    permissions: [
      "clinical_site.create", "clinical_site.read", "clinical_site.update", "clinical_site.delete",
      "clinical_shift.create", "clinical_shift.read", "clinical_shift.update", "clinical_shift.delete",
      "patient_contact.read", "patient_contact.verify",
    ],
  },
  settings: {
    label: "Settings",
    permissions: ["settings.read", "settings.update", "billing.read", "billing.update"],
  },
} as const;

// Human-readable permission names
export const PERMISSION_LABELS: Record<Permission, string> = {
  "course.create": "Create courses",
  "course.read": "View courses",
  "course.update": "Edit courses",
  "course.delete": "Delete courses",
  "course.publish": "Publish courses",
  "course.archive": "Archive courses",
  "module.create": "Create modules",
  "module.read": "View modules",
  "module.update": "Edit modules",
  "module.delete": "Delete modules",
  "lesson.create": "Create lessons",
  "lesson.read": "View lessons",
  "lesson.update": "Edit lessons",
  "lesson.delete": "Delete lessons",
  "assignment.create": "Create assignments",
  "assignment.read": "View assignments",
  "assignment.update": "Edit assignments",
  "assignment.delete": "Delete assignments",
  "assignment.publish": "Publish assignments",
  "submission.create": "Submit assignments",
  "submission.read": "View all submissions",
  "submission.read_own": "View own submissions",
  "submission.grade": "Grade submissions",
  "grade.read": "View all grades",
  "grade.read_own": "View own grades",
  "grade.update": "Update grades",
  "grade.apply_curve": "Apply grade curves",
  "grade.export": "Export grades",
  "user.create": "Create users",
  "user.read": "View users",
  "user.update": "Edit users",
  "user.delete": "Delete users",
  "user.change_role": "Change user roles",
  "user.impersonate": "Impersonate users",
  "enrollment.create": "Enroll students",
  "enrollment.read": "View enrollments",
  "enrollment.update": "Update enrollments",
  "enrollment.delete": "Remove enrollments",
  "clinical_site.create": "Create clinical sites",
  "clinical_site.read": "View clinical sites",
  "clinical_site.update": "Edit clinical sites",
  "clinical_site.delete": "Delete clinical sites",
  "clinical_shift.create": "Create clinical shifts",
  "clinical_shift.read": "View clinical shifts",
  "clinical_shift.update": "Edit clinical shifts",
  "clinical_shift.delete": "Delete clinical shifts",
  "clinical_shift.book": "Book clinical shifts",
  "clinical_shift.cancel": "Cancel shift bookings",
  "patient_contact.create": "Log patient contacts",
  "patient_contact.read": "View all patient contacts",
  "patient_contact.read_own": "View own patient contacts",
  "patient_contact.verify": "Verify patient contacts",
  "skill.create": "Create skills",
  "skill.read": "View skills",
  "skill.update": "Edit skills",
  "skill.delete": "Delete skills",
  "skill_attempt.create": "Record skill attempts",
  "skill_attempt.read": "View skill attempts",
  "skill_attempt.verify": "Verify skill attempts",
  "discussion.create": "Create discussions",
  "discussion.read": "View discussions",
  "discussion.update": "Edit discussions",
  "discussion.delete": "Delete discussions",
  "discussion.moderate": "Moderate discussions",
  "announcement.create": "Create announcements",
  "announcement.read": "View announcements",
  "announcement.update": "Edit announcements",
  "announcement.delete": "Delete announcements",
  "settings.read": "View settings",
  "settings.update": "Update settings",
  "billing.read": "View billing",
  "billing.update": "Update billing",
  "report.view": "View reports",
  "report.export": "Export reports",
  "audit.read": "View audit logs",
};

// React hook for permission checking
export function usePermission(role: UserRole | undefined) {
  return {
    can: (permission: Permission) => role ? hasPermission(role, permission) : false,
    canAny: (permissions: Permission[]) => role ? hasAnyPermission(role, permissions) : false,
    canAll: (permissions: Permission[]) => role ? hasAllPermissions(role, permissions) : false,
    permissions: role ? getPermissions(role) : [],
  };
}
