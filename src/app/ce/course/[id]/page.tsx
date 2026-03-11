"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner, Alert } from "@/components/ui";
import { Clock, Award, ChevronLeft, CheckCircle, BookOpen } from "lucide-react";

interface CourseDetail {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  ceh_hours: number;
  course_type: string | null;
  delivery_method: string | null;
  is_free: boolean;
  price: number | null;
  capce_approved: boolean;
  capce_number: string | null;
  target_audience: string[] | null;
  prerequisites: string | null;
  disclosure_statement: string | null;
  passing_score: number;
  certification_levels: string[] | null;
}

interface Objective {
  id: string;
  objective_text: string;
  bloom_level: string | null;
}

const DELIVERY_LABELS: Record<string, string> = {
  online_self_paced: "Online — Self-Paced",
  online_live: "Online — Live",
  blended: "Blended",
  in_person: "In Person",
};

export default function CECourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [enrollment, setEnrollment] = useState<{ id: string; status: string; progress_pct: number } | null>(null);
  const [ceUserId, setCeUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();

      const [courseRes, objRes] = await Promise.all([
        supabase
          .from("ce_courses")
          .select("id, title, description, category, ceh_hours, course_type, delivery_method, is_free, price, capce_approved, capce_number, target_audience, prerequisites, disclosure_statement, passing_score, certification_levels")
          .eq("id", id)
          .single(),
        supabase
          .from("ce_course_objectives")
          .select("id, objective_text, bloom_level")
          .eq("course_id", id)
          .order("order_index"),
      ]);

      setCourse(courseRes.data || null);
      setObjectives(objRes.data || []);

      // Check enrollment
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: ceUser } = await supabase
          .from("ce_users")
          .select("id")
          .eq("auth_user_id", user.id)
          .single();

        if (ceUser) {
          setCeUserId(ceUser.id);
          const { data: enroll } = await supabase
            .from("ce_enrollments")
            .select("id, status, progress_pct")
            .eq("ce_user_id", ceUser.id)
            .eq("course_id", id)
            .single();
          setEnrollment(enroll || null);
        }
      }

      setIsLoading(false);
    };
    load();
  }, [id]);

  const handleEnroll = async () => {
    if (!ceUserId) return;
    setIsEnrolling(true);
    setError(null);
    try {
      const supabase = createCEClient();
      const { data, error: insertError } = await supabase
        .from("ce_enrollments")
        .insert({ ce_user_id: ceUserId, course_id: id, status: "enrolled", progress_pct: 0 })
        .select("id, status, progress_pct")
        .single();
      if (insertError) {
        setError("Failed to enroll. Please try again.");
      } else {
        setEnrollment(data);
      }
    } finally {
      setIsEnrolling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center text-muted-foreground">
        <p>Course not found.</p>
        <Link href="/ce/catalog" className="mt-4 inline-block">
          <Button variant="outline">Back to Catalog</Button>
        </Link>
      </div>
    );
  }

  const enrolled = enrollment?.status === "enrolled" || enrollment?.status === "in_progress";
  const completed = enrollment?.status === "completed";

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      {/* Back */}
      <Link href="/ce/catalog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        Back to Catalog
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {course.category && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {course.category}
                </span>
              )}
              {course.capce_approved && (
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  CAPCE Approved
                  {course.capce_number && <span className="font-mono ml-1">{course.capce_number}</span>}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold">{course.title}</h1>
            {course.description && (
              <p className="text-muted-foreground mt-2">{course.description}</p>
            )}
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-b pb-4">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {course.ceh_hours} CEH
            </span>
            {course.delivery_method && (
              <span>{DELIVERY_LABELS[course.delivery_method] || course.delivery_method}</span>
            )}
            {course.course_type && (
              <span className="capitalize">{course.course_type.replace(/_/g, " ")}</span>
            )}
            <span>Passing score: {course.passing_score}%</span>
          </div>

          {/* Learning Objectives */}
          {objectives.length > 0 && (
            <div>
              <h2 className="font-semibold text-lg mb-3">Learning Objectives</h2>
              <ul className="space-y-2">
                {objectives.map((obj) => (
                  <li key={obj.id} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{obj.objective_text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Target Audience */}
          {course.target_audience && course.target_audience.length > 0 && (
            <div>
              <h2 className="font-semibold mb-2">Target Audience</h2>
              <div className="flex flex-wrap gap-2">
                {course.target_audience.map((a) => (
                  <span key={a} className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Prerequisites */}
          {course.prerequisites && (
            <div>
              <h2 className="font-semibold mb-2">Prerequisites</h2>
              <p className="text-sm text-muted-foreground">{course.prerequisites}</p>
            </div>
          )}

          {/* CAPCE Disclosure */}
          {course.capce_approved && course.disclosure_statement && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800">
              <p className="font-semibold mb-1">Disclosure Statement</p>
              <p>{course.disclosure_statement}</p>
            </div>
          )}
        </div>

        {/* Enroll card */}
        <div>
          <div className="bg-white border rounded-lg p-5 sticky top-6">
            <div className="text-2xl font-bold mb-1">
              {course.is_free ? "Free" : course.price ? `$${course.price.toFixed(2)}` : "Free"}
            </div>

            {error && <Alert variant="error" className="mb-3 text-sm">{error}</Alert>}

            {completed ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-700 text-sm mb-3">
                  <CheckCircle className="h-4 w-4" />
                  Course completed
                </div>
                <Link href="/ce/transcript">
                  <Button className="w-full" variant="outline">View Certificate</Button>
                </Link>
              </div>
            ) : enrolled ? (
              <Link href={`/ce/course/${id}/learn`}>
                <Button className="w-full">
                  {enrollment?.progress_pct ? "Continue Course" : "Start Course"}
                </Button>
              </Link>
            ) : ceUserId ? (
              <Button className="w-full" onClick={handleEnroll} disabled={isEnrolling}>
                {isEnrolling ? "Enrolling..." : "Enroll Now"}
              </Button>
            ) : (
              <Link href={`/ce/login?redirect=/ce/course/${id}`}>
                <Button className="w-full">Sign In to Enroll</Button>
              </Link>
            )}

            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{course.ceh_hours} CEH upon completion</p>
              <p className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" />Passing score: {course.passing_score}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
