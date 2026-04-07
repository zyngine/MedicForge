"use client";

/* eslint-disable react-hooks/exhaustive-deps */

 

import { useEffect, useState } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner, Input } from "@/components/ui";
import { Download, AlertCircle } from "lucide-react";

interface UnreportedCompletion {
  id: string;
  completed_at: string;
  ce_users: { first_name: string; last_name: string; nremt_id: string | null; certification_level: string | null } | null;
  ce_courses: { title: string; course_number: string | null; ceh_hours: number; capce_number: string | null } | null;
}

export default function CECapceReportingPage() {
  const [completions, setCompletions] = useState<UnreportedCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [missingNremt, setMissingNremt] = useState(0);

  const load = async () => {
    setIsLoading(true);
    const supabase = createCEClient();

    // Get already-reported enrollment IDs
    const { data: reported } = await supabase
      .from("ce_capce_submission_records")
      .select("enrollment_id")
      .eq("status", "reported");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reportedIds = new Set((reported || []).map((r: any) => r.enrollment_id));

    let q = supabase
      .from("ce_enrollments")
      .select("id, completed_at, ce_users(first_name, last_name, nremt_id, certification_level), ce_courses(title, course_number, ceh_hours, capce_number)")
      .eq("completion_status", "completed")
      .order("completed_at", { ascending: false });

    if (dateFrom) q = q.gte("completed_at", dateFrom);
    if (dateTo) q = q.lte("completed_at", dateTo + "T23:59:59");

    const { data } = await q;
    const all = (data as UnreportedCompletion[]) || [];
    const unreported = all.filter((c) => !reportedIds.has(c.id));
    setCompletions(unreported);
    setMissingNremt(unreported.filter((c) => !c.ce_users?.nremt_id).length);
    setIsLoading(false);
  };

  useEffect(() => {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    setDateFrom(firstOfMonth);
  }, []);

  useEffect(() => { if (dateFrom) load(); }, [dateFrom, dateTo]);

  const generateReport = async () => {
    if (completions.length === 0) return;
    setGenerating(true);

    // Build CSV
    const header = "NREMT ID,Last Name,First Name,Cert Level,Course Number,Course Title,CAPCE Number,CEH Hours,Completion Date";
    const rows = completions.map((c) => [
      c.ce_users?.nremt_id || "MISSING",
      c.ce_users?.last_name || "",
      c.ce_users?.first_name || "",
      c.ce_users?.certification_level || "",
      c.ce_courses?.course_number || "",
      `"${c.ce_courses?.title || ""}"`,
      c.ce_courses?.capce_number || "",
      c.ce_courses?.ceh_hours || 0,
      c.completed_at ? new Date(c.completed_at).toLocaleDateString() : "",
    ].join(","));

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `capce-report-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    // Mark as reported
    const supabase = createCEClient();
    const { data: submission } = await supabase
      .from("ce_capce_submissions")
      .insert({
        submission_date: new Date().toISOString().split("T")[0],
        period_start: dateFrom,
        period_end: dateTo,
        total_records: completions.length,
        status: "submitted",
      })
      .select("id")
      .single();

    if (submission) {
      const records = completions.map((c) => ({
        submission_id: submission.id,
        enrollment_id: c.id,
        user_nremt_id: c.ce_users?.nremt_id || "MISSING",
        user_name: `${c.ce_users?.first_name} ${c.ce_users?.last_name}`,
        course_number: c.ce_courses?.course_number || "",
        course_title: c.ce_courses?.title || "",
        ceh_hours: c.ce_courses?.ceh_hours || 0,
        completion_date: c.completed_at ? new Date(c.completed_at).toISOString().split("T")[0] : "",
        status: "reported",
      }));
      await supabase.from("ce_capce_submission_records").insert(records);
    }

    setGenerated(true);
    setGenerating(false);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CAPCE Reporting</h1>
        <p className="text-muted-foreground text-sm mt-1">Generate completion reports for NREMT submission</p>
      </div>

      {/* Date range */}
      <div className="bg-card border rounded-lg p-5 flex items-end gap-4 flex-wrap">
        <div className="space-y-1">
          <label className="text-sm font-medium">From</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">To</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
        <Button onClick={load} variant="outline">Refresh</Button>
      </div>

      {missingNremt > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-700 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">
            <strong>{missingNremt} completion{missingNremt !== 1 ? "s" : ""}</strong> are missing NREMT ID — these will be flagged in the report. Ask users to add their NREMT ID in their account settings.
          </p>
        </div>
      )}

      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
          <p className="font-medium text-sm">{completions.length} unreported completion{completions.length !== 1 ? "s" : ""}</p>
          <Button onClick={generateReport} disabled={generating || completions.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            {generating ? "Generating..." : "Export CSV + Mark Reported"}
          </Button>
        </div>

        {generated && (
          <div className="px-5 py-3 bg-green-50 border-b border-green-200 text-sm text-green-700">
            Report exported and completions marked as reported. See Submissions tab for history.
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
        ) : completions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <p className="text-sm">All completions in this date range have been reported.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">NREMT ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Course</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">CEH</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Completed</th>
              </tr>
            </thead>
            <tbody>
              {completions.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{c.ce_users?.first_name} {c.ce_users?.last_name}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {c.ce_users?.nremt_id || <span className="text-red-600">Missing</span>}
                  </td>
                  <td className="px-4 py-3">
                    <p>{c.ce_courses?.title}</p>
                    {c.ce_courses?.capce_number && <p className="text-xs text-muted-foreground font-mono">{c.ce_courses.capce_number}</p>}
                  </td>
                  <td className="px-4 py-3 font-medium">{c.ce_courses?.ceh_hours}h</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.completed_at ? new Date(c.completed_at).toLocaleDateString() : "—"}
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
