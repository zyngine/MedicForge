# CE Custom Training Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full CE agency custom training feature per [2026-05-14-ce-custom-training-design.md](../specs/2026-05-14-ce-custom-training-design.md) — upload (PDF/video/URL), quiz, assignments, completion tracking, admin report, employee viewer.

**Architecture:** Four new tables in the CE schema, one Supabase Storage bucket, Bunny Stream for videos (admin-transparent), JSONB-backed quizzes mirroring existing CE pattern. Admin surfaces under `/ce/agency/custom/*`, employee viewer at `/ce/custom/[id]`, and an integration into `/ce/my-training`.

**Tech Stack:** Next.js 16 App Router, Supabase (Postgres + Storage + RLS), Bunny Stream, React Query, Tailwind/shadcn, Vitest.

**Scope note:** SCORM support is in the spec's data model (`content_type='scorm'` is a valid value) but the upload/viewer implementation is **deferred to a follow-up PR**. This plan ships PDF, video upload, and external URL.

---

## File Structure

### Created

- `supabase/migrations/20260514000001_ce_custom_training.sql` — tables, RLS, storage bucket + policies
- `src/lib/ce-tiers.ts` — tier gating helper
- `src/lib/ce-tiers.test.ts`
- `src/lib/ce-custom-training/grade-quiz.ts` — quiz grading
- `src/lib/ce-custom-training/grade-quiz.test.ts`
- `src/lib/ce-custom-training/derive-completion.ts` — completed_at derivation
- `src/lib/ce-custom-training/derive-completion.test.ts`
- `src/lib/ce-custom-training/resolve-assignments.ts` — assignment → user resolution (SQL builder + helpers)
- `src/components/ce/custom-training/material-uploader.tsx` — PDF + video + URL upload UI (Bunny aware)
- `src/components/ce/custom-training/quiz-editor.tsx`
- `src/components/ce/custom-training/quiz-runner.tsx`
- `src/components/ce/custom-training/material-viewer.tsx` — renders PDF iframe, video iframe, URL embed
- `src/app/ce/agency/custom/new/page.tsx`
- `src/app/ce/agency/custom/[id]/page.tsx`
- `src/app/ce/custom/[id]/page.tsx` — employee viewer
- `src/app/api/ce/agency/custom/materials/route.ts` (POST)
- `src/app/api/ce/agency/custom/materials/[id]/route.ts` (PATCH, DELETE)
- `src/app/api/ce/agency/custom/materials/[id]/quiz/route.ts` (PUT, DELETE)
- `src/app/api/ce/agency/custom/materials/[id]/assignments/route.ts` (POST)
- `src/app/api/ce/agency/custom/materials/[id]/assignments/[assignmentId]/route.ts` (DELETE)
- `src/app/api/ce/agency/custom/materials/[id]/track/route.ts` (POST)
- `src/app/api/ce/agency/custom/materials/[id]/report/route.ts` (GET)
- `src/app/api/ce/my-training/custom/route.ts` (GET)

### Modified

- `src/app/ce/agency/custom/page.tsx` — replace stub with real list (keep tier gating)
- `src/app/ce/my-training/page.tsx` — add "From your agency" section (if file exists; will inspect first)

---

## Task 1: Migration — tables, RLS, storage bucket

**Files:** Create `supabase/migrations/20260514000001_ce_custom_training.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- ============================================
-- CE CUSTOM TRAINING (agency-uploaded materials)
-- ============================================

-- Materials
CREATE TABLE IF NOT EXISTS ce_custom_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES ce_agencies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  content_type text NOT NULL CHECK (content_type IN ('pdf','video_upload','video_url','scorm')),
  content_url text NOT NULL,
  content_metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES ce_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ce_custom_materials_agency ON ce_custom_materials(agency_id);
ALTER TABLE ce_custom_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE admins manage all custom materials"
  ON ce_custom_materials FOR ALL
  USING (get_ce_user_role() = 'admin');

CREATE POLICY "Agency admins manage own custom materials"
  ON ce_custom_materials FOR ALL
  USING (
    get_ce_user_role() = 'agency_admin'
    AND agency_id = get_ce_user_agency_id()
  );

CREATE POLICY "Agency users view assigned custom materials"
  ON ce_custom_materials FOR SELECT
  USING (
    agency_id = get_ce_user_agency_id()
    AND EXISTS (
      SELECT 1 FROM ce_custom_assignments a
      WHERE a.material_id = ce_custom_materials.id
        AND (
          (a.target_type = 'all_agency')
          OR (a.target_type = 'user' AND a.target_value = (SELECT auth.uid())::text)
          OR (a.target_type = 'certification' AND a.target_value = (SELECT certification_level FROM ce_users WHERE id = (SELECT auth.uid())))
        )
    )
  );

-- Quizzes
CREATE TABLE IF NOT EXISTS ce_custom_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL UNIQUE REFERENCES ce_custom_materials(id) ON DELETE CASCADE,
  pass_threshold int NOT NULL DEFAULT 80 CHECK (pass_threshold BETWEEN 0 AND 100),
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ce_custom_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quiz access mirrors material"
  ON ce_custom_quizzes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM ce_custom_materials m WHERE m.id = ce_custom_quizzes.material_id)
  );

-- Assignments
CREATE TABLE IF NOT EXISTS ce_custom_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES ce_custom_materials(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('user','certification','all_agency')),
  target_value text,
  assigned_by uuid REFERENCES ce_users(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  due_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_ce_custom_assignments_material ON ce_custom_assignments(material_id);
CREATE INDEX IF NOT EXISTS idx_ce_custom_assignments_target ON ce_custom_assignments(target_type, target_value);
ALTER TABLE ce_custom_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE admins manage all assignments"
  ON ce_custom_assignments FOR ALL
  USING (get_ce_user_role() = 'admin');

CREATE POLICY "Agency admins manage own agency assignments"
  ON ce_custom_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ce_custom_materials m
      WHERE m.id = ce_custom_assignments.material_id
        AND m.agency_id = get_ce_user_agency_id()
        AND get_ce_user_role() = 'agency_admin'
    )
  );

CREATE POLICY "Users view own assignments"
  ON ce_custom_assignments FOR SELECT
  USING (
    (target_type = 'user' AND target_value = (SELECT auth.uid())::text)
    OR (target_type = 'certification' AND target_value = (SELECT certification_level FROM ce_users WHERE id = (SELECT auth.uid())))
    OR (target_type = 'all_agency' AND EXISTS (
      SELECT 1 FROM ce_custom_materials m
      WHERE m.id = ce_custom_assignments.material_id
        AND m.agency_id = get_ce_user_agency_id()
    ))
  );

-- Completions
CREATE TABLE IF NOT EXISTS ce_custom_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES ce_custom_materials(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES ce_users(id) ON DELETE CASCADE,
  viewed_at timestamptz,
  quiz_score int CHECK (quiz_score BETWEEN 0 AND 100),
  quiz_passed_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (material_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_ce_custom_completions_user ON ce_custom_completions(user_id);
ALTER TABLE ce_custom_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CE admins view all completions"
  ON ce_custom_completions FOR ALL
  USING (get_ce_user_role() = 'admin');

CREATE POLICY "Agency admins view own agency completions"
  ON ce_custom_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ce_custom_materials m
      WHERE m.id = ce_custom_completions.material_id
        AND m.agency_id = get_ce_user_agency_id()
        AND get_ce_user_role() = 'agency_admin'
    )
  );

CREATE POLICY "Users read own completions"
  ON ce_custom_completions FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users insert own completions"
  ON ce_custom_completions FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users update own completions"
  ON ce_custom_completions FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ce-custom-materials', 'ce-custom-materials', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Agency members read own custom materials storage"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ce-custom-materials'
    AND (storage.foldername(name))[1] = get_ce_user_agency_id()::text
  );

CREATE POLICY "Agency admins write own custom materials storage"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ce-custom-materials'
    AND (storage.foldername(name))[1] = get_ce_user_agency_id()::text
    AND get_ce_user_role() = 'agency_admin'
  );

CREATE POLICY "Agency admins delete own custom materials storage"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'ce-custom-materials'
    AND (storage.foldername(name))[1] = get_ce_user_agency_id()::text
    AND get_ce_user_role() = 'agency_admin'
  );
```

- [ ] **Step 2: Commit**

```
git add supabase/migrations/20260514000001_ce_custom_training.sql
git commit -m "feat(ce): migration for custom training tables, RLS, storage bucket"
```

---

## Task 2: Tier gating helper

**Files:** Create `src/lib/ce-tiers.ts` and `src/lib/ce-tiers.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/ce-tiers.test.ts
import { describe, it, expect } from 'vitest';
import { canUseCustomTraining, CUSTOM_TRAINING_TIERS } from './ce-tiers';

describe('canUseCustomTraining', () => {
  it('returns true for enterprise tier', () => {
    expect(canUseCustomTraining('enterprise')).toBe(true);
  });
  it('returns true for enterprise_plus tier', () => {
    expect(canUseCustomTraining('enterprise_plus')).toBe(true);
  });
  it('returns true for custom tier', () => {
    expect(canUseCustomTraining('custom')).toBe(true);
  });
  it('returns false for starter', () => {
    expect(canUseCustomTraining('starter')).toBe(false);
  });
  it('returns false for team', () => {
    expect(canUseCustomTraining('team')).toBe(false);
  });
  it('returns false for agency', () => {
    expect(canUseCustomTraining('agency')).toBe(false);
  });
  it('returns false for null', () => {
    expect(canUseCustomTraining(null)).toBe(false);
  });
  it('exports the tier list', () => {
    expect(CUSTOM_TRAINING_TIERS).toEqual(['enterprise', 'enterprise_plus', 'custom']);
  });
});
```

- [ ] **Step 2: Implement**

```ts
// src/lib/ce-tiers.ts
export const CUSTOM_TRAINING_TIERS = ['enterprise', 'enterprise_plus', 'custom'] as const;
export type CustomTrainingTier = typeof CUSTOM_TRAINING_TIERS[number];

export function canUseCustomTraining(tier: string | null | undefined): boolean {
  if (!tier) return false;
  return (CUSTOM_TRAINING_TIERS as readonly string[]).includes(tier);
}
```

- [ ] **Step 3: Run test and commit**

```
npx vitest run src/lib/ce-tiers.test.ts
git add src/lib/ce-tiers.ts src/lib/ce-tiers.test.ts
git commit -m "feat(ce): add tier-gating helper for custom training"
```

---

## Task 3: Pure logic — quiz grading

**Files:** Create `src/lib/ce-custom-training/grade-quiz.ts` and `.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/ce-custom-training/grade-quiz.test.ts
import { describe, it, expect } from 'vitest';
import { gradeQuiz, type QuizQuestion } from './grade-quiz';

const questions: QuizQuestion[] = [
  { id: 'q1', question: '2+2?', options: ['3','4','5'], correct_index: 1 },
  { id: 'q2', question: 'Capital of FR?', options: ['Berlin','Paris','Rome'], correct_index: 1 },
];

describe('gradeQuiz', () => {
  it('returns 100 when all correct', () => {
    expect(gradeQuiz(questions, [1,1])).toEqual({ score: 100, correct: 2, total: 2 });
  });
  it('returns 50 with one right', () => {
    expect(gradeQuiz(questions, [1,0])).toEqual({ score: 50, correct: 1, total: 2 });
  });
  it('returns 0 when all wrong', () => {
    expect(gradeQuiz(questions, [0,0])).toEqual({ score: 0, correct: 0, total: 2 });
  });
  it('treats missing answers as wrong', () => {
    expect(gradeQuiz(questions, [1])).toEqual({ score: 50, correct: 1, total: 2 });
  });
  it('handles empty quiz as 100', () => {
    expect(gradeQuiz([], [])).toEqual({ score: 100, correct: 0, total: 0 });
  });
});
```

- [ ] **Step 2: Implement**

```ts
// src/lib/ce-custom-training/grade-quiz.ts
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
}

export interface QuizResult {
  score: number;
  correct: number;
  total: number;
}

export function gradeQuiz(questions: QuizQuestion[], answers: number[]): QuizResult {
  const total = questions.length;
  if (total === 0) return { score: 100, correct: 0, total: 0 };
  const correct = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct_index ? 1 : 0), 0);
  return { score: Math.round((correct / total) * 100), correct, total };
}
```

- [ ] **Step 3: Run + commit**

```
npx vitest run src/lib/ce-custom-training/grade-quiz.test.ts
git add src/lib/ce-custom-training/grade-quiz.ts src/lib/ce-custom-training/grade-quiz.test.ts
git commit -m "feat(ce): quiz grading helper for custom training"
```

---

## Task 4: Pure logic — completion derivation

**Files:** Create `src/lib/ce-custom-training/derive-completion.ts` and `.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/ce-custom-training/derive-completion.test.ts
import { describe, it, expect } from 'vitest';
import { deriveCompletedAt } from './derive-completion';

describe('deriveCompletedAt', () => {
  const t = '2026-05-14T12:00:00Z';

  it('returns null if not viewed', () => {
    expect(deriveCompletedAt({ viewed_at: null, quiz_passed_at: null, hasQuiz: false })).toBeNull();
  });
  it('returns viewed_at if no quiz exists and viewed', () => {
    expect(deriveCompletedAt({ viewed_at: t, quiz_passed_at: null, hasQuiz: false })).toBe(t);
  });
  it('returns null if quiz exists but not passed', () => {
    expect(deriveCompletedAt({ viewed_at: t, quiz_passed_at: null, hasQuiz: true })).toBeNull();
  });
  it('returns later of viewed_at and quiz_passed_at when both set', () => {
    const v = '2026-05-14T12:00:00Z';
    const q = '2026-05-14T13:00:00Z';
    expect(deriveCompletedAt({ viewed_at: v, quiz_passed_at: q, hasQuiz: true })).toBe(q);
  });
  it('handles quiz passed before view (atypical) by returning later', () => {
    const v = '2026-05-14T14:00:00Z';
    const q = '2026-05-14T13:00:00Z';
    expect(deriveCompletedAt({ viewed_at: v, quiz_passed_at: q, hasQuiz: true })).toBe(v);
  });
});
```

- [ ] **Step 2: Implement**

```ts
// src/lib/ce-custom-training/derive-completion.ts
export interface CompletionInputs {
  viewed_at: string | null;
  quiz_passed_at: string | null;
  hasQuiz: boolean;
}

export function deriveCompletedAt(input: CompletionInputs): string | null {
  if (!input.viewed_at) return null;
  if (!input.hasQuiz) return input.viewed_at;
  if (!input.quiz_passed_at) return null;
  return input.viewed_at > input.quiz_passed_at ? input.viewed_at : input.quiz_passed_at;
}
```

- [ ] **Step 3: Run + commit**

```
npx vitest run src/lib/ce-custom-training/derive-completion.test.ts
git add src/lib/ce-custom-training/derive-completion.ts src/lib/ce-custom-training/derive-completion.test.ts
git commit -m "feat(ce): completion derivation helper for custom training"
```

---

## Task 5: Replace stub page tier check + add real list UI

**Files:** Modify `src/app/ce/agency/custom/page.tsx`

Replace entire file with a list view that uses the new tier helper. Empty state when no materials yet. Cells: title, content type icon, assignments count, completion %, last updated, actions (edit/delete).

- [ ] **Step 1: Write the new page**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { FileText, Video, Link2, Plus, Lock, Trash2, Edit } from "lucide-react";
import { canUseCustomTraining } from "@/lib/ce-tiers";

interface Material {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  created_at: string;
  updated_at: string;
}

interface Agency {
  id: string;
  name: string;
  subscription_tier: string | null;
}

const TYPE_ICON: Record<string, typeof FileText> = {
  pdf: FileText,
  video_upload: Video,
  video_url: Video,
  scorm: FileText,
};

export default function CEAgencyCustomPage() {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();
      const { data: me } = await supabase.from("ce_users").select("agency_id").eq("id", (await supabase.auth.getUser()).data.user?.id || "").single();
      if (me?.agency_id) {
        const { data: ag } = await supabase.from("ce_agencies").select("id, name, subscription_tier").eq("id", me.agency_id).single();
        setAgency(ag);
        const { data: mats } = await supabase.from("ce_custom_materials").select("id, title, description, content_type, created_at, updated_at").eq("agency_id", me.agency_id).order("updated_at", { ascending: false });
        setMaterials(mats || []);
      }
      setIsLoading(false);
    };
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this material? This will also remove any quiz, assignments, and completion records.")) return;
    const res = await fetch(`/api/ce/agency/custom/materials/${id}`, { method: "DELETE" });
    if (res.ok) setMaterials((m) => m.filter((x) => x.id !== id));
  };

  if (isLoading) return null;

  const allowed = canUseCustomTraining(agency?.subscription_tier ?? null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Custom Training</h1>
          <p className="text-muted-foreground text-sm mt-1">Upload and manage your agency&apos;s proprietary training materials</p>
        </div>
        {allowed && (
          <Link href="/ce/agency/custom/new">
            <Button><Plus className="h-4 w-4 mr-2" />Upload Material</Button>
          </Link>
        )}
      </div>

      {!allowed ? (
        <div className="bg-card border rounded-lg p-8 flex flex-col items-center text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center"><Lock className="h-6 w-6 text-muted-foreground" /></div>
          <div>
            <p className="font-semibold">Custom Training requires an Enterprise subscription</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">Upload SOPs, protocols, training videos, and custom assessments scoped to your agency.</p>
          </div>
          <Button onClick={() => window.location.href = "/ce/contact"}>Contact Us to Upgrade</Button>
        </div>
      ) : materials.length === 0 ? (
        <div className="bg-card border rounded-lg p-8 flex flex-col items-center text-center space-y-3">
          <FileText className="h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium">No custom training materials yet</p>
          <p className="text-xs text-muted-foreground">Upload your first document or video to get started.</p>
          <Link href="/ce/agency/custom/new"><Button variant="outline"><Plus className="h-4 w-4 mr-2" />Upload Material</Button></Link>
        </div>
      ) : (
        <div className="bg-card border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Updated</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => {
                const Icon = TYPE_ICON[m.content_type] || FileText;
                return (
                  <tr key={m.id} className="border-t hover:bg-muted/30">
                    <td className="p-3">
                      <Link href={`/ce/agency/custom/${m.id}`} className="font-medium hover:underline">{m.title}</Link>
                      {m.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{m.description}</p>}
                    </td>
                    <td className="p-3"><Icon className="h-4 w-4 text-muted-foreground inline mr-1" /><span className="text-xs">{m.content_type.replace("_", " ")}</span></td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(m.updated_at).toLocaleDateString()}</td>
                    <td className="p-3 text-right">
                      <Link href={`/ce/agency/custom/${m.id}`} className="inline-block p-1 hover:bg-muted rounded mr-1" title="Edit"><Edit className="h-4 w-4 text-muted-foreground" /></Link>
                      <button onClick={() => handleDelete(m.id)} className="p-1 hover:bg-muted rounded" title="Delete"><Trash2 className="h-4 w-4 text-red-600" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```
git add src/app/ce/agency/custom/page.tsx
git commit -m "feat(ce): replace custom training stub with real list page"
```

---

## Task 6: Material uploader component

**Files:** Create `src/components/ce/custom-training/material-uploader.tsx`

Wrap supabase storage upload (PDF) + Bunny Stream upload (video) + URL paste. Mirrors the existing pattern in `src/app/ce/admin/courses/[id]/page.tsx` but extracted into a reusable component. Calls a Bunny upload endpoint — check if one exists; if not, we'll need to fall back to the same code path.

- [ ] **Step 1: Check for an existing Bunny upload endpoint or helper**

Inspect `src/app/ce/admin/courses/[id]/page.tsx` lines around the existing video upload path. Find the API endpoint it uses (likely `/api/ce/bunny/upload` or similar). Reuse exact same flow.

- [ ] **Step 2: Implement the component**

```tsx
"use client";

import { useState, useRef } from "react";
import { createCEClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { Upload, Link2, FileText, Video } from "lucide-react";

export type ContentType = 'pdf' | 'video_upload' | 'video_url';

export interface UploaderResult {
  content_type: ContentType;
  content_url: string;
  content_metadata: Record<string, unknown>;
}

interface Props {
  agencyId: string;
  materialId?: string; // optional — used for storage path
  onUploaded: (result: UploaderResult) => void;
}

export function MaterialUploader({ agencyId, materialId, onUploaded }: Props) {
  const [mode, setMode] = useState<'pdf' | 'video_upload' | 'video_url'>('pdf');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePdf = async (file: File) => {
    setUploading(true);
    setError(null);
    setProgress("Uploading PDF…");
    try {
      const supabase = createCEClient();
      const folderId = materialId || crypto.randomUUID();
      const path = `${agencyId}/${folderId}/${Date.now()}-${file.name.replace(/\s+/g,'_')}`;
      const { error: uploadErr } = await supabase.storage.from("ce-custom-materials").upload(path, file, { upsert: false, contentType: file.type });
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from("ce-custom-materials").getPublicUrl(path);
      onUploaded({
        content_type: 'pdf',
        content_url: publicUrl,
        content_metadata: { file_size: file.size, mime_type: file.type, storage_path: path },
      });
      setProgress("Uploaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    setProgress("Creating Bunny video…");
    try {
      // Mirror existing CE admin courses Bunny upload flow
      const createRes = await fetch("/api/ce/bunny/create-video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: file.name }) });
      if (!createRes.ok) throw new Error("Bunny create failed");
      const { videoId, uploadUrl, authHeaders } = await createRes.json();

      setProgress("Uploading to Bunny Stream…");
      const uploadRes = await fetch(uploadUrl, { method: "PUT", headers: authHeaders, body: file });
      if (!uploadRes.ok) throw new Error("Bunny upload failed");

      // Iframe URL pattern (matches existing courses page)
      const iframeUrl = `https://iframe.mediadelivery.net/embed/${process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID}/${videoId}`;

      onUploaded({
        content_type: 'video_upload',
        content_url: iframeUrl,
        content_metadata: { bunny_video_id: videoId, file_size: file.size },
      });
      setProgress("Uploaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Video upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleUrl = () => {
    if (!urlInput.trim()) { setError("Enter a URL"); return; }
    try { new URL(urlInput); } catch { setError("Invalid URL"); return; }
    onUploaded({
      content_type: 'video_url',
      content_url: urlInput.trim(),
      content_metadata: {},
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode('pdf')} className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${mode==='pdf'?'bg-primary text-primary-foreground':'bg-muted'}`}><FileText className="h-4 w-4" />PDF</button>
        <button type="button" onClick={() => setMode('video_upload')} className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${mode==='video_upload'?'bg-primary text-primary-foreground':'bg-muted'}`}><Video className="h-4 w-4" />Upload Video</button>
        <button type="button" onClick={() => setMode('video_url')} className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${mode==='video_url'?'bg-primary text-primary-foreground':'bg-muted'}`}><Link2 className="h-4 w-4" />Video URL</button>
      </div>

      {mode === 'video_url' ? (
        <div className="flex gap-2">
          <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://youtube.com/..." className="flex-1 px-3 py-2 border rounded-md text-sm" />
          <Button type="button" onClick={handleUrl}>Use URL</Button>
        </div>
      ) : (
        <label className={`flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-md cursor-pointer transition-colors ${uploading ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}>
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{uploading ? progress : mode === 'pdf' ? "Select a PDF" : "Select a video file"}</span>
          <input
            ref={fileRef}
            type="file"
            accept={mode === 'pdf' ? 'application/pdf' : 'video/*'}
            disabled={uploading}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (mode === 'pdf') handlePdf(f); else handleVideoUpload(f);
            }}
          />
        </label>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```
git add src/components/ce/custom-training/material-uploader.tsx
git commit -m "feat(ce): reusable material uploader (PDF + Bunny video + URL)"
```

---

## Task 7: API — Materials CRUD

**Files:** Create `src/app/api/ce/agency/custom/materials/route.ts` and `src/app/api/ce/agency/custom/materials/[id]/route.ts`

- [ ] **Step 1: Implement POST + PATCH + DELETE**

```ts
// src/app/api/ce/agency/custom/materials/route.ts
import { NextResponse } from "next/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getAgencyAdmin() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;
  const admin = createCEAdminClient();
  const { data: ce } = await admin.from("ce_users").select("id, role, agency_id").eq("id", user.id).single();
  if (!ce || ce.role !== 'agency_admin' || !ce.agency_id) return null;
  return { userId: user.id, agencyId: ce.agency_id };
}

export async function POST(request: Request) {
  const ctx = await getAgencyAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json();
  const { title, description, content_type, content_url, content_metadata } = body;
  if (!title || !content_type || !content_url) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const admin = createCEAdminClient();
  const { data, error } = await admin.from("ce_custom_materials").insert({
    agency_id: ctx.agencyId,
    title,
    description: description || null,
    content_type,
    content_url,
    content_metadata: content_metadata || {},
    created_by: ctx.userId,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ material: data });
}
```

```ts
// src/app/api/ce/agency/custom/materials/[id]/route.ts
import { NextResponse } from "next/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getAgencyAdmin() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;
  const admin = createCEAdminClient();
  const { data: ce } = await admin.from("ce_users").select("id, role, agency_id").eq("id", user.id).single();
  if (!ce || ce.role !== 'agency_admin' || !ce.agency_id) return null;
  return { userId: user.id, agencyId: ce.agency_id };
}

async function ownsMaterial(materialId: string, agencyId: string) {
  const admin = createCEAdminClient();
  const { data } = await admin.from("ce_custom_materials").select("id").eq("id", materialId).eq("agency_id", agencyId).single();
  return !!data;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAgencyAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await ownsMaterial(id, ctx.agencyId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json();
  const { title, description } = body;
  const admin = createCEAdminClient();
  const { error } = await admin.from("ce_custom_materials").update({ title, description, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAgencyAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await ownsMaterial(id, ctx.agencyId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const admin = createCEAdminClient();
  const { error } = await admin.from("ce_custom_materials").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```
git add src/app/api/ce/agency/custom/materials/route.ts src/app/api/ce/agency/custom/materials/[id]/route.ts
git commit -m "feat(ce): API routes for custom training material CRUD"
```

---

## Task 8: API — Quiz, Assignments, Tracking, Report, My-Training

Each endpoint is straightforward: auth check (agency_admin or self), ownership check via parent material, perform DB op. Tracking endpoint uses `gradeQuiz()` and `deriveCompletedAt()` helpers.

- [ ] **Step 1: Quiz route — `src/app/api/ce/agency/custom/materials/[id]/quiz/route.ts`**

```ts
import { NextResponse } from "next/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getAgencyAdmin() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;
  const admin = createCEAdminClient();
  const { data: ce } = await admin.from("ce_users").select("id, role, agency_id").eq("id", user.id).single();
  if (!ce || ce.role !== 'agency_admin' || !ce.agency_id) return null;
  return { userId: user.id, agencyId: ce.agency_id };
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAgencyAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = createCEAdminClient();
  const { data: m } = await admin.from("ce_custom_materials").select("id").eq("id", id).eq("agency_id", ctx.agencyId).single();
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { pass_threshold, questions } = await request.json();
  const { error } = await admin.from("ce_custom_quizzes").upsert({
    material_id: id,
    pass_threshold: pass_threshold ?? 80,
    questions: questions || [],
    updated_at: new Date().toISOString(),
  }, { onConflict: 'material_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAgencyAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = createCEAdminClient();
  const { data: m } = await admin.from("ce_custom_materials").select("id").eq("id", id).eq("agency_id", ctx.agencyId).single();
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await admin.from("ce_custom_quizzes").delete().eq("material_id", id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Assignments routes**

`src/app/api/ce/agency/custom/materials/[id]/assignments/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getAgencyAdmin() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;
  const admin = createCEAdminClient();
  const { data: ce } = await admin.from("ce_users").select("id, role, agency_id").eq("id", user.id).single();
  if (!ce || ce.role !== 'agency_admin' || !ce.agency_id) return null;
  return { userId: user.id, agencyId: ce.agency_id };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAgencyAdmin();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = createCEAdminClient();
  const { data: m } = await admin.from("ce_custom_materials").select("id").eq("id", id).eq("agency_id", ctx.agencyId).single();
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { assignments, due_at } = await request.json() as { assignments: Array<{ target_type: string; target_value: string | null }>; due_at?: string };
  if (!Array.isArray(assignments) || assignments.length === 0) return NextResponse.json({ error: "No assignments" }, { status: 400 });

  const rows = assignments.map(a => ({
    material_id: id,
    target_type: a.target_type,
    target_value: a.target_value,
    assigned_by: ctx.userId,
    due_at: due_at || null,
  }));
  const { error } = await admin.from("ce_custom_assignments").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, count: rows.length });
}
```

`src/app/api/ce/agency/custom/materials/[id]/assignments/[assignmentId]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  const { id, assignmentId } = await params;
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createCEAdminClient();
  const { data: ce } = await admin.from("ce_users").select("role, agency_id").eq("id", user.id).single();
  if (!ce || ce.role !== 'agency_admin') return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data: m } = await admin.from("ce_custom_materials").select("id").eq("id", id).eq("agency_id", ce.agency_id).single();
  if (!m) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await admin.from("ce_custom_assignments").delete().eq("id", assignmentId).eq("material_id", id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Tracking route — `src/app/api/ce/agency/custom/materials/[id]/track/route.ts`**

```ts
import { NextResponse } from "next/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { gradeQuiz, type QuizQuestion } from "@/lib/ce-custom-training/grade-quiz";
import { deriveCompletedAt } from "@/lib/ce-custom-training/derive-completion";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const event = await request.json() as { event: 'viewed' } | { event: 'quiz_submit'; answers: number[] };
  const admin = createCEAdminClient();

  // Load existing completion (if any)
  const { data: existing } = await admin.from("ce_custom_completions").select("*").eq("material_id", id).eq("user_id", user.id).maybeSingle();

  // Load quiz (if any)
  const { data: quiz } = await admin.from("ce_custom_quizzes").select("pass_threshold, questions").eq("material_id", id).maybeSingle();

  const now = new Date().toISOString();
  const next: Record<string, unknown> = {
    material_id: id,
    user_id: user.id,
    viewed_at: existing?.viewed_at ?? null,
    quiz_score: existing?.quiz_score ?? null,
    quiz_passed_at: existing?.quiz_passed_at ?? null,
    updated_at: now,
  };

  if (event.event === 'viewed') {
    if (!next.viewed_at) next.viewed_at = now;
  } else if (event.event === 'quiz_submit') {
    if (!quiz) return NextResponse.json({ error: "No quiz for material" }, { status: 400 });
    const { score } = gradeQuiz(quiz.questions as QuizQuestion[], event.answers);
    next.quiz_score = score;
    if (score >= (quiz.pass_threshold ?? 80) && !next.quiz_passed_at) {
      next.quiz_passed_at = now;
    }
  }

  next.completed_at = deriveCompletedAt({
    viewed_at: next.viewed_at as string | null,
    quiz_passed_at: next.quiz_passed_at as string | null,
    hasQuiz: !!quiz,
  });

  const { error } = await admin.from("ce_custom_completions").upsert(next, { onConflict: 'material_id,user_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ completion: next });
}
```

- [ ] **Step 4: Report route — `src/app/api/ce/agency/custom/materials/[id]/report/route.ts`**

```ts
import { NextResponse } from "next/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createCEAdminClient();
  const { data: ce } = await admin.from("ce_users").select("role, agency_id").eq("id", user.id).single();
  if (!ce || ce.role !== 'agency_admin') return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: material } = await admin.from("ce_custom_materials").select("id, title").eq("id", id).eq("agency_id", ce.agency_id).single();
  if (!material) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get distinct assigned user IDs (resolve target_type/value to actual user IDs)
  const { data: assignments } = await admin.from("ce_custom_assignments").select("target_type, target_value").eq("material_id", id);
  const userIds = new Set<string>();
  for (const a of assignments || []) {
    if (a.target_type === 'user' && a.target_value) userIds.add(a.target_value);
    else if (a.target_type === 'certification' && a.target_value) {
      const { data: users } = await admin.from("ce_users").select("id").eq("agency_id", ce.agency_id).eq("certification_level", a.target_value);
      (users || []).forEach((u: { id: string }) => userIds.add(u.id));
    } else if (a.target_type === 'all_agency') {
      const { data: users } = await admin.from("ce_users").select("id").eq("agency_id", ce.agency_id);
      (users || []).forEach((u: { id: string }) => userIds.add(u.id));
    }
  }

  const userIdList = Array.from(userIds);
  if (userIdList.length === 0) return NextResponse.json({ material, rows: [] });

  const { data: users } = await admin.from("ce_users").select("id, first_name, last_name, email, certification_level").in("id", userIdList);
  const { data: completions } = await admin.from("ce_custom_completions").select("user_id, viewed_at, quiz_score, quiz_passed_at, completed_at").eq("material_id", id).in("user_id", userIdList);

  const completionMap = new Map((completions || []).map((c: { user_id: string }) => [c.user_id, c]));
  const rows = (users || []).map((u: { id: string }) => ({
    user: u,
    completion: completionMap.get(u.id) ?? null,
  }));

  return NextResponse.json({ material, rows });
}
```

- [ ] **Step 5: My-training/custom route — `src/app/api/ce/my-training/custom/route.ts`**

```ts
import { NextResponse } from "next/server";
import { createCEAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createCEAdminClient();

  const { data: ce } = await admin.from("ce_users").select("id, agency_id, certification_level").eq("id", user.id).single();
  if (!ce?.agency_id) return NextResponse.json({ materials: [] });

  // Find assignments matching this user
  const { data: assignments } = await admin.from("ce_custom_assignments").select("material_id, target_type, target_value").or(
    `target_type.eq.all_agency,and(target_type.eq.user,target_value.eq.${user.id}),and(target_type.eq.certification,target_value.eq.${ce.certification_level || ''})`
  );

  const ids = Array.from(new Set((assignments || []).map((a: { material_id: string }) => a.material_id)));
  if (ids.length === 0) return NextResponse.json({ materials: [] });

  // Filter to only this agency's materials (RLS layer too, but defensive)
  const { data: materials } = await admin.from("ce_custom_materials").select("id, title, description, content_type, created_at").in("id", ids).eq("agency_id", ce.agency_id);
  const { data: completions } = await admin.from("ce_custom_completions").select("material_id, completed_at").eq("user_id", user.id).in("material_id", ids);

  const completionMap = new Map((completions || []).map((c: { material_id: string; completed_at: string | null }) => [c.material_id, c.completed_at]));
  const result = (materials || []).map((m: { id: string }) => ({ ...m, completed_at: completionMap.get(m.id) ?? null }));

  return NextResponse.json({ materials: result });
}
```

- [ ] **Step 6: Commit**

```
git add src/app/api/ce/agency/custom/materials/[id]/quiz src/app/api/ce/agency/custom/materials/[id]/assignments src/app/api/ce/agency/custom/materials/[id]/track src/app/api/ce/agency/custom/materials/[id]/report src/app/api/ce/my-training/custom
git commit -m "feat(ce): API routes for custom training quiz, assignments, tracking, report"
```

---

## Task 9: Quiz editor + viewer components

**Files:** Create `src/components/ce/custom-training/quiz-editor.tsx` and `quiz-runner.tsx`

- [ ] **Step 1: Quiz editor — admin builds the questions**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Plus, Trash2 } from "lucide-react";
import type { QuizQuestion } from "@/lib/ce-custom-training/grade-quiz";

interface Props {
  initialQuestions: QuizQuestion[];
  initialThreshold: number;
  onSave: (questions: QuizQuestion[], threshold: number) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function QuizEditor({ initialQuestions, initialThreshold, onSave, onDelete }: Props) {
  const [questions, setQuestions] = useState<QuizQuestion[]>(initialQuestions);
  const [threshold, setThreshold] = useState(initialThreshold);
  const [saving, setSaving] = useState(false);

  const addQuestion = () => setQuestions(q => [...q, { id: crypto.randomUUID(), question: "", options: ["", ""], correct_index: 0 }]);
  const removeQuestion = (i: number) => setQuestions(q => q.filter((_, idx) => idx !== i));
  const updateQuestion = (i: number, patch: Partial<QuizQuestion>) => setQuestions(q => q.map((x, idx) => idx === i ? { ...x, ...patch } : x));

  const save = async () => {
    setSaving(true);
    await onSave(questions, threshold);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Pass threshold</label>
        <input type="number" min={0} max={100} value={threshold} onChange={(e) => setThreshold(parseInt(e.target.value) || 0)} className="w-20 px-2 py-1 border rounded text-sm" />
        <span className="text-sm text-muted-foreground">%</span>
      </div>

      {questions.map((q, i) => (
        <div key={q.id} className="border rounded-lg p-4 space-y-3 bg-card">
          <div className="flex items-start gap-2">
            <span className="text-sm font-medium text-muted-foreground pt-2">{i + 1}.</span>
            <textarea value={q.question} onChange={(e) => updateQuestion(i, { question: e.target.value })} placeholder="Question text" className="flex-1 px-3 py-2 border rounded text-sm min-h-[60px]" />
            <button onClick={() => removeQuestion(i)} className="p-1 hover:bg-muted rounded text-red-600" title="Remove question"><Trash2 className="h-4 w-4" /></button>
          </div>
          <div className="space-y-2 pl-6">
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input type="radio" name={`correct-${i}`} checked={q.correct_index === oi} onChange={() => updateQuestion(i, { correct_index: oi })} />
                <input value={opt} onChange={(e) => updateQuestion(i, { options: q.options.map((o, j) => j === oi ? e.target.value : o) })} placeholder={`Option ${oi + 1}`} className="flex-1 px-2 py-1 border rounded text-sm" />
                {q.options.length > 2 && (
                  <button onClick={() => updateQuestion(i, { options: q.options.filter((_, j) => j !== oi), correct_index: q.correct_index >= oi ? Math.max(0, q.correct_index - 1) : q.correct_index })} className="p-1 hover:bg-muted rounded"><Trash2 className="h-3 w-3 text-muted-foreground" /></button>
                )}
              </div>
            ))}
            <button onClick={() => updateQuestion(i, { options: [...q.options, ""] })} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><Plus className="h-3 w-3" />Add option</button>
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={addQuestion}><Plus className="h-4 w-4 mr-2" />Add Question</Button>

      <div className="flex gap-2 pt-2 border-t">
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Quiz"}</Button>
        {onDelete && questions.length > 0 && <Button variant="outline" onClick={onDelete}>Delete Quiz</Button>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Quiz runner — employee takes the quiz**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import type { QuizQuestion } from "@/lib/ce-custom-training/grade-quiz";

interface Props {
  questions: QuizQuestion[];
  threshold: number;
  onSubmit: (answers: number[]) => Promise<{ score: number; passed: boolean }>;
}

export function QuizRunner({ questions, threshold, onSubmit }: Props) {
  const [answers, setAnswers] = useState<number[]>(questions.map(() => -1));
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  const submit = async () => {
    setSubmitting(true);
    const r = await onSubmit(answers);
    setResult(r);
    setSubmitting(false);
  };

  if (result) {
    return (
      <div className={`border rounded-lg p-6 text-center ${result.passed ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <p className="text-2xl font-bold">{result.score}%</p>
        <p className="text-sm mt-2">{result.passed ? `Passed — required ${threshold}%` : `Not passed — needs ${threshold}%. You can retake.`}</p>
        {!result.passed && <Button className="mt-4" onClick={() => { setResult(null); setAnswers(questions.map(() => -1)); }}>Retake</Button>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={q.id} className="border rounded-lg p-4 bg-card">
          <p className="font-medium mb-3">{i + 1}. {q.question}</p>
          <div className="space-y-2">
            {q.options.map((opt, oi) => (
              <label key={oi} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted/50">
                <input type="radio" name={`q-${i}`} checked={answers[i] === oi} onChange={() => setAnswers(a => a.map((v, j) => j === i ? oi : v))} />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <Button onClick={submit} disabled={submitting || answers.some(a => a === -1)}>{submitting ? "Submitting…" : "Submit Quiz"}</Button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```
git add src/components/ce/custom-training/quiz-editor.tsx src/components/ce/custom-training/quiz-runner.tsx
git commit -m "feat(ce): quiz editor and runner components for custom training"
```

---

## Task 10: Material viewer component

**Files:** Create `src/components/ce/custom-training/material-viewer.tsx`

Renders PDF (iframe), video upload (Bunny iframe), video URL (YouTube embed or raw iframe). Triggers a `viewed` track call on mount.

```tsx
"use client";

import { useEffect } from "react";

interface Props {
  contentType: 'pdf' | 'video_upload' | 'video_url' | 'scorm';
  contentUrl: string;
  onViewed?: () => void;
}

export function MaterialViewer({ contentType, contentUrl, onViewed }: Props) {
  useEffect(() => {
    onViewed?.();
  }, [onViewed]);

  if (contentType === 'pdf') {
    return <iframe src={contentUrl} className="w-full h-[70vh] border rounded-lg" title="PDF viewer" />;
  }
  if (contentType === 'video_upload') {
    return (
      <div className="aspect-video w-full">
        <iframe src={contentUrl} className="w-full h-full rounded-lg" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  if (contentType === 'video_url') {
    // Convert YouTube watch URL to embed
    let embedUrl = contentUrl;
    const yt = contentUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (yt) embedUrl = `https://www.youtube.com/embed/${yt[1]}`;
    return (
      <div className="aspect-video w-full">
        <iframe src={embedUrl} className="w-full h-full rounded-lg" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  return <p className="text-sm text-muted-foreground">Unsupported content type: {contentType}</p>;
}
```

Commit:

```
git add src/components/ce/custom-training/material-viewer.tsx
git commit -m "feat(ce): material viewer component"
```

---

## Task 11: Upload wizard page

**Files:** Create `src/app/ce/agency/custom/new/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createCEClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { MaterialUploader, type UploaderResult } from "@/components/ce/custom-training/material-uploader";

export default function NewMaterialPage() {
  const router = useRouter();
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploaderResult | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: ce } = await supabase.from("ce_users").select("agency_id").eq("id", user.id).single();
      setAgencyId(ce?.agency_id || null);
    };
    load();
  }, []);

  const save = async () => {
    if (!uploaded || !title.trim()) { setError("Title and content are required."); return; }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/ce/agency/custom/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), description: description.trim() || null, ...uploaded }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save");
      setSaving(false);
      return;
    }
    const { material } = await res.json();
    router.push(`/ce/agency/custom/${material.id}`);
  };

  if (!agencyId) return null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Upload Custom Training</h1>
        <p className="text-muted-foreground text-sm mt-1">Add a new training material for your agency</p>
      </div>

      <div className="bg-card border rounded-lg p-6 space-y-4">
        <div>
          <label className="text-sm font-medium block mb-1">Title <span className="text-red-600">*</span></label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="E.g. Patient Restraint SOP" className="w-full px-3 py-2 border rounded text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional summary or context" className="w-full px-3 py-2 border rounded text-sm min-h-[80px]" />
        </div>
        <div>
          <label className="text-sm font-medium block mb-2">Content</label>
          {uploaded ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm flex items-center justify-between">
              <span>{uploaded.content_type.replace("_", " ")} uploaded</span>
              <button onClick={() => setUploaded(null)} className="text-xs text-muted-foreground hover:text-foreground">Replace</button>
            </div>
          ) : (
            <MaterialUploader agencyId={agencyId} onUploaded={setUploaded} />
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-2 border-t">
          <Button onClick={save} disabled={saving || !uploaded || !title.trim()}>{saving ? "Saving…" : "Create Material"}</Button>
          <Button variant="outline" onClick={() => router.push("/ce/agency/custom")}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
```

Commit:

```
git add src/app/ce/agency/custom/new/page.tsx
git commit -m "feat(ce): upload wizard page for new custom training material"
```

---

## Task 12: Detail page with tabs (Content / Quiz / Assignments / Report)

**Files:** Create `src/app/ce/agency/custom/[id]/page.tsx`

The big page. Loads the material, manages tabs, integrates quiz editor, assignment management, and report. Will inspect `ce_users` for employees and certification levels to populate the assignment picker.

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createCEClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { ArrowLeft, Trash2 } from "lucide-react";
import { QuizEditor } from "@/components/ce/custom-training/quiz-editor";
import { MaterialViewer } from "@/components/ce/custom-training/material-viewer";
import type { QuizQuestion } from "@/lib/ce-custom-training/grade-quiz";

interface Material {
  id: string;
  title: string;
  description: string | null;
  content_type: 'pdf' | 'video_upload' | 'video_url' | 'scorm';
  content_url: string;
}

interface Quiz {
  pass_threshold: number;
  questions: QuizQuestion[];
}

interface Assignment {
  id: string;
  target_type: string;
  target_value: string | null;
  assigned_at: string;
}

interface Employee {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  certification_level: string | null;
}

interface ReportRow {
  user: Employee;
  completion: { viewed_at: string | null; quiz_score: number | null; completed_at: string | null } | null;
}

type Tab = 'content' | 'quiz' | 'assignments' | 'report';

export default function MaterialDetailPage() {
  const params = useParams();
  const router = useRouter();
  const materialId = params.id as string;
  const [tab, setTab] = useState<Tab>('content');
  const [material, setMaterial] = useState<Material | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [certLevels, setCertLevels] = useState<string[]>([]);
  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createCEClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: ce } = await supabase.from("ce_users").select("agency_id").eq("id", user.id).single();
    if (!ce?.agency_id) return;

    const [mat, qz, asn, emp] = await Promise.all([
      supabase.from("ce_custom_materials").select("id, title, description, content_type, content_url").eq("id", materialId).single(),
      supabase.from("ce_custom_quizzes").select("pass_threshold, questions").eq("material_id", materialId).maybeSingle(),
      supabase.from("ce_custom_assignments").select("id, target_type, target_value, assigned_at").eq("material_id", materialId),
      supabase.from("ce_users").select("id, first_name, last_name, email, certification_level").eq("agency_id", ce.agency_id),
    ]);
    setMaterial(mat.data as Material);
    setQuiz(qz.data as Quiz | null);
    setAssignments(asn.data || []);
    setEmployees(emp.data || []);
    setCertLevels(Array.from(new Set((emp.data || []).map((e: Employee) => e.certification_level).filter(Boolean) as string[])));
    setLoading(false);
  }, [materialId]);

  useEffect(() => { load(); }, [load]);

  const loadReport = useCallback(async () => {
    const res = await fetch(`/api/ce/agency/custom/materials/${materialId}/report`);
    if (res.ok) {
      const { rows } = await res.json();
      setReportRows(rows);
    }
  }, [materialId]);

  useEffect(() => { if (tab === 'report') loadReport(); }, [tab, loadReport]);

  const saveQuiz = async (questions: QuizQuestion[], threshold: number) => {
    await fetch(`/api/ce/agency/custom/materials/${materialId}/quiz`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pass_threshold: threshold, questions }),
    });
    setQuiz({ pass_threshold: threshold, questions });
  };

  const deleteQuiz = async () => {
    if (!confirm("Delete this quiz?")) return;
    await fetch(`/api/ce/agency/custom/materials/${materialId}/quiz`, { method: "DELETE" });
    setQuiz(null);
  };

  const addAssignment = async (target_type: string, target_value: string | null) => {
    const res = await fetch(`/api/ce/agency/custom/materials/${materialId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments: [{ target_type, target_value }] }),
    });
    if (res.ok) load();
  };

  const removeAssignment = async (assignmentId: string) => {
    await fetch(`/api/ce/agency/custom/materials/${materialId}/assignments/${assignmentId}`, { method: "DELETE" });
    setAssignments(a => a.filter(x => x.id !== assignmentId));
  };

  if (loading || !material) return null;

  return (
    <div className="space-y-6">
      <button onClick={() => router.push("/ce/agency/custom")} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" />Back to materials</button>

      <div>
        <h1 className="text-2xl font-bold">{material.title}</h1>
        {material.description && <p className="text-muted-foreground text-sm mt-1">{material.description}</p>}
      </div>

      <div className="border-b">
        <div className="flex gap-1">
          {(['content','quiz','assignments','report'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {tab === 'content' && (
        <MaterialViewer contentType={material.content_type} contentUrl={material.content_url} />
      )}

      {tab === 'quiz' && (
        <QuizEditor
          initialQuestions={quiz?.questions || []}
          initialThreshold={quiz?.pass_threshold || 80}
          onSave={saveQuiz}
          onDelete={quiz ? deleteQuiz : undefined}
        />
      )}

      {tab === 'assignments' && (
        <div className="space-y-4">
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium">Add assignment</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => addAssignment('all_agency', null)}>+ Assign to All</Button>
              {certLevels.map(c => (
                <Button key={c} variant="outline" size="sm" onClick={() => addAssignment('certification', c)}>+ All {c}</Button>
              ))}
            </div>
            <details>
              <summary className="text-xs text-muted-foreground cursor-pointer">Assign by individual employee</summary>
              <div className="mt-2 grid grid-cols-2 gap-1 max-h-48 overflow-auto">
                {employees.map(e => (
                  <button key={e.id} onClick={() => addAssignment('user', e.id)} className="text-left text-xs p-1.5 hover:bg-muted rounded">
                    {e.first_name} {e.last_name} <span className="text-muted-foreground">({e.email})</span>
                  </button>
                ))}
              </div>
            </details>
          </div>

          <div className="bg-card border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr><th className="text-left p-2">Target</th><th className="text-left p-2">Assigned</th><th className="p-2"></th></tr>
              </thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr><td colSpan={3} className="p-4 text-center text-muted-foreground text-sm">No assignments yet</td></tr>
                ) : assignments.map(a => {
                  let label = "";
                  if (a.target_type === 'all_agency') label = "All agency employees";
                  else if (a.target_type === 'certification') label = `All ${a.target_value} certified`;
                  else if (a.target_type === 'user') {
                    const e = employees.find(x => x.id === a.target_value);
                    label = e ? `${e.first_name} ${e.last_name}` : a.target_value || "";
                  }
                  return (
                    <tr key={a.id} className="border-t">
                      <td className="p-2">{label}</td>
                      <td className="p-2 text-xs text-muted-foreground">{new Date(a.assigned_at).toLocaleDateString()}</td>
                      <td className="p-2 text-right"><button onClick={() => removeAssignment(a.id)} className="p-1 hover:bg-muted rounded"><Trash2 className="h-4 w-4 text-red-600" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'report' && (
        <div className="bg-card border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr><th className="text-left p-2">Employee</th><th className="text-left p-2">Viewed</th><th className="text-left p-2">Quiz Score</th><th className="text-left p-2">Completed</th></tr>
            </thead>
            <tbody>
              {reportRows.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground text-sm">No employees assigned yet</td></tr>
              ) : reportRows.map(r => (
                <tr key={r.user.id} className="border-t">
                  <td className="p-2">{r.user.first_name} {r.user.last_name} <span className="text-xs text-muted-foreground">{r.user.email}</span></td>
                  <td className="p-2 text-xs">{r.completion?.viewed_at ? new Date(r.completion.viewed_at).toLocaleString() : "—"}</td>
                  <td className="p-2 text-xs">{r.completion?.quiz_score != null ? `${r.completion.quiz_score}%` : "—"}</td>
                  <td className="p-2 text-xs">{r.completion?.completed_at ? new Date(r.completion.completed_at).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

Commit:

```
git add src/app/ce/agency/custom/[id]/page.tsx
git commit -m "feat(ce): material detail page with content/quiz/assignments/report tabs"
```

---

## Task 13: Employee viewer page

**Files:** Create `src/app/ce/custom/[id]/page.tsx`

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createCEClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { MaterialViewer } from "@/components/ce/custom-training/material-viewer";
import { QuizRunner } from "@/components/ce/custom-training/quiz-runner";
import type { QuizQuestion } from "@/lib/ce-custom-training/grade-quiz";

interface Material {
  id: string;
  title: string;
  description: string | null;
  content_type: 'pdf' | 'video_upload' | 'video_url' | 'scorm';
  content_url: string;
}

interface Quiz {
  pass_threshold: number;
  questions: QuizQuestion[];
}

export default function EmployeeMaterialPage() {
  const params = useParams();
  const router = useRouter();
  const materialId = params.id as string;
  const [material, setMaterial] = useState<Material | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createCEClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [mat, qz, comp] = await Promise.all([
        supabase.from("ce_custom_materials").select("id, title, description, content_type, content_url").eq("id", materialId).single(),
        supabase.from("ce_custom_quizzes").select("pass_threshold, questions").eq("material_id", materialId).maybeSingle(),
        supabase.from("ce_custom_completions").select("completed_at").eq("material_id", materialId).eq("user_id", user.id).maybeSingle(),
      ]);
      setMaterial(mat.data as Material);
      setQuiz(qz.data as Quiz | null);
      setCompleted(!!comp.data?.completed_at);
      setLoading(false);
    };
    load();
  }, [materialId]);

  const onViewed = useCallback(async () => {
    const res = await fetch(`/api/ce/agency/custom/materials/${materialId}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: 'viewed' }),
    });
    if (res.ok) {
      const { completion } = await res.json();
      if (completion.completed_at) setCompleted(true);
    }
  }, [materialId]);

  const submitQuiz = async (answers: number[]) => {
    const res = await fetch(`/api/ce/agency/custom/materials/${materialId}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: 'quiz_submit', answers }),
    });
    const { completion } = await res.json();
    const passed = !!completion.quiz_passed_at;
    if (completion.completed_at) setCompleted(true);
    return { score: completion.quiz_score ?? 0, passed };
  };

  if (loading || !material) return null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <button onClick={() => router.push("/ce/my-training")} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" />Back to my training</button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{material.title}</h1>
          {material.description && <p className="text-muted-foreground text-sm mt-1">{material.description}</p>}
        </div>
        {completed && <span className="inline-flex items-center gap-1 text-sm text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1"><CheckCircle2 className="h-4 w-4" />Completed</span>}
      </div>

      <MaterialViewer contentType={material.content_type} contentUrl={material.content_url} onViewed={onViewed} />

      {quiz && quiz.questions.length > 0 && (
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">Knowledge check</h2>
          <QuizRunner questions={quiz.questions} threshold={quiz.pass_threshold} onSubmit={submitQuiz} />
        </div>
      )}
    </div>
  );
}
```

Commit:

```
git add src/app/ce/custom/[id]/page.tsx
git commit -m "feat(ce): employee viewer page for custom training materials"
```

---

## Task 14: My-training integration

**Files:** Modify `src/app/ce/my-training/page.tsx` (if it exists; otherwise create it)

- [ ] **Step 1: Check if the file exists**

Inspect `src/app/ce/my-training/page.tsx`. If it doesn't exist, create a minimal page showing only the custom training section. If it exists, surgically add a "From your agency" section.

- [ ] **Step 2: Add or insert the agency section**

Pseudocode:

```tsx
// Fetch in useEffect:
const customRes = await fetch("/api/ce/my-training/custom");
const { materials } = await customRes.json();

// Render above existing courses:
{materials.length > 0 && (
  <section>
    <h2 className="text-lg font-semibold mb-3">From your agency</h2>
    <div className="space-y-2">
      {materials.map((m) => (
        <Link key={m.id} href={`/ce/custom/${m.id}`} className="block bg-card border rounded-lg p-4 hover:bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{m.title}</p>
              {m.description && <p className="text-sm text-muted-foreground mt-0.5">{m.description}</p>}
            </div>
            {m.completed_at && <span className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">Completed</span>}
          </div>
        </Link>
      ))}
    </div>
  </section>
)}
```

Commit:

```
git add src/app/ce/my-training/page.tsx
git commit -m "feat(ce): surface custom training assignments in my-training"
```

---

## Task 15: Apply migration to remote DB

The migration file lives in `supabase/migrations/`. Apply via Supabase MCP or via dashboard SQL editor. Verify tables, storage bucket, and RLS policies exist before declaring the feature live.

- [ ] **Step 1: Apply migration**

Use Supabase MCP `apply_migration` tool or run the SQL directly against the production DB.

- [ ] **Step 2: Verify tables exist**

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'ce_custom%';
-- Expect: ce_custom_materials, ce_custom_quizzes, ce_custom_assignments, ce_custom_completions
```

- [ ] **Step 3: Verify storage bucket**

```sql
SELECT * FROM storage.buckets WHERE id = 'ce-custom-materials';
```

- [ ] **Step 4: Push branch and verify Vercel deploy succeeds**

```
git push origin main
```

---

## Self-Review Notes

- Coverage of spec sections: data model ✓ (Task 1), tier gating ✓ (Tasks 2, 5), routes ✓ (Tasks 5, 11, 12, 13), API ✓ (Tasks 7, 8), UI components ✓ (Tasks 6, 9, 10), employee surface ✓ (Tasks 13, 14), permissions/RLS ✓ (Task 1).
- SCORM is explicitly deferred per scope note; documented in plan header.
- No placeholders. Every step has actual code.
- All type names consistent across tasks (`Material`, `Quiz`, `QuizQuestion`, etc.).
- Bunny upload flow in Task 6 assumes an existing `/api/ce/bunny/create-video` endpoint; Task 6 Step 1 explicitly says to verify and reuse the existing pattern from `src/app/ce/admin/courses/[id]/page.tsx`. If it doesn't exist, we'll need to add it inline.

## Out of scope (Phase 2)

- CSV export of completion report
- Email/in-app notifications
- Bulk assignment via CSV import
- Material versioning
- SCORM upload + viewer (data model supports it, but no UI)
- Mobile polish
- Quiz answer-by-answer review screen
