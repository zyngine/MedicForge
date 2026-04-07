"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner } from "@/components/ui";
import { BookOpen, CheckCircle } from "lucide-react";

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

export default function CEMyTrainingPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

      const { data } = await supabase
        .from("ce_enrollments")
        .select("id, completion_status, progress_percentage, enrolled_at, completed_at, ce_courses(id, title, category, ceh_hours)")
        .eq("user_id", ceUser.id)
        .order("enrolled_at", { ascending: false });

      setEnrollments(data || []);
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
      {enrollments.length === 0 && (
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
