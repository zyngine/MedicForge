"use client";

import { useEffect, useState } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui";
import { FileText } from "lucide-react";

interface Submission {
  id: string;
  submission_date: string;
  period_start: string;
  period_end: string;
  total_records: number;
  status: string;
  confirmation_number: string | null;
  error_message: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  submitted: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-700",
};

export default function CECapceSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();
      const { data } = await supabase
        .from("ce_capce_submissions")
        .select("id, submission_date, period_start, period_end, total_records, status, confirmation_number, error_message, created_at")
        .order("submission_date", { ascending: false });
      setSubmissions(data || []);
      setIsLoading(false);
    };
    load();
  }, []);

  const updateStatus = async (id: string, status: string, confirmationNumber?: string) => {
    const supabase = createCEClient();
    await supabase.from("ce_capce_submissions").update({ status, confirmation_number: confirmationNumber || null }).eq("id", id);
    setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, status, confirmation_number: confirmationNumber || null } : s));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">CAPCE Submissions</h1>
        <p className="text-muted-foreground text-sm mt-1">History of NREMT completion reports</p>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48"><Spinner size="lg" /></div>
        ) : submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <FileText className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No submissions yet</p>
            <p className="text-xs mt-1 text-center max-w-xs">Generate your first report from the Reporting page.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Submission Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Records</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Confirmation #</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{new Date(s.submission_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(s.period_start).toLocaleDateString()} – {new Date(s.period_end).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-medium">{s.total_records}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[s.status] || "bg-gray-100 text-gray-700"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.confirmation_number || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {s.status === "submitted" && (
                      <button
                        onClick={() => {
                          const num = prompt("Enter CAPCE confirmation number:");
                          if (num) updateStatus(s.id, "confirmed", num);
                        }}
                        className="text-xs text-blue-700 hover:underline"
                      >
                        Mark Confirmed
                      </button>
                    )}
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
