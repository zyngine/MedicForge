"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Button, Spinner, Alert } from "@/components/ui";
import { CEHeader } from "@/components/ce/CEHeader";
import { SquarePaymentModal } from "@/components/ce/SquarePaymentModal";
import { Clock, Award, ChevronLeft, CheckCircle, BookOpen, Users, Star } from "lucide-react";

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
  is_capce_accredited: boolean;
  capce_course_number: string | null;
  target_audience: string[] | null;
  prerequisites: string | null;
  disclosure_statement: string | null;
  passing_score: number;
  certification_levels: string[] | null;
  expiration_months: number | null;
}

interface Objective {
  id: string;
  objective_text: string;
  bloom_level: string | null;
}

interface Instructor {
  id: string;
  name: string;
  credentials: string | null;
  bio: string | null;
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
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [enrollment, setEnrollment] = useState<{ id: string; completion_status: string; progress_percentage: number } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [hasPurchase, setHasPurchase] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscriptionPrice, setSubscriptionPrice] = useState<number | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();

      const [courseRes, objRes, instrRes, settingRes] = await Promise.all([
        supabase
          .from("ce_courses")
          .select("id, title, description, category, ceh_hours, course_type, delivery_method, is_free, price, is_capce_accredited, capce_course_number, target_audience, prerequisites, disclosure_statement, passing_score, certification_levels, expiration_months")
          .eq("id", id)
          .single(),
        supabase
          .from("ce_course_objectives")
          .select("id, objective_text, bloom_level")
          .eq("course_id", id)
          .order("sort_order"),
        supabase
          .from("ce_course_instructors")
          .select("ce_instructors(id, name, credentials, bio)")
          .eq("course_id", id),
        supabase
          .from("ce_platform_settings")
          .select("value")
          .eq("key", "annual_subscription_price")
          .single(),
      ]);

      setCourse(courseRes.data || null);
      if (settingRes.data) {
        setSubscriptionPrice(parseFloat(settingRes.data.value));
      }
      setObjectives(objRes.data || []);

      const instrData = (instrRes.data || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r.ce_instructors)
        .filter(Boolean) as Instructor[];
      setInstructors(instrData);

      // Check auth + enrollment
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true);
        const { data: ceUser } = await supabase
          .from("ce_users")
          .select("id")
          .eq("id", user.id)
          .single();

        if (ceUser) {
          const now = new Date().toISOString();
          const [enrollRes, purchaseRes, subRes] = await Promise.all([
            supabase
              .from("ce_enrollments")
              .select("id, completion_status, progress_percentage")
              .eq("user_id", ceUser.id)
              .eq("course_id", id)
              .maybeSingle(),
            supabase
              .from("ce_purchases")
              .select("id")
              .eq("user_id", ceUser.id)
              .eq("course_id", id)
              .eq("refunded", false)
              .maybeSingle(),
            supabase
              .from("ce_user_subscriptions")
              .select("id")
              .eq("user_id", ceUser.id)
              .eq("status", "active")
              .gt("expires_at", now)
              .limit(1)
              .maybeSingle(),
          ]);
          setEnrollment(enrollRes.data || null);
          setHasPurchase(!!purchaseRes.data);
          setHasSubscription(!!subRes.data);
        }
      } else {
        setIsLoggedIn(false);
      }

      setIsLoading(false);
    };
    load();
  }, [id]);

  const handleEnroll = async () => {
    setIsEnrolling(true);
    setError(null);
    try {
      const res = await fetch("/api/ce/course/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = `/ce/login?redirect=/ce/course/${id}`;
          return;
        }
        setError(data.error || "Failed to enroll. Please try again.");
      } else {
        setEnrollment(data);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsEnrolling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 text-foreground">
        <CEHeader />
        <div className="flex justify-center py-24">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-muted/30 text-foreground">
        <CEHeader />
        <div className="max-w-4xl mx-auto px-6 py-16 text-center text-muted-foreground">
          <p className="mb-4">Course not found.</p>
          <Link href="/ce/catalog">
            <Button variant="outline">Back to Catalog</Button>
          </Link>
        </div>
      </div>
    );
  }

  const enrolled = enrollment?.completion_status === "enrolled" || enrollment?.completion_status === "in_progress";
  const completed = enrollment?.completion_status === "completed";
  const isFree = course.is_free || !course.price;
  const hasAccess = isFree || hasPurchase || hasSubscription;

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      <CEHeader />

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
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
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {course.category}
                  </span>
                )}
                {course.is_capce_accredited && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    CAPCE Approved
                    {course.capce_course_number && (
                      <span className="font-mono ml-0.5">{course.capce_course_number}</span>
                    )}
                  </span>
                )}
                {course.delivery_method && (
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {DELIVERY_LABELS[course.delivery_method] || course.delivery_method}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold">{course.title}</h1>
              {course.description && (
                <p className="text-muted-foreground mt-2 text-base leading-relaxed">{course.description}</p>
              )}
            </div>

            {/* Meta stats */}
            <div className="flex flex-wrap gap-6 text-sm py-4 border-y">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <strong className="text-foreground">{course.ceh_hours}</strong> CEH
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Star className="h-4 w-4" />
                Passing score: <strong className="text-foreground">{course.passing_score}%</strong>
              </span>
              {course.certification_levels && course.certification_levels.length > 0 && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {course.certification_levels.join(", ")}
                </span>
              )}
              {course.expiration_months && (
                <span className="text-muted-foreground text-xs">
                  Certificate valid {course.expiration_months} months
                </span>
              )}
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

            {/* Instructors */}
            {instructors.length > 0 && (
              <div>
                <h2 className="font-semibold text-lg mb-3">
                  {instructors.length === 1 ? "Instructor" : "Instructors"}
                </h2>
                <div className="space-y-3">
                  {instructors.map((instr) => (
                    <div key={instr.id} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground shrink-0">
                        {instr.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{instr.name}</p>
                        {instr.credentials && (
                          <p className="text-xs text-muted-foreground">{instr.credentials}</p>
                        )}
                        {instr.bio && (
                          <p className="text-sm text-muted-foreground mt-1">{instr.bio}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Target Audience */}
            {course.target_audience && course.target_audience.length > 0 && (
              <div>
                <h2 className="font-semibold mb-2">Target Audience</h2>
                <div className="flex flex-wrap gap-2">
                  {course.target_audience.map((a) => (
                    <span key={a} className="text-sm bg-muted text-foreground px-3 py-1 rounded-full">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Prerequisites */}
            {course.prerequisites && (
              <div>
                <h2 className="font-semibold mb-1">Prerequisites</h2>
                <p className="text-sm text-muted-foreground">{course.prerequisites}</p>
              </div>
            )}

            {/* CAPCE Disclosure */}
            {course.is_capce_accredited && course.disclosure_statement && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-800">
                <p className="font-semibold mb-1">Disclosure Statement</p>
                <p>{course.disclosure_statement}</p>
              </div>
            )}
          </div>

          {/* Enroll card — sticky */}
          <div>
            <div className="bg-card border rounded-lg p-5 sticky top-6 space-y-4">
              <div>
                <div className="text-3xl font-bold">
                  {isFree ? "Free" : hasSubscription ? "Included" : `$${course.price!.toFixed(2)}`}
                </div>
                {!isFree && !hasSubscription && (
                  <p className="text-xs text-muted-foreground mt-0.5">One-time purchase</p>
                )}
                {hasSubscription && (
                  <p className="text-xs text-green-700 mt-0.5">Covered by your subscription</p>
                )}
              </div>

              {error && (
                <Alert variant="error" className="text-sm">{error}</Alert>
              )}

              {completed ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-700 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    Course completed
                  </div>
                  <Link href={`/ce/course/${id}/learn`}>
                    <Button className="w-full" variant="outline">Review Course</Button>
                  </Link>
                  <Link href="/ce/transcript">
                    <Button className="w-full" variant="ghost">View Certificate</Button>
                  </Link>
                </div>
              ) : enrolled ? (
                <Link href={`/ce/course/${id}/learn`}>
                  <Button className="w-full">
                    {enrollment?.progress_percentage ? "Continue Course" : "Start Course"}
                  </Button>
                </Link>
              ) : isLoggedIn && hasAccess ? (
                <Button className="w-full" onClick={handleEnroll} disabled={isEnrolling}>
                  {isEnrolling ? "Enrolling..." : isFree ? "Enroll Free" : "Access Course"}
                </Button>
              ) : isLoggedIn && !isFree ? (
                <div className="space-y-3">
                  <Button
                    className="w-full"
                    onClick={() => setShowPaymentModal(true)}
                  >
                    Purchase — ${course.price!.toFixed(2)}
                  </Button>
                  {subscriptionPrice !== null && (
                    <Link href="/ce/subscribe">
                      <Button variant="outline" className="w-full text-xs">
                        Or subscribe for ${subscriptionPrice.toFixed(2)}/yr — all courses
                      </Button>
                    </Link>
                  )}
                </div>
              ) : !isLoggedIn ? (
                <Link href={`/ce/login?redirect=/ce/course/${id}`}>
                  <Button className="w-full">Sign In to Enroll</Button>
                </Link>
              ) : null}

              {enrolled && enrollment?.progress_percentage !== undefined && enrollment.progress_percentage > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{enrollment.progress_percentage}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className="bg-red-700 h-1.5 rounded-full"
                      style={{ width: `${enrollment.progress_percentage}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="border-t pt-3 space-y-2 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  {course.ceh_hours} Continuing Education Hour{course.ceh_hours !== 1 ? "s" : ""}
                </p>
                <p className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 shrink-0" />
                  Passing score: {course.passing_score}%
                </p>
                {course.is_capce_accredited && (
                  <p className="flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 shrink-0" />
                    CAPCE Approved
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {course && !isFree && (
        <SquarePaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            setHasPurchase(true);
          }}
          type="course"
          courseId={id}
          amount={course.price!}
          title={course.title}
        />
      )}
    </div>
  );
}
