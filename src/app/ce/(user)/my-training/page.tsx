"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner } from "@/components/ui";
import { BookOpen, CheckCircle, FileText, Video, Sparkles } from "lucide-react";
import { useCEActiveSubscription } from "@/lib/hooks/use-ce-subscription";

interface Enrollment {
  id: string;
  completion_status: string;
  progress_percentage: number;
  enrolled_at: string;
  completed_at: string | null;
  ce_courses: {
    id: string;
    title: string;
    category: string | null;
    ceh_hours: number;
  } | null;
}

interface CustomMaterial {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  completed_at: string | null;
}

export default function CEMyTrainingPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [customMaterials, setCustomMaterials] = useState<CustomMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { hasActiveSubscription, subscriptionPrice, loading: subLoading } = useCEActiveSubscription();

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ceUser } = await supabase
        .from("ce_users")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!ceUser) { setIsLoading(false); return; }

      const [{ data: enrollData }, customRes] = await Promise.all([
        supabase
          .from("ce_enrollments")
          .select("id, completion_status, progress_percentage, enrolled_at, completed_at, ce_courses(id, title, category, ceh_hours)")
          .eq("user_id", ceUser.id)
          .order("enrolled_at", { ascending: false }),
        fetch("/api/ce/my-training/custom"),
      ]);

      setEnrollments(enrollData || []);
      if (customRes.ok) {
        const { materials } = await customRes.json();
        setCustomMaterials(materials || []);
      }
      setIsLoading(false);
    };
    load();
  }, []);

  const inProgress = enrollments.filter((e) => e.completion_status === "in_progress" || e.completion_status === "enrolled");
  const completed = enrollments.filter((e) => e.completion_status === "completed");
  const totalCEH = completed.reduce((sum, e) => sum + (e.ce_courses?.ceh_hours || 0), 0);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{inProgress.length}</p>
          <p className="text-sm text-muted-foreground mt-1">In Progress</p>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{completed.length}</p>
          <p className="text-sm text-muted-foreground mt-1">Completed</p>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{totalCEH.toFixed(1)}</p>
          <p className="text-sm text-muted-foreground mt-1">CEH Earned</p>
        </div>
      </div>

      {/* Subscription nudge — only for non-subscribers */}
      {!subLoading && !hasActiveSubscription && subscriptionPrice !== null && (
        <Link
          href="/ce/subscribe"
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border bg-gradient-to-r from-red-50 to-amber-50 dark:from-red-950/30 dark:to-amber-950/30 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles className="h-5 w-5 text-red-700 shrink-0" />
            <p className="text-sm">
              <span className="font-medium">Want unlimited access?</span>
              <span className="text-muted-foreground"> Subscribe for ${subscriptionPrice.toFixed(0)}/yr — all CAPCE courses included.</span>
            </p>
          </div>
          <span className="text-sm font-semibold text-red-700 whitespace-nowrap shrink-0">Subscribe →</span>
        </Link>
      )}

      {/* From your agency */}
      {customMaterials.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">From your agency</h2>
          <div className="space-y-2">
            {customMaterials.map((m) => {
              const Icon = m.content_type === "pdf" ? FileText : Video;
              return (
                <Link
                  key={m.id}
                  href={`/ce/custom/${m.id}`}
                  className="block bg-card border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <Icon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{m.title}</p>
                        {m.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                            {m.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {m.completed_at ? (
                      <span className="shrink-0 inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                        <CheckCircle className="h-3 w-3" />
                        Completed
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-muted-foreground">Open</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* In Progress */}
      {inProgress.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">In Progress</h2>
          <div className="space-y-3">
            {inProgress.map((e) => (
              <div key={e.id} className="bg-card border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{e.ce_courses?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.ce_courses?.category} · {e.ce_courses?.ceh_hours}h CEH
                    </p>
                  </div>
                  <Link href={`/ce/course/${e.ce_courses?.id}/learn`}>
                    <Button size="sm">Continue</Button>
                  </Link>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-red-700 h-2 rounded-full transition-all"
                    style={{ width: `${e.progress_percentage || 0}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{e.progress_percentage || 0}% complete</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Completed</h2>
          <div className="bg-card border rounded-lg divide-y">
            {completed.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{e.ce_courses?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Completed {e.completed_at ? new Date(e.completed_at).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-green-700">{e.ce_courses?.ceh_hours}h</span>
                  <Link href="/ce/transcript" className="text-xs text-red-700 hover:underline">
                    Certificate
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {enrollments.length === 0 && customMaterials.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium mb-1">No courses yet</p>
          <p className="text-sm mb-4">Browse the catalog to find your first course.</p>
          <Link href="/ce/catalog">
            <Button>Browse Catalog</Button>
          </Link>
        </div>
      )}

      {enrollments.length > 0 && (
        <div className="text-center">
          <Link href="/ce/catalog">
            <Button variant="outline">Browse More Courses</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
