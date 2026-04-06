"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Spinner,
  Input,
  Avatar,
} from "@/components/ui";
import {
  ArrowLeft,
  Search,
  Users,
  BarChart,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import { formatDate } from "@/lib/utils";

interface EnrolledStudent {
  id: string;
  enrolled_at: string;
  status: string;
  progress: number;
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

export default function CourseStudentsPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const { profile } = useUser();
  const [students, setStudents] = React.useState<EnrolledStudent[]>([]);
  const [courseName, setCourseName] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");

  const supabase = createClient();

  React.useEffect(() => {
    if (!courseId || !profile?.tenant_id) return;

    const fetchStudents = async () => {
      try {
        // Fetch course name
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: course } = await (supabase as any)
          .from("courses")
          .select("title")
          .eq("id", courseId)
          .single();

        if (course) setCourseName(course.title);

        // Fetch enrolled students
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("enrollments")
          .select(`
            id,
            enrolled_at,
            status,
            progress,
            user:users(id, full_name, email, avatar_url)
          `)
          .eq("course_id", courseId)
          .order("enrolled_at", { ascending: false });

        if (error) throw error;
        setStudents(data || []);
      } catch (err) {
        console.error("Failed to fetch students:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [courseId, profile?.tenant_id, supabase]);

  const filteredStudents = students.filter(
    (s) =>
      s.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/instructor/courses/${courseId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Enrolled Students</h1>
            <p className="text-muted-foreground">{courseName}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {students.length} students
        </Badge>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </CardContent>
      </Card>

      {/* Students List */}
      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No students found</h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? "Try adjusting your search"
                : "No students are enrolled in this course yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Student</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Progress</th>
                  <th className="text-left py-3 px-4 font-medium">Enrolled</th>
                  <th className="text-right py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((enrollment) => (
                  <tr key={enrollment.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={enrollment.user?.avatar_url || undefined}
                          fallback={enrollment.user?.full_name || "?"}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium">{enrollment.user?.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {enrollment.user?.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          enrollment.status === "active"
                            ? "success"
                            : enrollment.status === "completed"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {enrollment.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${enrollment.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-sm">{enrollment.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {formatDate(enrollment.enrolled_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/instructor/students/${enrollment.user?.id}`}>
                          <BarChart className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
