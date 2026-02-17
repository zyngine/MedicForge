"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";

export interface AnalyticsEvent {
  id: string;
  tenant_id: string;
  user_id: string;
  event_type: string;
  event_category: "navigation" | "engagement" | "assessment" | "content" | "system";
  event_data: Record<string, unknown> | null;
  course_id: string | null;
  session_id: string | null;
  created_at: string;
}

export interface DailyMetrics {
  id: string;
  tenant_id: string;
  metric_date: string;
  course_id: string | null;
  active_users: number;
  new_enrollments: number;
  submissions_count: number;
  average_score: number | null;
  content_views: number;
  time_spent_minutes: number;
  created_at: string;
}

export interface StudentEngagement {
  id: string;
  tenant_id: string;
  student_id: string;
  course_id: string;
  week_start: string;
  logins: number;
  content_views: number;
  assignments_submitted: number;
  time_spent_minutes: number;
  discussion_posts: number;
  engagement_score: number;
  created_at: string;
  updated_at: string;
  // Joined
  student?: { id: string; full_name: string; email: string };
}

// Hook for tracking analytics events
export function useAnalyticsTracker() {
  const { profile } = useUser();
  const supabase = createClient();

  const trackEvent = useCallback(async (
    eventType: string,
    eventCategory: AnalyticsEvent["event_category"],
    eventData?: Record<string, unknown>,
    courseId?: string
  ): Promise<void> => {
    if (!profile?.tenant_id || !profile?.id) return;

    try {
      // Get or create session ID
      let sessionId = sessionStorage.getItem("analytics_session_id");
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem("analytics_session_id", sessionId);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("analytics_events")
        .insert({
          tenant_id: profile.tenant_id,
          user_id: profile.id,
          event_type: eventType,
          event_category: eventCategory,
          event_data: eventData || null,
          course_id: courseId || null,
          session_id: sessionId,
        });
    } catch (err) {
      // Silent fail - analytics shouldn't break the app
      console.error("Failed to track event:", err);
    }
  }, [profile?.tenant_id, profile?.id, supabase]);

  // Convenience methods for common events
  const trackPageView = (pagePath: string, courseId?: string) => {
    trackEvent("page_view", "navigation", { path: pagePath }, courseId);
  };

  const trackContentView = (contentType: string, contentId: string, courseId?: string) => {
    trackEvent("content_view", "content", { type: contentType, id: contentId }, courseId);
  };

  const trackAssignmentStart = (assignmentId: string, courseId?: string) => {
    trackEvent("assignment_start", "assessment", { assignment_id: assignmentId }, courseId);
  };

  const trackAssignmentSubmit = (assignmentId: string, courseId?: string) => {
    trackEvent("assignment_submit", "assessment", { assignment_id: assignmentId }, courseId);
  };

  const trackVideoProgress = (videoId: string, progress: number, courseId?: string) => {
    trackEvent("video_progress", "engagement", { video_id: videoId, progress }, courseId);
  };

  const trackTimeSpent = (contentType: string, contentId: string, minutes: number, courseId?: string) => {
    trackEvent("time_spent", "engagement", { type: contentType, id: contentId, minutes }, courseId);
  };

  return {
    trackEvent,
    trackPageView,
    trackContentView,
    trackAssignmentStart,
    trackAssignmentSubmit,
    trackVideoProgress,
    trackTimeSpent,
  };
}

// Hook for course analytics dashboard
export function useCourseAnalytics(courseId: string) {
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics[]>([]);
  const [engagementData, setEngagementData] = useState<StudentEngagement[]>([]);
  const [summary, setSummary] = useState<{
    totalStudents: number;
    activeStudents: number;
    avgEngagementScore: number;
    totalSubmissions: number;
    avgScore: number;
    completionRate: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchAnalytics = useCallback(async () => {
    if (!profile?.tenant_id || !courseId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch daily metrics for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: metrics, error: metricsError } = await (supabase as any)
        .from("daily_metrics")
        .select("*")
        .eq("course_id", courseId)
        .gte("metric_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("metric_date");

      if (metricsError) throw metricsError;
      setDailyMetrics(metrics || []);

      // Fetch student engagement for current week
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: engagement, error: engagementError } = await (supabase as any)
        .from("student_engagement")
        .select(`
          *,
          student:users!student_engagement_student_id_fkey(id, full_name, email)
        `)
        .eq("course_id", courseId)
        .eq("week_start", weekStart.toISOString().split("T")[0])
        .order("engagement_score", { ascending: false });

      if (engagementError) throw engagementError;
      setEngagementData(engagement || []);

      // Calculate summary
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: enrollments } = await (supabase as any)
        .from("enrollments")
        .select("id, student_id, status, completion_percentage")
        .eq("course_id", courseId)
        .eq("status", "active");

      const totalStudents = enrollments?.length || 0;
      const activeStudents = engagement?.filter((e: StudentEngagement) => e.engagement_score > 0).length || 0;
      const avgEngagementScore = engagement?.length
        ? engagement.reduce((a: number, b: StudentEngagement) => a + b.engagement_score, 0) / engagement.length
        : 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: submissions } = await (supabase as any)
        .from("submissions")
        .select("final_score")
        .eq("status", "graded");

      const totalSubmissions = submissions?.length || 0;
      const avgScore = submissions?.length
        ? submissions.reduce((a: number, b: { final_score: number }) => a + (b.final_score || 0), 0) / submissions.length
        : 0;

      const completedCount = enrollments?.filter((e: { completion_percentage: number }) => e.completion_percentage >= 100).length || 0;
      const completionRate = totalStudents > 0 ? (completedCount / totalStudents) * 100 : 0;

      setSummary({
        totalStudents,
        activeStudents,
        avgEngagementScore,
        totalSubmissions,
        avgScore,
        completionRate,
      });
    } catch (err) {
      console.error("Failed to fetch course analytics:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, courseId, supabase]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Calculate engagement trend
  const engagementTrend = dailyMetrics.map((m) => ({
    date: m.metric_date,
    activeUsers: m.active_users,
    submissions: m.submissions_count,
    avgScore: m.average_score,
  }));

  // Identify at-risk students (low engagement)
  const atRiskStudents = engagementData.filter(
    (e) => e.engagement_score < 30 && e.logins < 2
  );

  // Top performers
  const topPerformers = engagementData.slice(0, 5);

  return {
    dailyMetrics,
    engagementData,
    summary,
    engagementTrend,
    atRiskStudents,
    topPerformers,
    isLoading,
    refetch: fetchAnalytics,
  };
}

// Hook for student's own analytics
export function useMyAnalytics(courseId?: string) {
  const [engagement, setEngagement] = useState<StudentEngagement[]>([]);
  const [recentActivity, setRecentActivity] = useState<AnalyticsEvent[]>([]);
  const [stats, setStats] = useState<{
    totalTimeSpent: number;
    assignmentsCompleted: number;
    averageScore: number;
    currentStreak: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  useEffect(() => {
    const fetchMyAnalytics = async () => {
      if (!profile?.tenant_id || !profile?.id) return;

      try {
        setIsLoading(true);

        // Fetch engagement history
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let engagementQuery = (supabase as any)
          .from("student_engagement")
          .select("*")
          .eq("student_id", profile.id)
          .order("week_start", { ascending: false })
          .limit(12);

        if (courseId) {
          engagementQuery = engagementQuery.eq("course_id", courseId);
        }

        const { data: engagementData } = await engagementQuery;
        setEngagement(engagementData || []);

        // Fetch recent activity
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let activityQuery = (supabase as any)
          .from("analytics_events")
          .select("*")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (courseId) {
          activityQuery = activityQuery.eq("course_id", courseId);
        }

        const { data: activityData } = await activityQuery;
        setRecentActivity(activityData || []);

        // Calculate stats
        const totalTimeSpent = engagementData?.reduce(
          (a: number, b: StudentEngagement) => a + b.time_spent_minutes,
          0
        ) || 0;

        const assignmentsCompleted = engagementData?.reduce(
          (a: number, b: StudentEngagement) => a + b.assignments_submitted,
          0
        ) || 0;

        // Fetch submissions for average score
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let submissionsQuery = (supabase as any)
          .from("submissions")
          .select("final_score")
          .eq("student_id", profile.id)
          .eq("status", "graded");

        if (courseId) {
          // Need to join through assignments and modules to filter by course
          // For now, just get all
        }

        const { data: submissions } = await submissionsQuery;
        const averageScore = submissions?.length
          ? submissions.reduce((a: number, b: { final_score: number }) => a + (b.final_score || 0), 0) / submissions.length
          : 0;

        // Calculate login streak
        const loginDates = activityData
          ?.filter((e: AnalyticsEvent) => e.event_type === "page_view")
          .map((e: AnalyticsEvent) => e.created_at.split("T")[0])
          .filter((date: string, index: number, arr: string[]) => arr.indexOf(date) === index)
          .sort()
          .reverse() || [];

        let currentStreak = 0;
        const today = new Date().toISOString().split("T")[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

        if (loginDates[0] === today || loginDates[0] === yesterday) {
          currentStreak = 1;
          for (let i = 1; i < loginDates.length; i++) {
            const prevDate = new Date(loginDates[i - 1]);
            const currDate = new Date(loginDates[i]);
            const diff = (prevDate.getTime() - currDate.getTime()) / 86400000;
            if (diff <= 1) {
              currentStreak++;
            } else {
              break;
            }
          }
        }

        setStats({
          totalTimeSpent,
          assignmentsCompleted,
          averageScore,
          currentStreak,
        });
      } catch (err) {
        console.error("Failed to fetch my analytics:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyAnalytics();
  }, [profile?.tenant_id, profile?.id, courseId, supabase]);

  // Engagement trend over weeks
  const engagementTrend = engagement.map((e) => ({
    week: e.week_start,
    score: e.engagement_score,
    logins: e.logins,
    timeSpent: e.time_spent_minutes,
  }));

  return {
    engagement,
    recentActivity,
    stats,
    engagementTrend,
    isLoading,
  };
}

// Hook for tenant-wide analytics (admin)
export function useTenantAnalytics() {
  const [metrics, setMetrics] = useState<DailyMetrics[]>([]);
  const [summary, setSummary] = useState<{
    totalUsers: number;
    totalCourses: number;
    totalEnrollments: number;
    avgCourseCompletion: number;
    monthlyActiveUsers: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  useEffect(() => {
    const fetchTenantAnalytics = async () => {
      if (!profile?.tenant_id) return;

      try {
        setIsLoading(true);

        // Fetch tenant-wide metrics
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: metricsData } = await (supabase as any)
          .from("daily_metrics")
          .select("*")
          .eq("tenant_id", profile.tenant_id)
          .is("course_id", null) // Tenant-wide metrics
          .gte("metric_date", thirtyDaysAgo.toISOString().split("T")[0])
          .order("metric_date");

        setMetrics(metricsData || []);

        // Fetch counts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count: totalUsers } = await (supabase as any)
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", profile.tenant_id)
          .eq("is_active", true);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count: totalCourses } = await (supabase as any)
          .from("courses")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", profile.tenant_id)
          .eq("is_active", true);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count: totalEnrollments } = await (supabase as any)
          .from("enrollments")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", profile.tenant_id)
          .eq("status", "active");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: enrollments } = await (supabase as any)
          .from("enrollments")
          .select("completion_percentage")
          .eq("tenant_id", profile.tenant_id);

        const avgCourseCompletion = enrollments?.length
          ? enrollments.reduce((a: number, b: { completion_percentage: number }) => a + b.completion_percentage, 0) / enrollments.length
          : 0;

        // Monthly active users from metrics
        const monthlyActiveUsers = metricsData?.reduce(
          (max: number, m: DailyMetrics) => Math.max(max, m.active_users),
          0
        ) || 0;

        setSummary({
          totalUsers: totalUsers || 0,
          totalCourses: totalCourses || 0,
          totalEnrollments: totalEnrollments || 0,
          avgCourseCompletion,
          monthlyActiveUsers,
        });
      } catch (err) {
        console.error("Failed to fetch tenant analytics:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenantAnalytics();
  }, [profile?.tenant_id, supabase]);

  return {
    metrics,
    summary,
    isLoading,
  };
}

// Hook for generating engagement score
export function useEngagementCalculator(courseId: string) {
  const { profile } = useUser();
  const supabase = createClient();

  const calculateEngagement = async (studentId: string): Promise<number> => {
    if (!profile?.tenant_id) return 0;

    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .rpc("calculate_engagement_score", {
          p_student_id: studentId,
          p_course_id: courseId,
          p_week_start: weekStart.toISOString().split("T")[0],
        });

      if (error) throw error;
      return data || 0;
    } catch (err) {
      console.error("Failed to calculate engagement:", err);
      return 0;
    }
  };

  const recalculateAllEngagement = async (): Promise<boolean> => {
    if (!profile?.tenant_id) return false;

    try {
      // Get all enrollments for course
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: enrollments } = await (supabase as any)
        .from("enrollments")
        .select("student_id")
        .eq("course_id", courseId)
        .eq("status", "active");

      for (const enrollment of enrollments || []) {
        await calculateEngagement(enrollment.student_id);
      }

      return true;
    } catch (err) {
      console.error("Failed to recalculate engagement:", err);
      return false;
    }
  };

  return {
    calculateEngagement,
    recalculateAllEngagement,
  };
}
