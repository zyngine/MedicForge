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

// PATCH - Update a single question (bypasses RLS via service role)
export async function PATCH(request: NextRequest) {
  try {
    const user = await verifyPlatformAdmin();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Platform admin access required" },
        { status: 403 }
      );
    }

    const { id, ...updates } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Question ID required" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (adminClient as any)
      .from("question_bank")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("Platform admin question update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, question: data });
  } catch (error) {
    console.error("Platform admin question update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
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

    const rows = questions.map((q: Record<string, any>) => ({
      question_text: q.question_text as string,
      question_type: q.question_type as string,
      options: (q.options ?? null) as object | null,
      correct_answer: (q.correct_answer ?? { answerId: "a" }) as object,
      explanation: (q.explanation ?? null) as string | null,
      certification_level: (q.certification_level ?? "EMT") as string,
      difficulty: (q.difficulty ?? "medium") as string,
      points: (q.points ?? 1) as number,
      time_estimate_seconds: (q.time_estimate_seconds ?? 60) as number,
      tags: (q.tags ?? null) as string[] | null,
      tenant_id: null,
      is_validated: false,

    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (adminClient as any)
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
