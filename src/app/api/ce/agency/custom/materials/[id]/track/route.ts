import { NextResponse } from "next/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { gradeQuiz, type QuizQuestion } from "@/lib/ce-custom-training/grade-quiz";
import { deriveCompletedAt } from "@/lib/ce-custom-training/derive-completion";

interface ViewedEvent { event: "viewed" }
interface QuizSubmitEvent { event: "quiz_submit"; answers: number[] }
type TrackEvent = ViewedEvent | QuizSubmitEvent;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const event = (await request.json()) as TrackEvent;
  if (!event || (event.event !== "viewed" && event.event !== "quiz_submit")) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const admin = createCEAdminClient();

  const { data: material } = await admin
    .from("ce_custom_materials")
    .select("id, agency_id")
    .eq("id", id)
    .maybeSingle();
  if (!material) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: ce } = await admin
    .from("ce_users")
    .select("agency_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!ce || ce.agency_id !== material.agency_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existing } = await admin
    .from("ce_custom_completions")
    .select("id, viewed_at, quiz_score, quiz_passed_at")
    .eq("material_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: quiz } = await admin
    .from("ce_custom_quizzes")
    .select("pass_threshold, questions")
    .eq("material_id", id)
    .maybeSingle();

  const now = new Date().toISOString();
  let viewed_at: string | null = existing?.viewed_at ?? null;
  let quiz_score: number | null = existing?.quiz_score ?? null;
  let quiz_passed_at: string | null = existing?.quiz_passed_at ?? null;

  if (event.event === "viewed") {
    if (!viewed_at) viewed_at = now;
  } else {
    if (!quiz) return NextResponse.json({ error: "No quiz for material" }, { status: 400 });
    const result = gradeQuiz(quiz.questions as QuizQuestion[], event.answers || []);
    quiz_score = result.score;
    if (result.score >= (quiz.pass_threshold ?? 80) && !quiz_passed_at) {
      quiz_passed_at = now;
    }
  }

  const completed_at = deriveCompletedAt({ viewed_at, quiz_passed_at, hasQuiz: !!quiz });

  const upsertRow = {
    material_id: id,
    user_id: user.id,
    viewed_at,
    quiz_score,
    quiz_passed_at,
    completed_at,
    updated_at: now,
  };

  const { error } = await admin
    .from("ce_custom_completions")
    .upsert(upsertRow, { onConflict: "material_id,user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ completion: upsertRow });
}
