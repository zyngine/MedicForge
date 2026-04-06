import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

interface QuestionImportRow {
  question_text: string;
  question_type: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  option_e?: string;
  correct_answer: string;
  explanation?: string;
  category?: string;
  difficulty?: string;
  points?: string | number;
  source?: string;
}

interface ImportResult {
  identifier: string;
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { questions, tenant_id, category_id } = await request.json();

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "No questions provided" },
        { status: 400 }
      );
    }

    if (!tenant_id) {
      return NextResponse.json(
        { error: "Tenant ID is required" },
        { status: 400 }
      );
    }

    // Verify the requesting user is an instructor/admin of this tenant
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAdmin: any = createAdminClient();

    const { data: requesterProfile } = await supabaseAdmin
      .from("users")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (!requesterProfile || requesterProfile.tenant_id !== tenant_id ||
        !["admin", "instructor"].includes(requesterProfile.role || "")) {
      return NextResponse.json(
        { error: "Unauthorized - must be instructor or admin" },
        { status: 403 }
      );
    }

    const results: ImportResult[] = [];

    for (const q of questions as QuestionImportRow[]) {
      const questionText = q.question_text?.trim();
      const identifier = questionText?.substring(0, 50) + (questionText?.length > 50 ? "..." : "");

      try {
        // Build options array based on question type
        let options: { key: string; text: string }[] = [];
        let correctAnswer: string | string[];

        const questionType = q.question_type?.toLowerCase().trim();

        if (questionType === "true_false") {
          options = [
            { key: "True", text: "True" },
            { key: "False", text: "False" },
          ];
          correctAnswer = q.correct_answer?.trim().toLowerCase() === "true" ? "True" : "False";
        } else if (questionType === "multiple_choice" || questionType === "multi_select") {
          // Build options from option_a through option_e
          if (q.option_a?.trim()) options.push({ key: "A", text: q.option_a.trim() });
          if (q.option_b?.trim()) options.push({ key: "B", text: q.option_b.trim() });
          if (q.option_c?.trim()) options.push({ key: "C", text: q.option_c.trim() });
          if (q.option_d?.trim()) options.push({ key: "D", text: q.option_d.trim() });
          if (q.option_e?.trim()) options.push({ key: "E", text: q.option_e.trim() });

          // Parse correct answer(s)
          const answerStr = q.correct_answer?.toUpperCase().trim() || "";
          if (questionType === "multi_select") {
            // Multi-select: comma-separated answers like "A,B,D"
            correctAnswer = answerStr.split(",").map((a) => a.trim()).filter(Boolean);
          } else {
            correctAnswer = answerStr;
          }
        } else {
          results.push({
            identifier,
            success: false,
            error: `Invalid question type: ${q.question_type}`,
          });
          continue;
        }

        // Map difficulty
        const difficultyMap: Record<string, string> = {
          easy: "easy",
          medium: "medium",
          hard: "hard",
          expert: "expert",
        };
        const difficulty = difficultyMap[q.difficulty?.toLowerCase().trim() || ""] || "medium";

        // Parse points
        const points = typeof q.points === "number" ? q.points : parseInt(String(q.points)) || 1;

        // Insert into question_bank
        const { error: insertError } = await supabaseAdmin.from("question_bank").insert({
          tenant_id,
          category_id: category_id || null,
          question_text: questionText,
          question_type: questionType === "multi_select" ? "multiple_choice" : questionType,
          options,
          correct_answer: correctAnswer,
          explanation: q.explanation?.trim() || null,
          difficulty,
          points,
          source: q.source?.trim() || null,
          is_validated: false,
          is_active: true,
          created_by: user.id,
        });

        if (insertError) {
          results.push({
            identifier,
            success: false,
            error: insertError.message,
          });
          continue;
        }

        results.push({
          identifier,
          success: true,
        });
      } catch (err) {
        results.push({
          identifier,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: questions.length,
        imported: successCount,
        failed: failedCount,
      },
    });
  } catch (error) {
    console.error("Question import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
