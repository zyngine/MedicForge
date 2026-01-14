"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";

export interface PredictionFactors {
  // Quiz/Test Performance (35% weight)
  quizAverage: number;
  quizConsistency: number; // Standard deviation
  recentTrend: "improving" | "declining" | "stable";

  // Skill Sheet Performance (25% weight)
  skillPassRate: number;
  skillFirstAttemptRate: number;
  criticalFailureRate: number;

  // Clinical Performance (20% weight)
  clinicalHoursCompleted: number;
  clinicalHoursRequired: number;
  patientContactsCompleted: number;
  patientContactsRequired: number;
  teamLeadExperiences: number;

  // Engagement Metrics (10% weight)
  courseCompletionRate: number;
  assignmentCompletionRate: number;
  averageTimeOnTask: number;

  // Study Habits (10% weight)
  studySessionFrequency: number; // per week
  contentReviewRate: number;
  practiceTestAttempts: number;
}

export interface PredictionResult {
  passLikelihood: number; // 0-100
  confidenceLevel: "low" | "medium" | "high";
  riskLevel: "low" | "moderate" | "high" | "critical";
  strongAreas: string[];
  improvementAreas: string[];
  recommendations: {
    category: string;
    priority: "high" | "medium" | "low";
    action: string;
    estimatedImpact: number; // points improvement
  }[];
  factors: PredictionFactors;
  lastUpdated: string;
}

export interface NREMTPredictionConfig {
  // Weight configuration
  weights: {
    quizPerformance: number;
    skillSheets: number;
    clinicalExperience: number;
    engagement: number;
    studyHabits: number;
  };
  // Thresholds
  thresholds: {
    passing: number;
    atRisk: number;
    critical: number;
  };
}

const DEFAULT_CONFIG: NREMTPredictionConfig = {
  weights: {
    quizPerformance: 0.35,
    skillSheets: 0.25,
    clinicalExperience: 0.20,
    engagement: 0.10,
    studyHabits: 0.10,
  },
  thresholds: {
    passing: 75,
    atRisk: 65,
    critical: 50,
  },
};

// Required clinical hours by certification level
const CLINICAL_REQUIREMENTS: Record<string, { hours: number; contacts: number }> = {
  EMR: { hours: 0, contacts: 0 },
  EMT: { hours: 10, contacts: 10 },
  AEMT: { hours: 100, contacts: 50 },
  Paramedic: { hours: 500, contacts: 150 },
};

export function useNREMTPrediction(studentId?: string, certificationLevel: string = "EMT") {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { profile } = useUser();
  const supabase = createClient();

  const effectiveStudentId = studentId || profile?.id;
  const config = DEFAULT_CONFIG;

  const calculatePrediction = useCallback(async () => {
    if (!effectiveStudentId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch all required data in parallel
      const [
        submissionsResult,
        skillAttemptsResult,
        clinicalLogsResult,
        patientContactsResult,
        progressResult,
      ] = await Promise.all([
        // Quiz/Test submissions
        (supabase as any)
          .from("submissions")
          .select("final_score, submitted_at, assignment:assignments(type)")
          .eq("student_id", effectiveStudentId)
          .eq("status", "graded")
          .order("submitted_at", { ascending: false }),

        // Skill sheet attempts
        (supabase as any)
          .from("skill_sheet_attempts")
          .select("status, attempt_number, critical_failures")
          .eq("student_id", effectiveStudentId),

        // Clinical logs (hours)
        (supabase as any)
          .from("clinical_logs")
          .select("hours, was_team_lead, verification_status")
          .eq("student_id", effectiveStudentId)
          .eq("verification_status", "verified"),

        // Patient contacts
        (supabase as any)
          .from("clinical_patient_contacts")
          .select("id, was_team_lead, verification_status")
          .eq("student_id", effectiveStudentId)
          .eq("verification_status", "verified"),

        // Lesson progress
        (supabase as any)
          .from("lesson_progress")
          .select("completed_at")
          .eq("student_id", effectiveStudentId),
      ]);

      // Process quiz data
      const submissions = submissionsResult.data || [];
      const quizSubmissions = submissions.filter(
        (s: any) => s.assignment?.type === "quiz" && s.final_score !== null
      );
      const quizScores = quizSubmissions.map((s: any) => s.final_score);
      const quizAverage = quizScores.length > 0
        ? quizScores.reduce((a: number, b: number) => a + b, 0) / quizScores.length
        : 0;

      // Calculate quiz consistency (standard deviation)
      const quizStdDev = quizScores.length > 1
        ? Math.sqrt(
            quizScores.reduce((sum: number, score: number) =>
              sum + Math.pow(score - quizAverage, 2), 0
            ) / quizScores.length
          )
        : 0;

      // Calculate recent trend (last 5 vs previous 5)
      let recentTrend: "improving" | "declining" | "stable" = "stable";
      if (quizScores.length >= 5) {
        const recent5 = quizScores.slice(0, 5);
        const previous5 = quizScores.slice(5, 10);
        if (previous5.length >= 3) {
          const recentAvg = recent5.reduce((a: number, b: number) => a + b, 0) / recent5.length;
          const prevAvg = previous5.reduce((a: number, b: number) => a + b, 0) / previous5.length;
          if (recentAvg > prevAvg + 5) recentTrend = "improving";
          else if (recentAvg < prevAvg - 5) recentTrend = "declining";
        }
      }

      // Process skill sheet data
      const skillAttempts = skillAttemptsResult.data || [];
      const passedSkills = skillAttempts.filter((s: any) => s.status === "passed");
      const firstAttemptPasses = passedSkills.filter((s: any) => s.attempt_number === 1);
      const criticalFailures = skillAttempts.filter(
        (s: any) => s.critical_failures && s.critical_failures.length > 0
      );

      const skillPassRate = skillAttempts.length > 0
        ? (passedSkills.length / skillAttempts.length) * 100
        : 0;
      const skillFirstAttemptRate = passedSkills.length > 0
        ? (firstAttemptPasses.length / passedSkills.length) * 100
        : 0;
      const criticalFailureRate = skillAttempts.length > 0
        ? (criticalFailures.length / skillAttempts.length) * 100
        : 0;

      // Process clinical data
      const clinicalLogs = clinicalLogsResult.data || [];
      const patientContacts = patientContactsResult.data || [];
      const requirements = CLINICAL_REQUIREMENTS[certificationLevel] || { hours: 0, contacts: 0 };

      const clinicalHoursCompleted = clinicalLogs.reduce(
        (sum: number, log: any) => sum + (log.hours || 0), 0
      );
      const teamLeadExperiences = [
        ...clinicalLogs.filter((l: any) => l.was_team_lead),
        ...patientContacts.filter((c: any) => c.was_team_lead),
      ].length;

      // Process engagement data
      const progressData = progressResult.data || [];
      const assignmentCompletionRate = submissions.length > 0 ? 85 : 0; // Simplified
      const courseCompletionRate = progressData.length > 0 ?
        (progressData.filter((p: any) => p.completed_at).length / progressData.length) * 100 : 0;

      // Build factors object
      const factors: PredictionFactors = {
        quizAverage,
        quizConsistency: 100 - Math.min(quizStdDev, 30) * 3.33, // Convert to score
        recentTrend,
        skillPassRate,
        skillFirstAttemptRate,
        criticalFailureRate,
        clinicalHoursCompleted,
        clinicalHoursRequired: requirements.hours,
        patientContactsCompleted: patientContacts.length,
        patientContactsRequired: requirements.contacts,
        teamLeadExperiences,
        courseCompletionRate,
        assignmentCompletionRate,
        averageTimeOnTask: 0, // Would need session tracking
        studySessionFrequency: 3, // Default
        contentReviewRate: courseCompletionRate,
        practiceTestAttempts: quizSubmissions.length,
      };

      // Calculate weighted score
      const quizScore = (quizAverage * 0.7 + factors.quizConsistency * 0.3) *
        (recentTrend === "improving" ? 1.05 : recentTrend === "declining" ? 0.95 : 1);

      const skillScore = skillPassRate * 0.5 +
        skillFirstAttemptRate * 0.3 +
        (100 - criticalFailureRate) * 0.2;

      const clinicalScore = requirements.hours > 0
        ? Math.min((clinicalHoursCompleted / requirements.hours) * 50 +
            (patientContacts.length / requirements.contacts) * 50, 100)
        : 100;

      const engagementScore = (courseCompletionRate + assignmentCompletionRate) / 2;

      const studyScore = Math.min(factors.practiceTestAttempts * 10, 100) * 0.5 +
        factors.contentReviewRate * 0.5;

      const passLikelihood = Math.round(
        quizScore * config.weights.quizPerformance +
        skillScore * config.weights.skillSheets +
        clinicalScore * config.weights.clinicalExperience +
        engagementScore * config.weights.engagement +
        studyScore * config.weights.studyHabits
      );

      // Determine risk level
      let riskLevel: "low" | "moderate" | "high" | "critical";
      if (passLikelihood >= config.thresholds.passing) riskLevel = "low";
      else if (passLikelihood >= config.thresholds.atRisk) riskLevel = "moderate";
      else if (passLikelihood >= config.thresholds.critical) riskLevel = "high";
      else riskLevel = "critical";

      // Determine confidence level based on data availability
      const dataPoints = [
        quizScores.length >= 5,
        skillAttempts.length >= 3,
        clinicalHoursCompleted >= requirements.hours * 0.5,
        progressData.length > 0,
      ].filter(Boolean).length;

      const confidenceLevel: "low" | "medium" | "high" =
        dataPoints >= 4 ? "high" : dataPoints >= 2 ? "medium" : "low";

      // Identify strong areas and improvement areas
      const strongAreas: string[] = [];
      const improvementAreas: string[] = [];

      if (quizAverage >= 80) strongAreas.push("Quiz Performance");
      else if (quizAverage < 70) improvementAreas.push("Quiz Performance");

      if (skillPassRate >= 90) strongAreas.push("Psychomotor Skills");
      else if (skillPassRate < 70) improvementAreas.push("Psychomotor Skills");

      if (clinicalScore >= 80) strongAreas.push("Clinical Experience");
      else if (clinicalScore < 50) improvementAreas.push("Clinical Experience");

      if (recentTrend === "improving") strongAreas.push("Performance Trend");
      if (recentTrend === "declining") improvementAreas.push("Performance Trend");

      if (criticalFailureRate === 0) strongAreas.push("Critical Criteria Mastery");
      else if (criticalFailureRate > 20) improvementAreas.push("Critical Criteria");

      // Generate recommendations
      const recommendations: PredictionResult["recommendations"] = [];

      if (quizAverage < 75) {
        recommendations.push({
          category: "Study",
          priority: "high",
          action: "Focus on high-yield topics: Airway, Cardiac, Trauma. Use practice tests to identify weak areas.",
          estimatedImpact: 10,
        });
      }

      if (skillPassRate < 80) {
        recommendations.push({
          category: "Skills",
          priority: "high",
          action: "Schedule additional skill lab time. Practice critical steps until automatic.",
          estimatedImpact: 8,
        });
      }

      if (criticalFailureRate > 10) {
        recommendations.push({
          category: "Skills",
          priority: "high",
          action: "Review critical failure criteria for each skill. These are automatic fails on NREMT.",
          estimatedImpact: 12,
        });
      }

      if (clinicalScore < 70 && requirements.hours > 0) {
        recommendations.push({
          category: "Clinical",
          priority: "medium",
          action: "Complete remaining clinical hours. Focus on diverse patient presentations.",
          estimatedImpact: 6,
        });
      }

      if (teamLeadExperiences < 5) {
        recommendations.push({
          category: "Clinical",
          priority: "medium",
          action: "Request team lead opportunities during clinical rotations.",
          estimatedImpact: 4,
        });
      }

      if (recentTrend === "declining") {
        recommendations.push({
          category: "Study",
          priority: "high",
          action: "Your recent performance is declining. Consider study groups or tutoring.",
          estimatedImpact: 8,
        });
      }

      if (factors.practiceTestAttempts < 10) {
        recommendations.push({
          category: "Study",
          priority: "medium",
          action: "Take more practice exams. Research shows strong correlation with NREMT success.",
          estimatedImpact: 5,
        });
      }

      // Sort recommendations by priority and impact
      recommendations.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return b.estimatedImpact - a.estimatedImpact;
      });

      setPrediction({
        passLikelihood,
        confidenceLevel,
        riskLevel,
        strongAreas,
        improvementAreas,
        recommendations,
        factors,
        lastUpdated: new Date().toISOString(),
      });

    } catch (err) {
      console.error("Failed to calculate prediction:", err);
      setError(err instanceof Error ? err : new Error("Failed to calculate prediction"));
    } finally {
      setIsLoading(false);
    }
  }, [effectiveStudentId, certificationLevel, supabase, config]);

  useEffect(() => {
    calculatePrediction();
  }, [calculatePrediction]);

  return {
    prediction,
    isLoading,
    error,
    refresh: calculatePrediction,
  };
}

// Hook for class-wide analytics (instructor view)
export function useClassPredictionAnalytics(courseId?: string) {
  const [analytics, setAnalytics] = useState<{
    atRiskStudents: number;
    avgPassLikelihood: number;
    distribution: { range: string; count: number }[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!courseId) {
      setIsLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      try {
        // Get enrolled students
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: enrollments } = await (supabase as any)
          .from("enrollments")
          .select("student_id")
          .eq("course_id", courseId)
          .eq("status", "active");

        if (!enrollments || enrollments.length === 0) {
          setAnalytics({
            atRiskStudents: 0,
            avgPassLikelihood: 0,
            distribution: [],
          });
          setIsLoading(false);
          return;
        }

        // For now, return placeholder analytics
        // In production, this would calculate predictions for all students
        setAnalytics({
          atRiskStudents: Math.floor(enrollments.length * 0.15),
          avgPassLikelihood: 72,
          distribution: [
            { range: "90-100%", count: Math.floor(enrollments.length * 0.1) },
            { range: "80-89%", count: Math.floor(enrollments.length * 0.25) },
            { range: "70-79%", count: Math.floor(enrollments.length * 0.35) },
            { range: "60-69%", count: Math.floor(enrollments.length * 0.2) },
            { range: "Below 60%", count: Math.floor(enrollments.length * 0.1) },
          ],
        });
      } catch (err) {
        console.error("Failed to fetch class analytics:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [courseId, supabase]);

  return { analytics, isLoading };
}
