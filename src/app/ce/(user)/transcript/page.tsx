"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner } from "@/components/ui";
import { Award, Download, BookOpen } from "lucide-react";

interface TranscriptRow {
  id: string;
  completed_at: string | null;
  ce_courses: {
    title: string;
    category: string | null;
    ceh_hours: number;
  } | null;
  ce_certificates: {
    id: string;
    certificate_number: string;
    issued_at: string;
  }[] | null;
}

export default function CETranscriptPage() {
  const [rows, setRows] = useState<TranscriptRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const { data: ceUser } = await supabase
        .from("ce_users")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!ceUser) { setIsLoading(false); return; }

      const { data } = await supabase
        .from("ce_enrollments")
        .select("id, completed_at, ce_courses(title, category, ceh_hours), ce_certificates(id, certificate_number, issued_at)")
        .eq("user_id", ceUser.id)
        .eq("completion_status", "completed")
        .order("completed_at", { ascending: false });

      setRows(data || []);
      setIsLoading(false);
    };
    load();
  }, []);

  const totalCEH = rows.reduce((sum, r) => sum + (r.ce_courses?.ceh_hours || 0), 0);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CE Transcript</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your completed courses and certificates
          </p>
        </div>
        {rows.length > 0 && (
          <div className="text-right">
            <p className="text-2xl font-bold text-red-700">{totalCEH.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Total CEH Earned</p>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Award className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium mb-1">No completions yet</p>
          <p className="text-sm mb-4">Complete a course to earn your first certificate.</p>
          <Link href="/ce/catalog">
            <Button>Browse Catalog</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Course</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Completed</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">CEH</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Certificate #</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const cert = row.ce_certificates?.[0];
                return (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.ce_courses?.title}</p>
                      {row.ce_courses?.category && (
                        <p className="text-xs text-muted-foreground">{row.ce_courses.category}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.completed_at
                        ? new Date(row.completed_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium">{row.ce_courses?.ceh_hours}h</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {cert?.certificate_number || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {cert && (
                        <a
                          href={`/api/ce/certificate?id=${cert.id}`}
                          download
                          className="inline-flex items-center gap-1 text-xs text-red-700 hover:underline"
                          title="Download certificate PDF"
                        >
                          <Download className="h-3.5 w-3.5" />
                          PDF
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm font-medium">Total</td>
                <td className="px-4 py-3 font-bold text-red-700">{totalCEH.toFixed(1)}h</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
