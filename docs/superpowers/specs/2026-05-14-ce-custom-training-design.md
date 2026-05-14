# CE Agency Custom Training — Design Spec

**Date:** 2026-05-14
**Status:** Approved for implementation
**Surface:** `/ce/agency/custom/*` (admin), integrated into `/ce/my-training` (employees)

## Problem

The CE agency portal advertises a "Custom Training" feature on `/ce/agency/custom` so paid agencies can upload their own SOPs, protocols, and training materials. Today the page is a stub — the upload button is hardcoded `disabled`, no schema or storage exists, and the tier check uses a non-existent tier name (`"pro"`). Agency admins on the highest tier still cannot upload anything.

## Goals

- Agency admins can upload PDFs, MP4 videos, YouTube/external URLs, and SCORM packages as training materials.
- Materials are scoped to a single agency (other agencies and the public never see them).
- Admins can attach optional quizzes (multiple choice) to any material.
- Admins can assign each material to specific employees, employees with a given certification level, or all employees in the agency.
- Employees see assigned materials in their existing `/ce/my-training` view, can complete them, and have their completions tracked.
- Admins can see a per-material completion report.
- Tier gating works correctly — only `enterprise`, `enterprise_plus`, and `custom` tiers unlock the feature.

## Non-Goals (Phase 2)

- CSV export of completion reports
- Email or in-app notifications on assignment / due date
- Bulk assignment via CSV import
- Material versioning (v1 → v2 with retained history on the same row)
- Branded completion certificates for custom training
- Mobile-optimized viewer (desktop-first; mobile viable but not polished)
- Editing a quiz invalidating prior completions (we keep historical scores intact)

## Architecture

### Data model — four new tables

**`ce_custom_materials`** — the core entity, one row per uploaded material.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `agency_id` | uuid FK → ce_agencies | scoping; `ON DELETE CASCADE` |
| `title` | text NOT NULL | |
| `description` | text | nullable |
| `content_type` | text NOT NULL | enum-via-check: `'pdf' \| 'video_upload' \| 'video_url' \| 'scorm'` |
| `content_url` | text NOT NULL | Supabase Storage signed URL, Bunny iframe URL, external URL, or SCORM launch URL |
| `content_metadata` | jsonb | shape varies by `content_type`: `{file_size, mime_type, page_count}` for PDF; `{bunny_video_id, duration_seconds}` for video_upload; `{provider, embed_url}` for video_url; `{manifest_path, launch_url}` for SCORM |
| `created_by` | uuid FK → ce_users | |
| `created_at` | timestamptz DEFAULT now() | |
| `updated_at` | timestamptz DEFAULT now() | |

**`ce_custom_quizzes`** — at most one quiz per material.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `material_id` | uuid FK → ce_custom_materials UNIQUE | one quiz per material; `ON DELETE CASCADE` |
| `pass_threshold` | int DEFAULT 80 | percentage 0–100 |
| `questions` | jsonb NOT NULL | array of `{id, question, options: [string], correct_index: int}`; matches existing CE course quiz JSONB pattern |

**`ce_custom_assignments`** — who has been assigned what.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `material_id` | uuid FK → ce_custom_materials | `ON DELETE CASCADE` |
| `target_type` | text NOT NULL | check: `'user' \| 'certification' \| 'all_agency'` |
| `target_value` | text | user_id (uuid as text) for `user`; cert level string for `certification`; NULL for `all_agency` |
| `assigned_by` | uuid FK → ce_users | |
| `assigned_at` | timestamptz DEFAULT now() | |
| `due_at` | timestamptz | nullable; informational only in MVP (no enforcement, no notifications) |

Index: `(material_id, target_type, target_value)` for assignment lookup.

**`ce_custom_completions`** — completion tracking.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `material_id` | uuid FK → ce_custom_materials | `ON DELETE CASCADE` |
| `user_id` | uuid FK → ce_users | `ON DELETE CASCADE` |
| `viewed_at` | timestamptz | nullable |
| `quiz_score` | int | nullable, percentage 0–100 |
| `quiz_passed_at` | timestamptz | nullable |
| `completed_at` | timestamptz | nullable; denormalized — set when `viewed_at IS NOT NULL` AND (no quiz OR `quiz_passed_at IS NOT NULL`) |

Unique constraint: `(material_id, user_id)`.

### Storage

- New Supabase Storage bucket: **`ce-custom-materials`**, private (no public access).
- Path convention: `{agency_id}/{material_id}/{filename}` for PDFs and SCORM zip extracts.
- RLS on the bucket via storage policies — read allowed if the user belongs to the agency in the path prefix; write/delete only if `agency_admin` of that agency.
- Videos do NOT go into this bucket — they upload to **Bunny Stream** (mirrors existing CE admin courses pattern). The stored `content_url` is a Bunny iframe URL.
- File size limit: 2 GB per upload (matches existing platform limits and the stub page copy).

### Routes

**Admin routes** (under `/ce/agency/custom/*`, gated to `agency_admin` by the existing `/ce/agency/layout.tsx`):

| Route | Purpose |
|---|---|
| `GET /ce/agency/custom` | List page — table of materials with assignments count, completion %, last updated; "Upload" button. |
| `GET /ce/agency/custom/new` | Upload wizard — pick type, upload/paste, enter title/description. |
| `GET /ce/agency/custom/[id]` | Detail page with tabs: *Content / Quiz / Assignments / Report*. |

**Employee surface:**

- `/ce/my-training` gets a new section "From your agency" listing materials assigned to the current user (via direct assignment, certification match, or all-agency). Above the existing CAPCE courses section.
- `GET /ce/custom/[id]` — viewer + quiz interface for a single material. Linked from `/ce/my-training`.

**API routes:**

| Route | Purpose |
|---|---|
| `POST /api/ce/agency/custom/materials` | Create material (admin only) |
| `PATCH /api/ce/agency/custom/materials/[id]` | Update material metadata |
| `DELETE /api/ce/agency/custom/materials/[id]` | Delete material (cascades to quiz, assignments, completions) |
| `PUT /api/ce/agency/custom/materials/[id]/quiz` | Upsert quiz (admin only) |
| `DELETE /api/ce/agency/custom/materials/[id]/quiz` | Remove quiz |
| `POST /api/ce/agency/custom/materials/[id]/assignments` | Add assignment(s) |
| `DELETE /api/ce/agency/custom/materials/[id]/assignments/[assignmentId]` | Remove assignment |
| `POST /api/ce/agency/custom/materials/[id]/track` | Employee completion tracking — accepts `{event: 'viewed'}` or `{event: 'quiz_submit', answers: [int]}`. Server grades and updates completion row. |
| `GET /api/ce/agency/custom/materials/[id]/report` | Per-material completion report (admin only) |
| `GET /api/ce/my-training/custom` | List of materials assigned to the current user |

All API routes resolve assignment scope server-side from `auth.uid()`; client never claims an `agency_id` directly.

### Permissions / RLS

Helper functions already exist in the schema (`get_ce_user_role()`, `get_ce_user_agency_id()`). Policies follow the same pattern as existing CE tables.

| Table | Role | Actions allowed |
|---|---|---|
| `ce_custom_materials` | platform `admin` | full |
| | `agency_admin` of own agency | full on `agency_id = get_ce_user_agency_id()` |
| | `user` of own agency | SELECT only on rows where an `ce_custom_assignments` row matches them (direct, by cert, or all-agency) |
| `ce_custom_quizzes` | inherits via parent material `agency_id` | same as parent |
| `ce_custom_assignments` | platform `admin` | full |
| | `agency_admin` of own agency | full where parent material `agency_id` matches |
| | `user` | SELECT own rows only |
| `ce_custom_completions` | platform `admin` | full |
| | `agency_admin` of own agency | SELECT all rows for own agency's materials |
| | `user` | SELECT/INSERT/UPDATE own row only |

Storage bucket `ce-custom-materials`:
- SELECT (read): user's `agency_id` matches first path segment
- INSERT/UPDATE/DELETE: above + role is `agency_admin`

### Tier gating

Replace `agency.subscription_tier === "pro" || agency.subscription_tier === "enterprise"` with a single helper.

```ts
// src/lib/ce-tiers.ts
export const CUSTOM_TRAINING_TIERS = ['enterprise', 'enterprise_plus', 'custom'] as const;
export function canUseCustomTraining(tier: string | null) {
  return CUSTOM_TRAINING_TIERS.includes(tier as never);
}
```

Used everywhere the feature is gated — page, API routes, sidebar nav (optional dimming).

### Upload flow (the most complex case: video)

1. Admin opens `/ce/agency/custom/new`, selects "Video", picks an MP4.
2. Client detects video MIME → invokes shared Bunny Stream upload helper (extracted from the existing CE admin courses page; agency admin needs no Bunny account — we use the platform Bunny library and credentials).
3. Bunny returns video ID + iframe URL.
4. Client `POST /api/ce/agency/custom/materials` with `content_type='video_upload'`, `content_url=<bunny iframe>`, `content_metadata.bunny_video_id=<id>`.
5. Server inserts row, returns material id.
6. UI redirects to `/ce/agency/custom/[id]` where admin can attach a quiz / set assignments.

PDF flow: direct upload to `ce-custom-materials` bucket at path `{agency_id}/{material_id}/{filename}`, signed URL stashed in `content_url`. SCORM follows existing `use-scorm.ts` hook pattern (zip upload → extract → manifest discovery → launch URL).

### Completion logic (server-side, single source of truth)

`POST /api/ce/agency/custom/materials/[id]/track` is the only place completion state is written.

- `event: 'viewed'` → upsert completion row; set `viewed_at` if NULL.
- `event: 'quiz_submit', answers: [int]` → load `ce_custom_quizzes.questions`, grade in-memory, store `quiz_score`. If `quiz_score >= pass_threshold`, set `quiz_passed_at`.
- After every event, derive `completed_at`: set if `viewed_at IS NOT NULL` AND (quiz row missing OR `quiz_passed_at IS NOT NULL`).

Client UI never decides "you're done" — it always re-reads the row after a track event.

### Edge cases

- **Material deleted with active assignments:** `ON DELETE CASCADE` removes assignments + completions. Material disappears from employee dashboards.
- **Quiz edited after employees passed:** existing completions retain their historical scores; new attempts use new questions. (Phase 2 may add invalidation.)
- **Tier downgrade after materials uploaded:** rows are NOT deleted. Admin sees read-only state with a banner explaining the downgrade. Employees can still complete already-assigned materials. Re-upgrade restores write access.
- **Same employee, multiple matching assignments** (e.g., direct assignment + cert match + all-agency): displayed once. Completion row is keyed by `(material_id, user_id)`.
- **Employee deactivated:** `ce_users` deactivation flow already exists and removes auth — completions and assignments stay for reporting.

## Testing strategy

- Unit tests for the completion derivation logic (truth table over `viewed_at × quiz_passed_at × quiz_exists`).
- Unit tests for the assignment resolution query (does user X see material Y given assignment combinations Z?).
- Unit tests for the tier gating helper.
- Integration test for the upload flow happy path (PDF). Video and SCORM tested manually.
- Manual smoke test: end-to-end as agency_admin uploading + employee viewing + admin reporting.

## Migration ordering

One migration adds all four tables, the storage bucket, and RLS policies. Idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE POLICY IF NOT EXISTS` patterns where Supabase supports it).

## Open follow-ups (not blocking)

- Once implemented, the `subscription_tier === "pro"` bug elsewhere in the codebase should be audited — grep results show this is the only occurrence, but worth re-checking after this lands.
- The agencies admin page still has no edit UI (called out in a prior conversation). Not in scope here, but the same `canUseCustomTraining` helper would benefit from being able to upgrade tiers in-app.
