"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner } from "@/components/ui";
import { Calendar, Plus, CheckCircle, Clock } from "lucide-react";

interface Meeting {
  id: string;
  meeting_date: string;
  start_time: string | null;
  location: string;
  meeting_type: string;
  status: string;
  quorum_present: boolean;
  minutes_approved: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-muted text-muted-foreground",
};

const TYPE_LABELS: Record<string, string> = {
  regular: "Regular",
  special: "Special",
  emergency: "Emergency",
};

export default function CECommitteeMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const supabase = createCEClient();
      const today = new Date().toISOString().split("T")[0];
      let q = supabase
        .from("ce_committee_meetings")
        .select("id, meeting_date, start_time, location, meeting_type, status, quorum_present, minutes_approved")
        .order("meeting_date", { ascending: filter === "upcoming" });

      if (filter === "upcoming") {
        q = q.gte("meeting_date", today);
      } else {
        q = q.lt("meeting_date", today);
      }

      const { data } = await q;
      setMeetings(data || []);
      setIsLoading(false);
    };
    load();
  }, [filter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Committee Meetings</h1>
          <p className="text-muted-foreground text-sm mt-1">Schedule, document, and track meeting minutes</p>
        </div>
        <Link href="/ce/admin/committee/meetings/new">
          <Button><Plus className="h-4 w-4 mr-2" />Schedule Meeting</Button>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["upcoming", "past"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
              filter === f ? "bg-gray-900 text-white" : "bg-card border text-muted-foreground hover:bg-muted/30"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <Calendar className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">{filter === "upcoming" ? "No upcoming meetings scheduled" : "No past meetings found"}</p>
            {filter === "upcoming" && (
              <Link href="/ce/admin/committee/meetings/new" className="mt-3 text-sm text-red-700 hover:underline">
                Schedule the first meeting
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Location</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Quorum</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Minutes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {meetings.map((m) => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {new Date(m.meeting_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    {m.start_time && <p className="text-xs text-muted-foreground">{m.start_time}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{TYPE_LABELS[m.meeting_type] || m.meeting_type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.location}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[m.status] || "bg-muted text-foreground"}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {m.status === "completed" ? (
                      m.quorum_present
                        ? <CheckCircle className="h-4 w-4 text-green-500" />
                        : <Clock className="h-4 w-4 text-red-500" />
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {m.status === "completed" ? (
                      m.minutes_approved
                        ? <span className="text-xs text-green-700 font-medium">Approved</span>
                        : <span className="text-xs text-yellow-700">Pending</span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/ce/admin/committee/meetings/${m.id}`} className="text-xs text-red-700 hover:underline">
                      {m.status === "completed" ? "View" : "Open"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
