"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui";
import { BookOpen, Users, Award, TrendingUp, Plus, ArrowRight } from "lucide-react";

interface Stats {
  totalCourses: number;
  publishedCourses: number;
  pendingReview: number;
  totalUsers: number;
  totalEnrollments: number;
  completionsThisMonth: number;
}

interface RecentEnrollment {
  id: string;
  enrolled_at: string;
  ce_users: { first_name: string; last_name: string } | null;
  ce_courses: { title: string } | null;
}

export default function CEAdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();

      const [coursesRes, usersRes, enrollmentsRes, completionsRes, recentRes] = await Promise.all([
        supabase.from("ce_courses").select("status"),
        supabase.from("ce_users").select("id", { count: "exact", head: true }),
        supabase.from("ce_enrollments").select("id", { count: "exact", head: true }),
        supabase
          .from("ce_enrollments")
          .select("id", { count: "exact", head: true })
          .eq("completion_status", "completed")
          .gte("completed_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
        supabase
          .from("ce_enrollments")
          .select("id, enrolled_at, ce_users(first_name, last_name), ce_courses(title)")
          .order("enrolled_at", { ascending: false })
          .limit(5),
      ]);

      const courses = coursesRes.data || [];
      setStats({
        totalCourses: courses.length,
        publishedCourses: courses.filter((c) => c.status === "published").length,
        pendingReview: courses.filter((c) => c.status === "pending_committee_review").length,
        totalUsers: usersRes.count || 0,
        totalEnrollments: enrollmentsRes.count || 0,
        completionsThisMonth: completionsRes.count || 0,
      });

      setRecent((recentRes.data as RecentEnrollment[]) || []);
      setIsLoading(false);
    };
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">CE platform overview</p>
        </div>
        <Link
          href="/ce/admin/courses/new"
          className="inline-flex items-center gap-2 bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Course
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Published Courses", value: stats?.publishedCourses, icon: BookOpen, color: "text-green-700", href: "/ce/admin/courses" },
          { label: "Pending Review", value: stats?.pendingReview, icon: TrendingUp, color: "text-yellow-700", href: "/ce/admin/courses" },
          { label: "Total Courses", value: stats?.totalCourses, icon: BookOpen, color: "text-blue-700", href: "/ce/admin/courses" },
          { label: "Total Users", value: stats?.totalUsers, icon: Users, color: "text-purple-700", href: "/ce/admin/users" },
          { label: "Total Enrollments", value: stats?.totalEnrollments, icon: TrendingUp, color: "text-blue-600", href: "/ce/admin/users" },
          { label: "Completions This Month", value: stats?.completionsThisMonth, icon: Award, color: "text-red-700", href: "/ce/admin/users" },
        ].map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href} className="bg-white border rounded-lg p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className={`text-3xl font-bold mt-1 ${color}`}>{value ?? 0}</p>
              </div>
              <Icon className={`h-5 w-5 mt-1 ${color} opacity-60`} />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { title: "Manage Courses", desc: "Create, edit, and publish CE courses", href: "/ce/admin/courses", icon: BookOpen },
          { title: "Manage Users", desc: "View enrollments, roles, and progress", href: "/ce/admin/users", icon: Users },
          { title: "Committee", desc: "Peer reviews, meetings, and COI forms", href: "/ce/admin/committee", icon: Award },
        ].map(({ title, desc, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="bg-white border rounded-lg p-5 flex items-center justify-between hover:shadow-sm transition-shadow group"
          >
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 p-2 rounded-lg">
                <Icon className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-sm">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ))}
      </div>

      {/* Recent enrollments */}
      {recent.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Enrollments</h2>
          <div className="bg-white border rounded-lg divide-y">
            {recent.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {e.ce_users?.first_name} {e.ce_users?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{e.ce_courses?.title}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.enrolled_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
