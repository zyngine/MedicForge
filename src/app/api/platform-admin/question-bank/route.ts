import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function verifyPlatformAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("platform_admins")
    .select("id")
    .eq("user_id", user.id)
    .single();

  return data ? user : null;
}

// POST - Bulk import questions into the global question bank
export async function POST(request: NextRequest) {
  try {
    const user = await verifyPlatformAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Platform admin access required" },
        { status: 403 }
      );
    }

    const { questions } = await request.json();

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "No questions provided" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const rows = questions.map((q: Record<string, unknown>) => ({
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options ?? null,
      correct_answer: q.correct_answer ?? { answerId: "a" },
      explanation: q.explanation ?? null,
      certification_level: q.certification_level ?? "EMT",
      difficulty: q.difficulty ?? "medium",
      points: q.points ?? 1,
      time_estimate_seconds: q.time_estimate_seconds ?? 60,
      tags: q.tags ?? null,
      tenant_id: null, // Global — visible to all tenants
      is_validated: false,
      created_by: user.id,
    }));

    const { data, error } = await adminClient
      .from("question_bank")
      .insert(rows)
      .select("id");

    if (error) {
      console.error("Platform admin question import error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: data?.length ?? 0,
    });
  } catch (error) {
    console.error("Platform admin question import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
