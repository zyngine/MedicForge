"use client";

import * as React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, Spinner, Badge } from "@/components/ui";
import { ArrowLeft, Star, AlertTriangle } from "lucide-react";

interface Rating {
  id: string;
  preceptor_name: string;
  knowledge_rating: number;
  communication_rating: number;
  professionalism_rating: number;
  overall_comment: string | null;
  created_at: string;
}

interface PreceptorSummary {
  name: string;
  count: number;
  avgKnowledge: number;
  avgCommunication: number;
  avgProfessionalism: number;
  avgOverall: number;
  recentComments: { comment: string; date: string }[];
}

function bandColor(score: number): string {
  if (score < 2.5) return "bg-red-100 text-red-700 border-red-200";
  if (score < 3.5) return "bg-orange-100 text-orange-700 border-orange-200";
  if (score < 4.5) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-green-100 text-green-700 border-green-200";
}

function bandLabel(score: number): string {
  if (score < 2.5) return "Concerning";
  if (score < 3.5) return "Below average";
  if (score < 4.5) return "Solid";
  return "Excellent";
}

export default function PreceptorPerformancePage() {
  const [summaries, setSummaries] = React.useState<PreceptorSummary[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      const { data: ratings } = await supabase
        .from("clinical_preceptor_ratings")
        .select("id, preceptor_name, knowledge_rating, communication_rating, professionalism_rating, overall_comment, created_at")
        .order("created_at", { ascending: false });

      const byName = new Map<string, Rating[]>();
      ((ratings || []) as Rating[]).forEach((r) => {
        const key = r.preceptor_name.trim().toLowerCase();
        if (!byName.has(key)) byName.set(key, []);
        byName.get(key)!.push(r);
      });

      const rows: PreceptorSummary[] = [];
      byName.forEach((rs) => {
        const avg = (key: keyof Rating) =>
          rs.reduce((sum, r) => sum + (r[key] as number), 0) / rs.length;
        const avgKnowledge = avg("knowledge_rating");
        const avgCommunication = avg("communication_rating");
        const avgProfessionalism = avg("professionalism_rating");
        const avgOverall = (avgKnowledge + avgCommunication + avgProfessionalism) / 3;
        rows.push({
          name: rs[0].preceptor_name,
          count: rs.length,
          avgKnowledge,
          avgCommunication,
          avgProfessionalism,
          avgOverall,
          recentComments: rs
            .filter((r) => r.overall_comment)
            .slice(0, 3)
            .map((r) => ({ comment: r.overall_comment!, date: r.created_at })),
        });
      });
      rows.sort((a, b) => a.avgOverall - b.avgOverall);
      setSummaries(rows);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  const flagged = summaries.filter((s) => s.avgOverall < 3.0 && s.count >= 3);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/instructor/clinical" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
          <ArrowLeft className="h-4 w-4" />
          Back to clinical
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Star className="h-7 w-7" />
          Preceptor Performance
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Aggregated student ratings of clinical preceptors. Preceptors averaging below 3.0 over 3+ shifts trigger an automatic alert.
        </p>
      </div>

      {flagged.length > 0 && (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700">
                {flagged.length} preceptor{flagged.length === 1 ? "" : "s"} flagged for low ratings
              </p>
              <p className="text-sm text-red-700/80 mt-0.5">
                {flagged.map((f) => f.name).join(", ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {summaries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Star className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No preceptor ratings yet. Once students start submitting ratings on completed shifts, they&apos;ll show up here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {summaries.map((s) => {
            const isFlagged = s.avgOverall < 3.0 && s.count >= 3;
            return (
              <Card key={s.name} className={isFlagged ? "border-red-300" : ""}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-semibold text-lg">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.count} rating{s.count === 1 ? "" : "s"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={bandColor(s.avgOverall)}>{bandLabel(s.avgOverall)}</Badge>
                      <span className="text-2xl font-bold">{s.avgOverall.toFixed(1)}</span>
                      <span className="text-sm text-muted-foreground">/5</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-muted/30 rounded px-3 py-2">
                      <p className="text-muted-foreground">Knowledge</p>
                      <p className="font-semibold text-base">{s.avgKnowledge.toFixed(1)}</p>
                    </div>
                    <div className="bg-muted/30 rounded px-3 py-2">
                      <p className="text-muted-foreground">Communication</p>
                      <p className="font-semibold text-base">{s.avgCommunication.toFixed(1)}</p>
                    </div>
                    <div className="bg-muted/30 rounded px-3 py-2">
                      <p className="text-muted-foreground">Professionalism</p>
                      <p className="font-semibold text-base">{s.avgProfessionalism.toFixed(1)}</p>
                    </div>
                  </div>
                  {s.recentComments.length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">Recent comments ({s.recentComments.length})</summary>
                      <div className="mt-2 space-y-2 pl-2">
                        {s.recentComments.map((c, i) => (
                          <div key={i} className="border-l-2 border-muted pl-3">
                            <p>{c.comment}</p>
                            <p className="text-muted-foreground mt-1">{new Date(c.date).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
