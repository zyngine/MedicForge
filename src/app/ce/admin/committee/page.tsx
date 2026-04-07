"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui";
import { Users, Calendar, BookOpen, ClipboardList, AlertCircle, CheckCircle, Clock, ArrowRight } from "lucide-react";

interface CommitteeStats {
  activeMembers: number;
  upcomingMeetings: number;
  pendingReviews: number;
  openActionItems: number;
}

interface UpcomingMeeting {
  id: string;
  meeting_date: string;
  location: string;
  status: string;
}

interface PendingCourse {
  id: string;
  title: string;
  category: string | null;
  created_at: string;
}

interface ActionItem {
  id: string;
  description: string;
  due_date: string | null;
  status: string;
  ce_committee_members: { name: string } | null;
}

export default function CECommitteeDashboardPage() {
  const [stats, setStats] = useState<CommitteeStats | null>(null);
  const [meetings, setMeetings] = useState<UpcomingMeeting[]>([]);
  const [pending, setPending] = useState<PendingCourse[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();
      const today = new Date().toISOString().split("T")[0];

      const [membersRes, meetingsRes, pendingRes, actionRes] = await Promise.all([
        supabase.from("ce_committee_members").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase
          .from("ce_committee_meetings")
          .select("id, meeting_date, location, status")
          .gte("meeting_date", today)
          .order("meeting_date")
          .limit(3),
        supabase
          .from("ce_courses")
          .select("id, title, category, created_at")
          .eq("status", "pending_committee_review")
          .order("created_at"),
        supabase
          .from("ce_committee_action_items")
          .select("id, description, due_date, status, ce_committee_members(name)")
          .eq("status", "pending")
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(5),
      ]);

      setStats({
        activeMembers: membersRes.count || 0,
        upcomingMeetings: (meetingsRes.data || []).length,
        pendingReviews: (pendingRes.data || []).length,
        openActionItems: (actionRes.data || []).length,
      });
      setMeetings(meetingsRes.data || []);
      setPending((pendingRes.data as PendingCourse[]) || []);
      setActions((actionRes.data as ActionItem[]) || []);
      setIsLoading(false);
    };
    load();
  }, []);

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Program Committee</h1>
        <p className="text-muted-foreground text-sm mt-1">CAPCE-required peer review governance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Members", value: stats?.activeMembers, icon: Users, color: "text-blue-700", href: "/ce/admin/committee/members" },
          { label: "Upcoming Meetings", value: stats?.upcomingMeetings, icon: Calendar, color: "text-green-700", href: "/ce/admin/committee/meetings" },
          { label: "Pending Reviews", value: stats?.pendingReviews, icon: BookOpen, color: "text-yellow-700", href: "/ce/admin/committee/reviews" },
          { label: "Open Action Items", value: stats?.openActionItems, icon: ClipboardList, color: "text-red-700", href: "/ce/admin/committee/meetings" },
        ].map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href} className="bg-card border rounded-lg p-5 hover:shadow-sm transition-shadow">
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Courses pending review */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Courses Pending Review</h2>
            <Link href="/ce/admin/committee/reviews" className="text-sm text-red-700 hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {pending.length === 0 ? (
            <div className="bg-card border rounded-lg p-8 text-center text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-60" />
              <p className="text-sm">No courses pending review</p>
            </div>
          ) : (
            <div className="bg-card border rounded-lg divide-y">
              {pending.map((course) => (
                <div key={course.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{course.title}</p>
                    <p className="text-xs text-muted-foreground">{course.category || "Uncategorized"}</p>
                  </div>
                  <Link href={`/ce/admin/committee/reviews`} className="text-xs text-red-700 hover:underline">
                    Review
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming meetings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Upcoming Meetings</h2>
            <Link href="/ce/admin/committee/meetings/new" className="text-sm text-red-700 hover:underline flex items-center gap-1">
              Schedule <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {meetings.length === 0 ? (
            <div className="bg-card border rounded-lg p-8 text-center text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm mb-3">No meetings scheduled</p>
              <Link href="/ce/admin/committee/meetings/new" className="text-sm text-red-700 hover:underline">
                Schedule a meeting
              </Link>
            </div>
          ) : (
            <div className="bg-card border rounded-lg divide-y">
              {meetings.map((m) => (
                <Link key={m.id} href={`/ce/admin/committee/meetings/${m.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{new Date(m.meeting_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
                    <p className="text-xs text-muted-foreground">{m.location}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.status === "completed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                    {m.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Open action items */}
      {actions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Open Action Items</h2>
          <div className="bg-card border rounded-lg divide-y">
            {actions.map((item) => {
              const isOverdue = item.due_date && new Date(item.due_date) < new Date();
              return (
                <div key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-start gap-3">
                    {isOverdue ? (
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm">{item.description}</p>
                      {item.ce_committee_members && (
                        <p className="text-xs text-muted-foreground">Assigned to {item.ce_committee_members.name}</p>
                      )}
                    </div>
                  </div>
                  {item.due_date && (
                    <p className={`text-xs shrink-0 ml-4 ${isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                      {isOverdue ? "Overdue: " : "Due: "}
                      {new Date(item.due_date + "T00:00:00").toLocaleDateString()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
