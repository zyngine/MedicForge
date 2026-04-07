"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner } from "@/components/ui";
import { Plus, BookOpen, Clock } from "lucide-react";

interface CECourse {
  id: string;
  course_number: string | null;
  title: string;
  category: string | null;
  ceh_hours: number;
  status: string;
  delivery_method: string | null;
  created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-foreground",
  pending_committee_review: "bg-yellow-100 text-yellow-800",
  revisions_requested: "bg-orange-100 text-orange-800",
  approved: "bg-blue-100 text-blue-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_committee_review: "Pending Review",
  revisions_requested: "Revisions Needed",
  approved: "Approved",
  published: "Published",
  archived: "Archived",
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending_committee_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export default function CEAdminCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CECourse[]>([]);
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const supabase = createCEClient();
      let q = supabase
        .from("ce_courses")
        .select("id, course_number, title, category, ceh_hours, status, delivery_method, created_at")
        .order("created_at", { ascending: false });

      if (filter !== "all") q = q.eq("status", filter);

      const { data } = await q;
      setCourses(data || []);
      setIsLoading(false);
    };
    load();
  }, [filter]);

  const counts = courses.reduce(
    (acc, c) => ({ ...acc, [c.status]: (acc[c.status] || 0) + 1 }),
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Courses</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage the CE course catalog</p>
        </div>
        <Link href="/ce/admin/courses/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Course
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Published", key: "published", color: "text-green-700" },
          { label: "Pending Review", key: "pending_committee_review", color: "text-yellow-700" },
          { label: "Draft", key: "draft", color: "text-muted-foreground" },
          { label: "Archived", key: "archived", color: "text-muted-foreground" },
        ].map(({ label, key, color }) => (
          <div key={key} className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{counts[key] || 0}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              filter === f.value
                ? "bg-gray-900 text-white"
                : "bg-card border text-muted-foreground hover:bg-muted/30"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Spinner size="lg" />
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <BookOpen className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No courses found</p>
            <Link href="/ce/admin/courses/new" className="mt-3">
              <Button size="sm" variant="outline">Create your first course</Button>
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Course</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />CEH</span>
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Delivery</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr
                  key={course.id}
                  onClick={() => router.push(`/ce/admin/courses/${course.id}`)}
                  className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{course.title}</p>
                    {course.course_number && (
                      <p className="text-xs text-muted-foreground font-mono">{course.course_number}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{course.category || "—"}</td>
                  <td className="px-4 py-3 font-medium">{course.ceh_hours}h</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_STYLES[course.status] || "bg-muted text-foreground"
                      }`}
                    >
                      {STATUS_LABELS[course.status] || course.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs capitalize">
                    {course.delivery_method?.replace(/_/g, " ") || "—"}
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
