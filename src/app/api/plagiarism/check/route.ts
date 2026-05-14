import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkPlagiarism } from "@/lib/plagiarism-utils";
import crypto from "crypto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (content && typeof content === "object") {
    const obj = content as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.html === "string") {
      return String(obj.html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    }
  }
  return "";
}

function hashContent(text: string): string {
  return crypto.createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin: AnyClient = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (admin as any)
    .from("users")
    .select("id, role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const submissionId: string | undefined = body.submission_id || body.submissionId;
  const overrideContent: string | undefined = body.content;
  if (!submissionId) {
    return NextResponse.json({ error: "Missing submission_id" }, { status: 400 });
  }

  // Fetch the submission and verify tenant scoping (and student access).
  const { data: submission } = await admin
    .from("submissions")
    .select("id, tenant_id, user_id, content")
    .eq("id", submissionId)
    .maybeSingle();
  if (!submission || submission.tenant_id !== profile.tenant_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Students can only kick off a check on their own submission. Instructors
  // and admins can run it on any submission in their tenant.
  if (profile.role === "student" && submission.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const text = (overrideContent && overrideContent.trim()) || extractText(submission.content);
  if (!text || text.trim().length < 20) {
    return NextResponse.json({ error: "Not enough text content to check" }, { status: 400 });
  }
  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;

  // Upsert the check row in 'processing' state.
  const { data: existingCheck } = await admin
    .from("plagiarism_checks")
    .select("id")
    .eq("submission_id", submissionId)
    .maybeSingle();

  let checkId: string;
  if (existingCheck) {
    const { data, error } = await admin
      .from("plagiarism_checks")
      .update({
        status: "processing",
        requested_by: user.id,
        original_content: text,
        word_count: wordCount,
        similarity_score: null,
        matches: null,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingCheck.id)
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    checkId = data.id;
  } else {
    const { data, error } = await admin
      .from("plagiarism_checks")
      .insert({
        tenant_id: profile.tenant_id,
        submission_id: submissionId,
        requested_by: user.id,
        status: "processing",
        original_content: text,
        word_count: wordCount,
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    checkId = data.id;
  }

  // Fetch sources (skip this submission's own indexed source if any).
  const { data: sources } = await admin
    .from("plagiarism_sources")
    .select("id, title, source_type, content, source_id")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_active", true)
    .neq("source_id", submissionId);

  const result = checkPlagiarism(
    text,
    ((sources || []) as { id: string; title: string; source_type: string; content: string }[]).map((s) => ({
      id: s.id,
      title: s.title,
      type: s.source_type,
      content: s.content,
    })),
  );

  await admin
    .from("plagiarism_checks")
    .update({
      status: "completed",
      similarity_score: result.overallSimilarity,
      matches: result.matches,
      checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", checkId);

  // Index this submission as a plagiarism source so future checks compare
  // against it (cross-submission detection). Use hash as dedupe key.
  try {
    const content_hash = hashContent(text);
    const { data: studentRow } = await admin
      .from("users")
      .select("first_name, last_name")
      .eq("id", submission.user_id)
      .maybeSingle();
    const studentLabel = studentRow
      ? `${studentRow.first_name || ""} ${studentRow.last_name || ""}`.trim()
      : "Student submission";
    const sourceTitle = `${studentLabel || "Student"} — submission ${submissionId.slice(0, 8)}`;

    const { data: existingSource } = await admin
      .from("plagiarism_sources")
      .select("id")
      .eq("tenant_id", profile.tenant_id)
      .eq("source_type", "submission")
      .eq("source_id", submissionId)
      .maybeSingle();

    if (existingSource) {
      await admin
        .from("plagiarism_sources")
        .update({
          title: sourceTitle,
          content: text,
          content_hash,
          word_count: wordCount,
          is_active: true,
        })
        .eq("id", existingSource.id);
    } else {
      await admin.from("plagiarism_sources").insert({
        tenant_id: profile.tenant_id,
        source_type: "submission",
        source_id: submissionId,
        title: sourceTitle,
        content: text,
        content_hash,
        word_count: wordCount,
        is_active: true,
      });
    }
  } catch (e) {
    console.error("[plagiarism check] indexing failed:", e);
  }

  return NextResponse.json({
    success: true,
    check_id: checkId,
    similarity_score: result.overallSimilarity,
    match_count: result.matches.length,
  });
}
