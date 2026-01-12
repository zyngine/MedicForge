"use client";

// Course analytics and metrics calculations

export interface CourseMetrics {
  // Enrollment metrics
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  droppedEnrollments: number;
  enrollmentRate: number; // % of course capacity filled

  // Engagement metrics
  averageProgress: number;
  averageTimeSpent: number; // in minutes
  lastWeekActiveUsers: number;
  averageSessionDuration: number;

  // Performance metrics
  averageGrade: number;
  medianGrade: number;
  passRate: number;
  gradeDistribution: {
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
  };

  // Assignment metrics
  totalAssignments: number;
  averageSubmissionRate: number;
  averageScore: number;
  lateSubmissionRate: number;

  // At-risk indicators
  atRiskStudents: number;
  inactiveStudents: number;
}

export interface StudentMetrics {
  userId: string;
  name: string;
  email: string;

  // Progress
  overallProgress: number;
  lessonsCompleted: number;
  totalLessons: number;

  // Performance
  currentGrade: number;
  assignmentsSubmitted: number;
  assignmentsTotal: number;
  averageScore: number;

  // Engagement
  totalTimeSpent: number;
  lastActiveAt: Date | null;
  loginCount: number;
  discussionPosts: number;

  // Clinical (if applicable)
  clinicalHours: number;
  requiredClinicalHours: number;
  patientContacts: number;
  requiredPatientContacts: number;
  skillsCompleted: number;
  skillsRequired: number;

  // Risk assessment
  riskLevel: "low" | "medium" | "high";
  riskFactors: string[];
}

// Calculate course-wide metrics
export function calculateCourseMetrics(
  enrollments: Array<{
    status: "active" | "completed" | "dropped";
    progress: number;
    lastActivityAt?: Date;
  }>,
  submissions: Array<{
    studentId: string;
    score: number;
    maxScore: number;
    submittedAt: Date;
    dueDate: Date;
  }>,
  maxCapacity: number
): CourseMetrics {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Enrollment counts
  const activeEnrollments = enrollments.filter((e) => e.status === "active").length;
  const completedEnrollments = enrollments.filter((e) => e.status === "completed").length;
  const droppedEnrollments = enrollments.filter((e) => e.status === "dropped").length;
  const totalEnrollments = enrollments.length;

  // Progress
  const progressValues = enrollments.filter((e) => e.status !== "dropped").map((e) => e.progress);
  const averageProgress = progressValues.length > 0
    ? progressValues.reduce((a, b) => a + b, 0) / progressValues.length
    : 0;

  // Active users last week
  const lastWeekActiveUsers = enrollments.filter(
    (e) => e.lastActivityAt && new Date(e.lastActivityAt) >= oneWeekAgo
  ).length;

  // Calculate grades
  const studentGrades = new Map<string, number[]>();
  submissions.forEach((s) => {
    if (!studentGrades.has(s.studentId)) {
      studentGrades.set(s.studentId, []);
    }
    studentGrades.get(s.studentId)!.push((s.score / s.maxScore) * 100);
  });

  const averageGrades = Array.from(studentGrades.values()).map(
    (grades) => grades.reduce((a, b) => a + b, 0) / grades.length
  );

  const averageGrade = averageGrades.length > 0
    ? averageGrades.reduce((a, b) => a + b, 0) / averageGrades.length
    : 0;

  const sortedGrades = [...averageGrades].sort((a, b) => a - b);
  const medianGrade = sortedGrades.length > 0
    ? sortedGrades[Math.floor(sortedGrades.length / 2)]
    : 0;

  const passRate = averageGrades.length > 0
    ? (averageGrades.filter((g) => g >= 70).length / averageGrades.length) * 100
    : 0;

  // Grade distribution
  const gradeDistribution = {
    A: averageGrades.filter((g) => g >= 90).length,
    B: averageGrades.filter((g) => g >= 80 && g < 90).length,
    C: averageGrades.filter((g) => g >= 70 && g < 80).length,
    D: averageGrades.filter((g) => g >= 60 && g < 70).length,
    F: averageGrades.filter((g) => g < 60).length,
  };

  // Submission metrics
  const uniqueAssignments = new Set(submissions.map((s) => `${s.studentId}-${s.dueDate}`));
  const lateSubmissions = submissions.filter(
    (s) => new Date(s.submittedAt) > new Date(s.dueDate)
  ).length;

  // At-risk students (progress < 50% or grade < 70%)
  const atRiskStudents = enrollments.filter((e) => {
    if (e.status !== "active") return false;
    const studentGrade = studentGrades.get(e.status);
    const avgGrade = studentGrade
      ? studentGrade.reduce((a, b) => a + b, 0) / studentGrade.length
      : null;
    return e.progress < 50 || (avgGrade !== null && avgGrade < 70);
  }).length;

  // Inactive students (no activity in 2 weeks)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const inactiveStudents = enrollments.filter(
    (e) => e.status === "active" && (!e.lastActivityAt || new Date(e.lastActivityAt) < twoWeeksAgo)
  ).length;

  return {
    totalEnrollments,
    activeEnrollments,
    completedEnrollments,
    droppedEnrollments,
    enrollmentRate: maxCapacity > 0 ? (totalEnrollments / maxCapacity) * 100 : 0,
    averageProgress,
    averageTimeSpent: 0, // Would need session data
    lastWeekActiveUsers,
    averageSessionDuration: 0, // Would need session data
    averageGrade,
    medianGrade,
    passRate,
    gradeDistribution,
    totalAssignments: uniqueAssignments.size,
    averageSubmissionRate: 0, // Would need assignment count
    averageScore: submissions.length > 0
      ? submissions.reduce((acc, s) => acc + (s.score / s.maxScore) * 100, 0) / submissions.length
      : 0,
    lateSubmissionRate: submissions.length > 0
      ? (lateSubmissions / submissions.length) * 100
      : 0,
    atRiskStudents,
    inactiveStudents,
  };
}

// Calculate individual student risk level
export function calculateStudentRisk(
  student: Omit<StudentMetrics, "riskLevel" | "riskFactors">
): { riskLevel: "low" | "medium" | "high"; riskFactors: string[] } {
  const riskFactors: string[] = [];
  let riskScore = 0;

  // Check progress
  if (student.overallProgress < 25) {
    riskFactors.push("Very low course progress");
    riskScore += 3;
  } else if (student.overallProgress < 50) {
    riskFactors.push("Low course progress");
    riskScore += 2;
  }

  // Check grade
  if (student.currentGrade < 60) {
    riskFactors.push("Failing grade");
    riskScore += 3;
  } else if (student.currentGrade < 70) {
    riskFactors.push("Below passing grade");
    riskScore += 2;
  }

  // Check activity
  if (student.lastActiveAt) {
    const daysSinceActive = Math.floor(
      (Date.now() - new Date(student.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceActive > 14) {
      riskFactors.push("Inactive for over 2 weeks");
      riskScore += 3;
    } else if (daysSinceActive > 7) {
      riskFactors.push("Inactive for over 1 week");
      riskScore += 1;
    }
  } else {
    riskFactors.push("No recorded activity");
    riskScore += 2;
  }

  // Check assignment completion
  const assignmentCompletion = student.assignmentsTotal > 0
    ? (student.assignmentsSubmitted / student.assignmentsTotal) * 100
    : 100;
  if (assignmentCompletion < 50) {
    riskFactors.push("Missing multiple assignments");
    riskScore += 2;
  }

  // Check clinical progress (if applicable)
  if (student.requiredClinicalHours > 0) {
    const hoursCompletion = (student.clinicalHours / student.requiredClinicalHours) * 100;
    if (hoursCompletion < 50) {
      riskFactors.push("Behind on clinical hours");
      riskScore += 2;
    }
  }

  // Determine risk level
  let riskLevel: "low" | "medium" | "high";
  if (riskScore >= 6) {
    riskLevel = "high";
  } else if (riskScore >= 3) {
    riskLevel = "medium";
  } else {
    riskLevel = "low";
  }

  return { riskLevel, riskFactors };
}

// Trend analysis
export interface TrendData {
  period: string;
  value: number;
}

export function calculateTrend(data: TrendData[]): {
  direction: "up" | "down" | "stable";
  percentChange: number;
  average: number;
} {
  if (data.length < 2) {
    return { direction: "stable", percentChange: 0, average: data[0]?.value || 0 };
  }

  const values = data.map((d) => d.value);
  const average = values.reduce((a, b) => a + b, 0) / values.length;

  // Compare last two periods
  const current = values[values.length - 1];
  const previous = values[values.length - 2];

  const percentChange = previous !== 0 ? ((current - previous) / previous) * 100 : 0;

  let direction: "up" | "down" | "stable";
  if (percentChange > 5) {
    direction = "up";
  } else if (percentChange < -5) {
    direction = "down";
  } else {
    direction = "stable";
  }

  return { direction, percentChange, average };
}

// Engagement score calculation
export function calculateEngagementScore(
  loginFrequency: number, // logins per week
  timeSpent: number, // minutes per week
  assignmentsOnTime: number, // percentage
  discussionParticipation: number // posts per week
): number {
  // Weighted engagement score (0-100)
  const loginScore = Math.min(loginFrequency / 5, 1) * 25; // Max 5 logins/week = 25 points
  const timeScore = Math.min(timeSpent / 300, 1) * 35; // Max 300 min/week = 35 points
  const assignmentScore = (assignmentsOnTime / 100) * 25; // 100% on time = 25 points
  const discussionScore = Math.min(discussionParticipation / 3, 1) * 15; // Max 3 posts/week = 15 points

  return Math.round(loginScore + timeScore + assignmentScore + discussionScore);
}

// NREMT readiness assessment
export interface NREMTReadiness {
  overallScore: number;
  categories: Array<{
    name: string;
    required: number;
    completed: number;
    percentage: number;
  }>;
  clinicalHoursProgress: number;
  patientContactsProgress: number;
  teamLeadProgress: number;
  isReady: boolean;
  missingRequirements: string[];
}

export function assessNREMTReadiness(
  skills: Array<{ category: string; required: number; completed: number }>,
  clinicalHours: { completed: number; required: number },
  patientContacts: { completed: number; required: number },
  teamLeadCalls: { completed: number; required: number }
): NREMTReadiness {
  const categories = skills.map((s) => ({
    name: s.category,
    required: s.required,
    completed: s.completed,
    percentage: s.required > 0 ? (s.completed / s.required) * 100 : 100,
  }));

  const clinicalHoursProgress = clinicalHours.required > 0
    ? (clinicalHours.completed / clinicalHours.required) * 100
    : 100;

  const patientContactsProgress = patientContacts.required > 0
    ? (patientContacts.completed / patientContacts.required) * 100
    : 100;

  const teamLeadProgress = teamLeadCalls.required > 0
    ? (teamLeadCalls.completed / teamLeadCalls.required) * 100
    : 100;

  // Calculate overall score
  const categoryScores = categories.map((c) => Math.min(c.percentage, 100));
  const allScores = [
    ...categoryScores,
    clinicalHoursProgress,
    patientContactsProgress,
    teamLeadProgress,
  ];
  const overallScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;

  // Check missing requirements
  const missingRequirements: string[] = [];

  categories.forEach((c) => {
    if (c.completed < c.required) {
      missingRequirements.push(`${c.name}: ${c.required - c.completed} more needed`);
    }
  });

  if (clinicalHours.completed < clinicalHours.required) {
    missingRequirements.push(
      `Clinical Hours: ${clinicalHours.required - clinicalHours.completed} more hours needed`
    );
  }

  if (patientContacts.completed < patientContacts.required) {
    missingRequirements.push(
      `Patient Contacts: ${patientContacts.required - patientContacts.completed} more contacts needed`
    );
  }

  if (teamLeadCalls.completed < teamLeadCalls.required) {
    missingRequirements.push(
      `Team Lead Calls: ${teamLeadCalls.required - teamLeadCalls.completed} more calls needed`
    );
  }

  return {
    overallScore,
    categories,
    clinicalHoursProgress,
    patientContactsProgress,
    teamLeadProgress,
    isReady: missingRequirements.length === 0,
    missingRequirements,
  };
}
