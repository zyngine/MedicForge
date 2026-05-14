import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkPlagiarism } from "@/lib/plagiarism-utils";
import { runAIDetection } from "@/lib/plagiarism/ai-detection";
import { runWebSearch } from "@/lib/plagiarism/web-search";
import { parseDocumentsFromUrls, type ParsedFile } from "@/lib/plagiarism/file-parser";
import { stripCitedQuotes } from "@/lib/plagiarism/citations";
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

function extractFileUrls(file_urls: unknown): string[] {
  if (Array.isArray(file_urls)) return file_urls.filter((u): u is string => typeof u === "string");
  if (typeof file_urls === "string") {
    try {
      const parsed = JSON.parse(file_urls);
      if (Array.isArray(parsed)) return parsed.filter((u): u is string => typeof u === "string");
    } catch {
      return [];
    }
  }
  return [];
}

function hashContent(text: string): string {
  return crypto.createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin: AnyClient = createAdminClient();
  const { data: profile } = await admin
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

  const { data: submission } = await admin
    .from("submissions")
    .select("id, tenant_id, user_id, content, file_urls")
    .eq("id", submissionId)
    .maybeSingle();
  if (!submission || submission.tenant_id !== profile.tenant_id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (profile.role === "student" && submission.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 1. Gather text from typed content AND parsed file uploads.
  const typedText = (overrideContent && overrideContent.trim()) || extractText(submission.content);
  const fileUrls = extractFileUrls(submission.file_urls);
  const parsedFiles: ParsedFile[] = fileUrls.length > 0 ? await parseDocumentsFromUrls(fileUrls) : [];
  const combinedRaw = [typedText, ...parsedFiles.map((f) => f.text)]
    .filter((t) => t && t.trim().length > 0)
    .join("\n\n");
  if (!combinedRaw || combinedRaw.trim().length < 20) {
    return NextResponse.json({ error: "Not enough text content to check" }, { status: 400 });
  }

  // 2. Strip properly-cited quotes so they don't penalize the student.
  const { stripped: textForCheck, removedWords, originalWords } = stripCitedQuotes(combinedRaw);
  const wordCount = textForCheck.split(/\s+/).filter((w) => w.length > 0).length;
  if (wordCount < 10) {
    return NextResponse.json(
      { error: "After removing cited quotes, not enough original text remains to check" },
      { status: 400 },
    );
  }

  // 3. Mark the check as processing.
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
        original_content: combinedRaw,
        word_count: originalWords,
        similarity_score: null,
        matches: null,
        ai_score: null,
        ai_provider: null,
        web_match_count: null,
        web_matches: null,
        parsed_files: null,
        citations_removed_words: null,
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
        original_content: combinedRaw,
        word_count: originalWords,
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    checkId = data.id;
  }

  // 4. Fan out the three checks in parallel: internal sources, web search,
  //    AI detection. Each is wrapped so a single failure doesn't kill the
  //    pipeline.
  const { data: sources } = await admin
    .from("plagiarism_sources")
    .select("id, title, source_type, content, source_id")
    .eq("tenant_id", profile.tenant_id)
    .eq("is_active", true)
    .neq("source_id", submissionId);
  const sourcesForCheck = ((sources || []) as {
    id: string;
    title: string;
    source_type: string;
    content: string;
  }[]).map((s) => ({ id: s.id, title: s.title, type: s.source_type, content: s.content }));

  const [internalResult, webResult, aiResult] = await Promise.all([
    Promise.resolve(checkPlagiarism(textForCheck, sourcesForCheck)),
    runWebSearch(textForCheck).catch((e) => {
      console.error("[plagiarism/check] web search failed:", e);
      return null;
    }),
    runAIDetection(textForCheck).catch((e) => {
      console.error("[plagiarism/check] AI detection failed:", e);
      return null;
    }),
  ]);

  // 5. Compute headline similarity: take the worst signal (internal or web).
  const internalScore = internalResult.overallSimilarity;
  const webScore = webResult && webResult.results.length > 0
    ? Math.min(95, webResult.results.length * 12) // crude: 1 hit ≈ 12%, capped
    : 0;
  const headline = Math.round(Math.max(internalScore, webScore) * 100) / 100;

  // 6. Persist the final report.
  await admin
    .from("plagiarism_checks")
    .update({
      status: "completed",
      similarity_score: headline,
      matches: internalResult.matches,
      ai_score: aiResult?.aiScore ?? null,
      ai_provider: aiResult?.provider ?? null,
      web_match_count: webResult?.results.length ?? null,
      web_matches: webResult?.results ?? null,
      parsed_files: parsedFiles.length > 0
        ? parsedFiles.map((f) => ({ url: f.url, fileName: f.fileName, wordCount: f.wordCount }))
        : null,
      citations_removed_words: removedWords,
      checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", checkId);

  // 7. Index this submission as a plagiarism source for future cross-checks.
  try {
    const content_hash = hashContent(textForCheck);
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
          content: textForCheck,
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
        content: textForCheck,
        content_hash,
        word_count: wordCount,
        is_active: true,
      });
    }
  } catch (e) {
    console.error("[plagiarism/check] indexing failed:", e);
  }

  return NextResponse.json({
    success: true,
    check_id: checkId,
    similarity_score: headline,
    internal_similarity: internalScore,
    internal_match_count: internalResult.matches.length,
    web_match_count: webResult?.results.length ?? 0,
    web_provider: webResult?.provider ?? null,
    web_configured: webResult?.configured ?? false,
    ai_score: aiResult?.aiScore ?? null,
    ai_is_generated: aiResult?.isAIGenerated ?? null,
    ai_confidence: aiResult?.confidence ?? null,
    ai_provider: aiResult?.provider ?? null,
    parsed_file_count: parsedFiles.length,
    citations_removed_words: removedWords,
  });
}
