# Agency Competency Tracking — Full Feature Completion

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete all missing agency features — competency assignment workflow, employee/cycle/skill detail pages, MD dashboard, batch operations, reporting, and email notifications — to make the agency portal production-ready.

**Architecture:** Next.js App Router pages with React Query hooks hitting API routes that use the Supabase admin client (service-role) for all DB writes. UI uses the existing `@/components/ui` library (Card, Button, Badge, Modal, Table, etc.) with Tailwind CSS. All agency tables exist with proper RLS and indexes.

**Tech Stack:** Next.js 14, React Query, Supabase (PostgreSQL), Tailwind CSS, lucide-react icons, existing `sendEmail()` from `src/lib/notifications/email-service.ts` (uses Resend via raw fetch, no npm dependency)

---

## File Structure Overview

### New API Routes
- `src/app/api/agency/employees/[id]/route.ts` — GET/PUT/DELETE single employee
- `src/app/api/agency/employees/[id]/competencies/route.ts` — GET employee competencies, POST mark complete
- `src/app/api/agency/employees/import/route.ts` — POST bulk CSV import
- `src/app/api/agency/cycles/[id]/route.ts` — GET/PUT single cycle
- `src/app/api/agency/cycles/[id]/generate/route.ts` — POST generate competency records
- `src/app/api/agency/cycles/[id]/lock/route.ts` — POST lock/unlock cycle
- `src/app/api/agency/skills/route.ts` — modify existing: add POST for custom skills
- `src/app/api/agency/skills/[id]/route.ts` — PUT/DELETE single skill
- `src/app/api/agency/verifications/batch/route.ts` — POST batch approve
- `src/app/api/agency/reports/route.ts` — GET compliance reports (CSV/JSON)
- `src/app/api/agency/notifications/route.ts` — POST send notification emails

### New Pages
- `src/app/(agency)/agency/employees/[id]/page.tsx` — Employee detail + competency grid
- `src/app/(agency)/agency/employees/import/page.tsx` — Bulk CSV import page
- `src/app/(agency)/agency/cycles/[id]/page.tsx` — Cycle detail + employee progress
- `src/app/(agency)/agency/skills/new/page.tsx` — Create custom skill form
- `src/app/(agency)/agency/skills/[id]/page.tsx` — Skill detail + edit
- `src/app/(agency)/agency/medical-directors/dashboard/page.tsx` — MD-specific dashboard
- `src/app/(agency)/agency/reports/page.tsx` — Reports + export page

### Modified Files
- `src/app/api/agency/skills/route.ts` — add POST handler
- `src/app/api/agency/cycles/route.ts` — add competency generation on create
- `src/app/(agency)/agency/skills/page.tsx` — wire Add Skill button
- `src/app/(agency)/agency/employees/page.tsx` — add import button
- `src/app/(agency)/agency/medical-directors/pending/page.tsx` — add batch approve
- `src/app/(agency)/agency/layout.tsx` — add Reports nav item
- `src/lib/hooks/use-agency-data.ts` — consolidate and extend

### New Utilities
- `src/lib/api/agency-auth.ts` — shared auth helper for agency API routes (DRY auth + tenant check)
- `src/lib/notifications/agency-templates.ts` — email template generators (uses existing `sendEmail()`)

### New Hooks
- `src/lib/hooks/use-employee-competencies.ts` — competency CRUD for single employee
- `src/lib/hooks/use-batch-verify.ts` — batch verification mutation (separate from cycle-detail hook)
- `src/lib/hooks/use-cycle-detail.ts` — cycle detail + employee progress

---

## Phase 0: Shared Utilities

### Task 0: Agency API Auth Helper

**Files:**
- Create: `src/lib/api/agency-auth.ts`

- [ ] **Step 1: Create shared auth helper**

Every agency API route repeats the same auth pattern: get session user, look up profile + tenant_id + agency_role, check permission. Extract into a reusable helper:

```typescript
// src/lib/api/agency-auth.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AgencyRole = "agency_admin" | "medical_director" | "field_supervisor";

interface AgencyAuthResult {
  userId: string;
  tenantId: string;
  agencyRole: AgencyRole;
  adminClient: ReturnType<typeof createAdminClient>;
}

/**
 * Authenticate an agency API request and return user context.
 * @param requiredRoles — if provided, the user must have one of these roles
 * @returns AgencyAuthResult or a NextResponse error
 */
export async function requireAgencyAuth(
  requiredRoles?: AgencyRole[]
): Promise<AgencyAuthResult | NextResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("users")
    .select("tenant_id, agency_role")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id || !profile.agency_role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (requiredRoles && !requiredRoles.includes(profile.agency_role as AgencyRole)) {
    return NextResponse.json({ error: `Forbidden — requires ${requiredRoles.join(" or ")}` }, { status: 403 });
  }

  return {
    userId: user.id,
    tenantId: profile.tenant_id,
    agencyRole: profile.agency_role as AgencyRole,
    adminClient,
  };
}

/** Type guard to check if auth result is an error response */
export function isAuthError(result: AgencyAuthResult | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api/agency-auth.ts
git commit -m "feat(agency): add shared auth helper for agency API routes"
```

**All subsequent API tasks use this helper** instead of repeating the auth boilerplate. Example usage:
```typescript
import { requireAgencyAuth, isAuthError } from "@/lib/api/agency-auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAgencyAuth(); // any agency role
  if (isAuthError(auth)) return auth;
  const { tenantId, adminClient } = auth;
  // ... use tenantId and adminClient
}
```

---

## Phase 1: Core API Endpoints (Foundation)

All subsequent UI work depends on these endpoints existing.

### Task 1: Single Employee API (GET/PUT/DELETE)

**Files:**
- Create: `src/app/api/agency/employees/[id]/route.ts`

- [ ] **Step 1: Create the GET/PUT/DELETE route**

```typescript
// src/app/api/agency/employees/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();

    // Get user's tenant
    const { data: profile } = await adminClient
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id || !profile.agency_role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: employee, error } = await adminClient
      .from("agency_employees")
      .select("*, supervisor:supervisor_id(id, first_name, last_name)")
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (error || !employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Get competencies with skill info
    const { data: competencies } = await adminClient
      .from("employee_competencies")
      .select("*, skill:skill_id(id, name, category, skill_code, certification_levels)")
      .eq("employee_id", id)
      .order("created_at", { ascending: false });

    return NextResponse.json({ employee, competencies: competencies || [] });
  } catch (error) {
    console.error("GET /api/agency/employees/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id || profile.agency_role !== "agency_admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    const updates = await request.json();

    // Whitelist allowed fields
    const allowed: Record<string, unknown> = {};
    const fields = [
      "first_name", "last_name", "email", "phone", "employee_number",
      "certification_level", "state_certification_number", "national_registry_number",
      "certification_expiration", "hire_date", "department", "position",
      "supervisor_id", "is_active",
    ];
    for (const f of fields) {
      if (updates[f] !== undefined) allowed[f] = updates[f];
    }
    allowed.updated_at = new Date().toISOString();

    const { data: updated, error } = await adminClient
      .from("agency_employees")
      .update(allowed)
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id)
      .select()
      .single();

    if (error) {
      console.error("Update employee error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit log
    await adminClient.from("agency_audit_log").insert({
      tenant_id: profile.tenant_id,
      action: "employee_updated",
      entity_type: "employee",
      entity_id: id,
      performed_by: user.id,
      new_values: allowed,
    });

    return NextResponse.json({ employee: updated });
  } catch (error) {
    console.error("PUT /api/agency/employees/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id || profile.agency_role !== "agency_admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    // Soft delete (deactivate)
    const { error } = await adminClient
      .from("agency_employees")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await adminClient.from("agency_audit_log").insert({
      tenant_id: profile.tenant_id,
      action: "employee_deactivated",
      entity_type: "employee",
      entity_id: id,
      performed_by: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/agency/employees/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/agency/employees/\[id\]/route.ts
git commit -m "feat(agency): add single employee GET/PUT/DELETE endpoint"
```

---

### Task 2: Employee Competencies API

**Files:**
- Create: `src/app/api/agency/employees/[id]/competencies/route.ts`

- [ ] **Step 1: Create the competencies endpoint**

```typescript
// src/app/api/agency/employees/[id]/competencies/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cycleId = request.nextUrl.searchParams.get("cycle_id");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id || !profile.agency_role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let query = adminClient
      .from("employee_competencies")
      .select(`
        *,
        skill:skill_id(id, name, category, skill_code, certification_levels, is_required),
        cycle:cycle_id(id, name, year, cycle_type)
      `)
      .eq("employee_id", id)
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false });

    if (cycleId) {
      query = query.eq("cycle_id", cycleId);
    }

    const { data: competencies, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ competencies: competencies || [] });
  } catch (error) {
    console.error("GET employee competencies error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Mark a competency as complete (submit for review)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id || profile.agency_role !== "agency_admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    const { competency_id, status, notes } = await request.json();

    if (!competency_id || !status) {
      return NextResponse.json({ error: "Missing competency_id or status" }, { status: 400 });
    }

    const validStatuses = ["not_started", "in_progress", "pending_review", "verified", "failed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (notes !== undefined) updates.notes = notes;
    if (status === "pending_review" || status === "verified") {
      updates.completed_at = new Date().toISOString();
      updates.completed_by = user.id;
    }

    const { data: updated, error } = await adminClient
      .from("employee_competencies")
      .update(updates)
      .eq("id", competency_id)
      .eq("employee_id", id)
      .eq("tenant_id", profile.tenant_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await adminClient.from("agency_audit_log").insert({
      tenant_id: profile.tenant_id,
      action: status === "pending_review" ? "competency_submitted" : "competency_status_changed",
      entity_type: "competency",
      entity_id: competency_id,
      performed_by: user.id,
      new_values: { status, employee_id: id },
    });

    return NextResponse.json({ competency: updated });
  } catch (error) {
    console.error("POST employee competencies error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/api/agency/employees/[id]/competencies/route.ts"
git commit -m "feat(agency): add employee competencies GET/POST endpoint"
```

---

### Task 3: Single Cycle API + Competency Generation

**Files:**
- Create: `src/app/api/agency/cycles/[id]/route.ts`
- Create: `src/app/api/agency/cycles/[id]/generate/route.ts`
- Create: `src/app/api/agency/cycles/[id]/lock/route.ts`

- [ ] **Step 1: Create cycle detail endpoint**

```typescript
// src/app/api/agency/cycles/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id || !profile.agency_role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get cycle
    const { data: cycle, error } = await adminClient
      .from("verification_cycles")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (error || !cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    // Get all employee competencies for this cycle with employee + skill info
    const { data: competencies } = await adminClient
      .from("employee_competencies")
      .select(`
        *,
        employee:employee_id(id, first_name, last_name, certification_level, is_active),
        skill:skill_id(id, name, category, skill_code)
      `)
      .eq("cycle_id", id)
      .eq("tenant_id", profile.tenant_id);

    // Compute per-employee progress
    const employeeMap = new Map<string, {
      employee: any;
      total: number;
      verified: number;
      pending: number;
      failed: number;
    }>();

    for (const c of competencies || []) {
      if (!c.employee) continue;
      const eid = c.employee.id;
      if (!employeeMap.has(eid)) {
        employeeMap.set(eid, { employee: c.employee, total: 0, verified: 0, pending: 0, failed: 0 });
      }
      const entry = employeeMap.get(eid)!;
      entry.total++;
      if (c.status === "verified") entry.verified++;
      else if (c.status === "pending_review") entry.pending++;
      else if (c.status === "failed") entry.failed++;
    }

    const employees = Array.from(employeeMap.values()).map((e) => ({
      ...e.employee,
      total: e.total,
      verified: e.verified,
      pending: e.pending,
      failed: e.failed,
      completion: e.total > 0 ? Math.round((e.verified / e.total) * 100) : 0,
    }));

    // Summary stats
    const totalCompetencies = competencies?.length || 0;
    const verifiedCount = competencies?.filter((c) => c.status === "verified").length || 0;
    const pendingCount = competencies?.filter((c) => c.status === "pending_review").length || 0;

    return NextResponse.json({
      cycle,
      employees,
      stats: {
        totalCompetencies,
        verified: verifiedCount,
        pending: pendingCount,
        completion: totalCompetencies > 0 ? Math.round((verifiedCount / totalCompetencies) * 100) : 0,
        employeeCount: employees.length,
      },
    });
  } catch (error) {
    console.error("GET /api/agency/cycles/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id || profile.agency_role !== "agency_admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    const updates = await request.json();
    const allowed: Record<string, unknown> = {};
    for (const f of ["name", "start_date", "end_date", "is_active"]) {
      if (updates[f] !== undefined) allowed[f] = updates[f];
    }
    allowed.updated_at = new Date().toISOString();

    const { data: updated, error } = await adminClient
      .from("verification_cycles")
      .update(allowed)
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id)
      .eq("is_locked", false)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ cycle: updated });
  } catch (error) {
    console.error("PUT /api/agency/cycles/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create competency generation endpoint (CRITICAL)**

This is the core missing feature — when an admin generates competencies for a cycle, it creates `employee_competencies` rows for every active employee x applicable skill combination.

```typescript
// src/app/api/agency/cycles/[id]/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id || profile.agency_role !== "agency_admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    // Verify cycle exists and isn't locked
    const { data: cycle } = await adminClient
      .from("verification_cycles")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }
    if (cycle.is_locked) {
      return NextResponse.json({ error: "Cycle is locked" }, { status: 400 });
    }

    // Optional: filter by specific employee IDs or skill IDs
    const body = await request.json().catch(() => ({}));
    const employeeIds: string[] | undefined = body.employee_ids;
    const skillIds: string[] | undefined = body.skill_ids;

    // Get active employees
    let empQuery = adminClient
      .from("agency_employees")
      .select("id, certification_level")
      .eq("tenant_id", profile.tenant_id)
      .eq("is_active", true);

    if (employeeIds?.length) {
      empQuery = empQuery.in("id", employeeIds);
    }

    const { data: employees } = await empQuery;

    if (!employees?.length) {
      return NextResponse.json({ error: "No active employees found" }, { status: 400 });
    }

    // Get applicable skills (system defaults for state + tenant custom)
    let skillQuery = adminClient
      .from("skill_library")
      .select("id, certification_levels, is_required")
      .eq("is_active", true)
      .or(`tenant_id.eq.${profile.tenant_id},is_system_default.eq.true`);

    if (skillIds?.length) {
      skillQuery = skillQuery.in("id", skillIds);
    }

    const { data: skills } = await skillQuery;

    if (!skills?.length) {
      return NextResponse.json({ error: "No skills found" }, { status: 400 });
    }

    // Check existing competencies to avoid duplicates
    const { data: existing } = await adminClient
      .from("employee_competencies")
      .select("employee_id, skill_id")
      .eq("cycle_id", id)
      .eq("tenant_id", profile.tenant_id);

    const existingSet = new Set(
      (existing || []).map((e) => `${e.employee_id}:${e.skill_id}`)
    );

    // Generate competency records: employee x applicable skills
    const records: Array<{
      tenant_id: string;
      employee_id: string;
      skill_id: string;
      cycle_id: string;
      status: string;
    }> = [];

    for (const emp of employees) {
      for (const skill of skills) {
        // Check if skill applies to this employee's cert level
        const levels = skill.certification_levels || [];
        if (levels.length > 0 && !levels.includes(emp.certification_level)) {
          continue;
        }

        const key = `${emp.id}:${skill.id}`;
        if (existingSet.has(key)) continue;

        records.push({
          tenant_id: profile.tenant_id,
          employee_id: emp.id,
          skill_id: skill.id,
          cycle_id: id,
          status: "not_started",
        });
      }
    }

    if (records.length === 0) {
      return NextResponse.json({
        success: true,
        generated: 0,
        message: "All competencies already exist for this cycle",
      });
    }

    // Batch insert (Supabase handles up to 1000 per call)
    const batchSize = 500;
    let totalInserted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error: insertError } = await adminClient
        .from("employee_competencies")
        .insert(batch);

      if (insertError) {
        console.error("Batch insert error:", insertError);
        return NextResponse.json({
          error: `Failed at batch ${Math.floor(i / batchSize) + 1}: ${insertError.message}`,
          generated: totalInserted,
        }, { status: 500 });
      }
      totalInserted += batch.length;
    }

    // Audit log
    await adminClient.from("agency_audit_log").insert({
      tenant_id: profile.tenant_id,
      action: "cycle_competencies_generated",
      entity_type: "cycle",
      entity_id: id,
      performed_by: user.id,
      new_values: {
        employees: employees.length,
        skills: skills.length,
        records_created: totalInserted,
      },
    });

    return NextResponse.json({
      success: true,
      generated: totalInserted,
      employees: employees.length,
      skills: skills.length,
    });
  } catch (error) {
    console.error("POST /api/agency/cycles/[id]/generate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create cycle lock/unlock endpoint**

```typescript
// src/app/api/agency/cycles/[id]/lock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id || profile.agency_role !== "agency_admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    const { locked } = await request.json();

    const { data: updated, error } = await adminClient
      .from("verification_cycles")
      .update({ is_locked: !!locked, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await adminClient.from("agency_audit_log").insert({
      tenant_id: profile.tenant_id,
      action: locked ? "cycle_locked" : "cycle_unlocked",
      entity_type: "cycle",
      entity_id: id,
      performed_by: user.id,
    });

    return NextResponse.json({ cycle: updated });
  } catch (error) {
    console.error("POST /api/agency/cycles/[id]/lock error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/agency/cycles/[id]/"
git commit -m "feat(agency): add cycle detail, competency generation, and lock endpoints"
```

---

### Task 4: Custom Skills API (POST) + Single Skill (PUT/DELETE)

**Files:**
- Modify: `src/app/api/agency/skills/route.ts` — add POST
- Create: `src/app/api/agency/skills/[id]/route.ts`

- [ ] **Step 1: Add POST handler to existing skills route**

Read the existing file first, then add the POST handler after the GET:

```typescript
// Add to src/app/api/agency/skills/route.ts — after existing GET handler

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id || profile.agency_role !== "agency_admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, category, skill_code, certification_levels, is_required } = body;

    if (!name || !category) {
      return NextResponse.json({ error: "Name and category are required" }, { status: 400 });
    }

    const { data: skill, error } = await adminClient
      .from("skill_library")
      .insert({
        tenant_id: profile.tenant_id,
        name,
        description: description || "",
        category,
        skill_code: skill_code || "",
        certification_levels: certification_levels || [],
        is_required: is_required ?? true,
        is_system_default: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await adminClient.from("agency_audit_log").insert({
      tenant_id: profile.tenant_id,
      action: "skill_created",
      entity_type: "skill",
      entity_id: skill.id,
      performed_by: user.id,
      new_values: { name, category },
    });

    return NextResponse.json({ skill });
  } catch (error) {
    console.error("POST /api/agency/skills error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

Note: Add `import { createAdminClient } from "@/lib/supabase/admin";` to the imports if not already present.

- [ ] **Step 2: Create single skill PUT/DELETE route**

```typescript
// src/app/api/agency/skills/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id || profile.agency_role !== "agency_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updates = await request.json();
    const allowed: Record<string, unknown> = {};
    for (const f of ["name", "description", "category", "skill_code", "certification_levels", "is_required", "is_active"]) {
      if (updates[f] !== undefined) allowed[f] = updates[f];
    }
    allowed.updated_at = new Date().toISOString();

    // Only allow editing tenant-owned skills (not system defaults)
    const { data: updated, error } = await adminClient
      .from("skill_library")
      .update(allowed)
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ skill: updated });
  } catch (error) {
    console.error("PUT /api/agency/skills/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id || profile.agency_role !== "agency_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete tenant-owned skills only
    const { error } = await adminClient
      .from("skill_library")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", profile.tenant_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/agency/skills/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/agency/skills/
git commit -m "feat(agency): add custom skill creation and skill CRUD endpoints"
```

---

### Task 5: Batch Verification + Reports API

**Files:**
- Create: `src/app/api/agency/verifications/batch/route.ts`
- Create: `src/app/api/agency/reports/route.ts`

- [ ] **Step 1: Create batch verification endpoint**

```typescript
// src/app/api/agency/verifications/batch/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id || profile.agency_role !== "medical_director") {
      return NextResponse.json({ error: "Forbidden — MD only" }, { status: 403 });
    }

    const { competency_ids, verification_method, notes } = await request.json();

    if (!competency_ids?.length) {
      return NextResponse.json({ error: "No competencies selected" }, { status: 400 });
    }

    // Get MD assignment
    const { data: mdAssignment } = await adminClient
      .from("medical_director_assignments")
      .select("id")
      .eq("user_id", user.id)
      .eq("tenant_id", profile.tenant_id)
      .eq("is_active", true)
      .single();

    const now = new Date().toISOString();
    let approved = 0;

    for (const compId of competency_ids) {
      // Update competency status
      const { error: updateError } = await adminClient
        .from("employee_competencies")
        .update({ status: "verified", completed_at: now, completed_by: user.id, updated_at: now })
        .eq("id", compId)
        .eq("tenant_id", profile.tenant_id)
        .eq("status", "pending_review");

      if (!updateError) {
        // Create verification record
        await adminClient.from("competency_verifications").insert({
          tenant_id: profile.tenant_id,
          competency_id: compId,
          verified_by: user.id,
          md_assignment_id: mdAssignment?.id,
          verified_at: now,
          verification_method: verification_method || "documentation_review",
          is_batch_verification: true,
          notes: notes || "Batch approved",
        });
        approved++;
      }
    }

    await adminClient.from("agency_audit_log").insert({
      tenant_id: profile.tenant_id,
      action: "batch_verification_approved",
      entity_type: "verification",
      entity_id: competency_ids[0],
      performed_by: user.id,
      new_values: { count: approved, competency_ids },
    });

    return NextResponse.json({ success: true, approved });
  } catch (error) {
    console.error("POST batch verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create reports endpoint**

```typescript
// src/app/api/agency/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id || profile.agency_role !== "agency_admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    const type = request.nextUrl.searchParams.get("type") || "compliance";
    const cycleId = request.nextUrl.searchParams.get("cycle_id");
    const format = request.nextUrl.searchParams.get("format") || "json";

    if (type === "compliance") {
      // Per-employee compliance summary
      const { data: employees } = await adminClient
        .from("agency_employees")
        .select("id, first_name, last_name, certification_level, certification_expiration, is_active")
        .eq("tenant_id", profile.tenant_id)
        .eq("is_active", true)
        .order("last_name");

      let compQuery = adminClient
        .from("employee_competencies")
        .select("employee_id, status")
        .eq("tenant_id", profile.tenant_id);

      if (cycleId) compQuery = compQuery.eq("cycle_id", cycleId);

      const { data: competencies } = await compQuery;

      // Aggregate per employee
      const empMap = new Map<string, { total: number; verified: number; pending: number; failed: number }>();
      for (const c of competencies || []) {
        if (!empMap.has(c.employee_id)) empMap.set(c.employee_id, { total: 0, verified: 0, pending: 0, failed: 0 });
        const e = empMap.get(c.employee_id)!;
        e.total++;
        if (c.status === "verified") e.verified++;
        else if (c.status === "pending_review") e.pending++;
        else if (c.status === "failed") e.failed++;
      }

      const rows = (employees || []).map((emp) => {
        const stats = empMap.get(emp.id) || { total: 0, verified: 0, pending: 0, failed: 0 };
        return {
          name: `${emp.last_name}, ${emp.first_name}`,
          certification_level: emp.certification_level,
          certification_expiration: emp.certification_expiration,
          total_skills: stats.total,
          verified: stats.verified,
          pending: stats.pending,
          failed: stats.failed,
          completion: stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0,
        };
      });

      if (format === "csv") {
        const header = "Name,Cert Level,Cert Expiration,Total Skills,Verified,Pending,Failed,Completion %";
        const csvRows = rows.map((r) =>
          `"${r.name}",${r.certification_level},${r.certification_expiration || ""},${r.total_skills},${r.verified},${r.pending},${r.failed},${r.completion}%`
        );
        const csv = [header, ...csvRows].join("\n");
        return new NextResponse(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="compliance-report-${new Date().toISOString().split("T")[0]}.csv"`,
          },
        });
      }

      return NextResponse.json({ rows, type: "compliance" });
    }

    if (type === "expiring") {
      const daysAhead = parseInt(request.nextUrl.searchParams.get("days") || "90");
      const cutoff = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const { data: expiring } = await adminClient
        .from("agency_employees")
        .select("id, first_name, last_name, certification_level, certification_expiration, email")
        .eq("tenant_id", profile.tenant_id)
        .eq("is_active", true)
        .lte("certification_expiration", cutoff)
        .order("certification_expiration");

      if (format === "csv") {
        const header = "Name,Cert Level,Expiration Date,Email";
        const csvRows = (expiring || []).map((e) =>
          `"${e.last_name}, ${e.first_name}",${e.certification_level},${e.certification_expiration},${e.email || ""}`
        );
        return new NextResponse([header, ...csvRows].join("\n"), {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="expiring-certs-${new Date().toISOString().split("T")[0]}.csv"`,
          },
        });
      }

      return NextResponse.json({ rows: expiring || [], type: "expiring" });
    }

    return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  } catch (error) {
    console.error("GET /api/agency/reports error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/agency/verifications/batch/ src/app/api/agency/reports/
git commit -m "feat(agency): add batch verification and compliance reports endpoints"
```

---

### Task 6: Employee Bulk Import API

**Files:**
- Create: `src/app/api/agency/employees/import/route.ts`

- [ ] **Step 1: Create bulk import endpoint**

```typescript
// src/app/api/agency/employees/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from("users")
      .select("tenant_id, agency_role")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id || profile.agency_role !== "agency_admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    const { employees } = await request.json();
    if (!employees?.length) {
      return NextResponse.json({ error: "No employees provided" }, { status: 400 });
    }

    const results: Array<{ row: number; name: string; success: boolean; error?: string }> = [];
    const validLevels = ["EMR", "EMT", "AEMT", "Paramedic", "Other"];

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      try {
        if (!emp.first_name || !emp.last_name) {
          results.push({ row: i + 1, name: `${emp.first_name || ""} ${emp.last_name || ""}`.trim(), success: false, error: "Missing name" });
          continue;
        }

        const level = validLevels.includes(emp.certification_level) ? emp.certification_level : "Other";

        const { error: insertError } = await adminClient
          .from("agency_employees")
          .insert({
            tenant_id: profile.tenant_id,
            first_name: emp.first_name.trim(),
            last_name: emp.last_name.trim(),
            email: emp.email?.trim() || null,
            phone: emp.phone?.trim() || null,
            employee_number: emp.employee_number?.trim() || null,
            certification_level: level,
            state_certification_number: emp.state_cert_number?.trim() || null,
            national_registry_number: emp.nremt_number?.trim() || null,
            certification_expiration: emp.cert_expiration || null,
            hire_date: emp.hire_date || null,
            department: emp.department?.trim() || null,
            position: emp.position?.trim() || null,
          });

        if (insertError) {
          results.push({ row: i + 1, name: `${emp.first_name} ${emp.last_name}`, success: false, error: insertError.message });
        } else {
          results.push({ row: i + 1, name: `${emp.first_name} ${emp.last_name}`, success: true });
        }
      } catch (err) {
        results.push({ row: i + 1, name: `${emp.first_name || ""} ${emp.last_name || ""}`, success: false, error: "Unexpected error" });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    await adminClient.from("agency_audit_log").insert({
      tenant_id: profile.tenant_id,
      action: "employees_bulk_imported",
      entity_type: "employee",
      entity_id: null,
      performed_by: user.id,
      new_values: { total: employees.length, imported: successCount },
    });

    return NextResponse.json({ results, imported: successCount, total: employees.length });
  } catch (error) {
    console.error("POST /api/agency/employees/import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/agency/employees/import/
git commit -m "feat(agency): add bulk employee CSV import endpoint"
```

---

## Phase 2: Hooks

### Task 7: Employee Competencies Hook

**Files:**
- Create: `src/lib/hooks/use-employee-competencies.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/lib/hooks/use-employee-competencies.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Competency {
  id: string;
  employee_id: string;
  skill_id: string;
  cycle_id: string;
  status: "not_started" | "in_progress" | "pending_review" | "verified" | "expired" | "failed";
  completed_at: string | null;
  notes: string | null;
  skill: {
    id: string;
    name: string;
    category: string;
    skill_code: string;
    certification_levels: string[];
    is_required: boolean;
  };
  cycle: {
    id: string;
    name: string;
    year: number;
    cycle_type: string;
  };
}

export function useEmployeeCompetencies(employeeId: string | undefined, cycleId?: string) {
  return useQuery({
    queryKey: ["employee-competencies", employeeId, cycleId],
    queryFn: async (): Promise<Competency[]> => {
      const params = new URLSearchParams();
      if (cycleId) params.set("cycle_id", cycleId);
      const res = await fetch(`/api/agency/employees/${employeeId}/competencies?${params}`);
      if (!res.ok) throw new Error("Failed to fetch competencies");
      const data = await res.json();
      return data.competencies;
    },
    enabled: !!employeeId,
  });
}

export function useUpdateCompetencyStatus(employeeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { competency_id: string; status: string; notes?: string }) => {
      const res = await fetch(`/api/agency/employees/${employeeId}/competencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-competencies", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["agency-employees"] });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/hooks/use-employee-competencies.ts
git commit -m "feat(agency): add employee competencies React Query hook"
```

---

### Task 8: Cycle Detail Hook

**Files:**
- Create: `src/lib/hooks/use-cycle-detail.ts`

- [ ] **Step 1: Create the hook**

```typescript
// src/lib/hooks/use-cycle-detail.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface CycleEmployee {
  id: string;
  first_name: string;
  last_name: string;
  certification_level: string;
  is_active: boolean;
  total: number;
  verified: number;
  pending: number;
  failed: number;
  completion: number;
}

interface CycleDetail {
  cycle: {
    id: string;
    name: string;
    cycle_type: string;
    year: number;
    start_date: string;
    end_date: string;
    is_active: boolean;
    is_locked: boolean;
  };
  employees: CycleEmployee[];
  stats: {
    totalCompetencies: number;
    verified: number;
    pending: number;
    completion: number;
    employeeCount: number;
  };
}

export function useCycleDetail(cycleId: string | undefined) {
  return useQuery({
    queryKey: ["cycle-detail", cycleId],
    queryFn: async (): Promise<CycleDetail> => {
      const res = await fetch(`/api/agency/cycles/${cycleId}`);
      if (!res.ok) throw new Error("Failed to fetch cycle");
      return res.json();
    },
    enabled: !!cycleId,
  });
}

export function useGenerateCompetencies(cycleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input?: { employee_ids?: string[]; skill_ids?: string[] }) => {
      const res = await fetch(`/api/agency/cycles/${cycleId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input || {}),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-detail", cycleId] });
      queryClient.invalidateQueries({ queryKey: ["agency-cycles"] });
    },
  });
}

export function useLockCycle(cycleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locked: boolean) => {
      const res = await fetch(`/api/agency/cycles/${cycleId}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-detail", cycleId] });
      queryClient.invalidateQueries({ queryKey: ["agency-cycles"] });
    },
  });
}

// NOTE: useBatchVerify lives in its own file at src/lib/hooks/use-batch-verify.ts
// See Task 8b below.
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/hooks/use-cycle-detail.ts
git commit -m "feat(agency): add cycle detail, generate, and lock hooks"
```

---

### Task 8b: Batch Verify Hook (Separate File)

**Files:**
- Create: `src/lib/hooks/use-batch-verify.ts`

- [ ] **Step 1: Create the batch verify hook**

```typescript
// src/lib/hooks/use-batch-verify.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useBatchVerify() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { competency_ids: string[]; verification_method?: string; notes?: string }) => {
      const res = await fetch("/api/agency/verifications/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to batch verify");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycle-detail"] });
      queryClient.invalidateQueries({ queryKey: ["agency-verifications"] });
      queryClient.invalidateQueries({ queryKey: ["employee-competencies"] });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/hooks/use-batch-verify.ts
git commit -m "feat(agency): add batch verify hook in separate file"
```

---

## Phase 3: Pages

### Task 9: Employee Detail Page

**Files:**
- Create: `src/app/(agency)/agency/employees/[id]/page.tsx`

- [ ] **Step 1: Create the employee detail page**

This page shows the employee profile, edit form, and competency grid grouped by category. Admin can edit the profile and change competency statuses. The page uses a tab layout: Overview | Competencies.

Key features:
- Employee info card (name, cert level, cert expiration, employee number, contact)
- Edit modal for profile fields
- Competency grid with status badges grouped by skill category
- Filter by cycle dropdown
- Ability to submit competencies for review (change status to pending_review)
- Progress bar showing completion

The page should import from: `@/components/ui` (Card, Button, Badge, Modal, Input, Label, Select, Progress, Spinner, Tabs, Alert), `lucide-react` icons, `use-employee-competencies` hook, and fetch employee detail from `/api/agency/employees/[id]`.

Build as a single `"use client"` page component ~400 lines. Use the same layout patterns as the existing employees list page.

- [ ] **Step 2: Commit**

```bash
git add "src/app/(agency)/agency/employees/[id]/page.tsx"
git commit -m "feat(agency): add employee detail page with competency tracking"
```

---

### Task 10: Cycle Detail Page

**Files:**
- Create: `src/app/(agency)/agency/cycles/[id]/page.tsx`

- [ ] **Step 1: Create the cycle detail page**

This page shows cycle info, stats summary, per-employee progress table, and generate/lock controls. Key features:
- Cycle info header (name, type, dates, locked status)
- Stats cards: total competencies, verified, pending, completion %
- "Generate Competencies" button (creates employee_competencies records)
- "Lock Cycle" / "Unlock Cycle" toggle
- Employee progress table: name, cert level, total, verified, pending, failed, completion %
- Each employee row links to `/agency/employees/[id]?cycle=[cycleId]`

Uses `useCycleDetail`, `useGenerateCompetencies`, `useLockCycle` hooks.

- [ ] **Step 2: Commit**

```bash
git add "src/app/(agency)/agency/cycles/[id]/page.tsx"
git commit -m "feat(agency): add cycle detail page with competency generation"
```

---

### Task 11: Create Skill Page + Wire Add Button

**Files:**
- Create: `src/app/(agency)/agency/skills/new/page.tsx`
- Modify: `src/app/(agency)/agency/skills/page.tsx` — wire Add Skill button

- [ ] **Step 1: Create the new skill form page**

Form fields: name, description, category (dropdown of existing categories + custom), skill code, certification levels (multi-select checkboxes: EMR, EMT, AEMT, Paramedic), is_required toggle. Posts to `/api/agency/skills` then redirects to `/agency/skills`.

- [ ] **Step 2: Wire the Add Skill button on skills list page**

Change the existing disabled/dead button to link to `/agency/skills/new`.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(agency)/agency/skills/"
git commit -m "feat(agency): add custom skill creation page and wire Add Skill button"
```

---

### Task 12: Skill Detail/Edit Page

**Files:**
- Create: `src/app/(agency)/agency/skills/[id]/page.tsx`

- [ ] **Step 1: Create skill detail page with inline edit**

Shows skill info with edit form for tenant-owned skills (system defaults are read-only). Edit form reuses same fields as new skill page. PUTs to `/api/agency/skills/[id]`.

- [ ] **Step 2: Commit**

```bash
git add "src/app/(agency)/agency/skills/[id]/page.tsx"
git commit -m "feat(agency): add skill detail/edit page"
```

---

### Task 13: Bulk Employee Import Page

**Files:**
- Create: `src/app/(agency)/agency/employees/import/page.tsx`
- Modify: `src/app/(agency)/agency/employees/page.tsx` — add Import button

- [ ] **Step 1: Create import page**

Features:
- CSV file upload with drag-and-drop zone
- Preview table showing parsed rows
- Validation indicators (missing fields, invalid cert levels)
- Column mapping display
- Import button that POSTs to `/api/agency/employees/import`
- Results summary (success/failure per row)
- Download template CSV button

Expected CSV columns: first_name, last_name, email, phone, employee_number, certification_level, state_cert_number, nremt_number, cert_expiration, hire_date, department, position

- [ ] **Step 2: Add Import button to employees list page**

Add a secondary button next to "Add Employee" that links to `/agency/employees/import`.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(agency)/agency/employees/"
git commit -m "feat(agency): add bulk employee CSV import page"
```

---

### Task 14: MD Verification Dashboard

**Files:**
- Create: `src/app/(agency)/agency/medical-directors/dashboard/page.tsx`
- Modify: `src/app/(agency)/agency/medical-directors/pending/page.tsx` — add batch approve

- [ ] **Step 1: Create MD dashboard page**

Shows:
- Stats: total verified by this MD, pending count, this month's verifications
- Recent verification history (last 20)
- Quick link to pending verifications
- This page is for MDs only (check `isMedicalDirector`)

Fetches from `/api/agency/stats` + `/api/agency/verifications`.

- [ ] **Step 2: Add batch approve to pending verifications page**

Add:
- Checkbox column on each pending verification row
- "Select All" checkbox in header
- "Approve Selected (N)" button that calls the batch verify endpoint
- Verification method dropdown (in_person, video, documentation_review)

- [ ] **Step 3: Commit**

```bash
git add "src/app/(agency)/agency/medical-directors/"
git commit -m "feat(agency): add MD dashboard and batch approve to pending verifications"
```

---

### Task 15: Reports Page

**Files:**
- Create: `src/app/(agency)/agency/reports/page.tsx`
- Modify: `src/app/(agency)/agency/layout.tsx` — add Reports nav item

- [ ] **Step 1: Create reports page**

Features:
- Report type selector: Compliance Summary | Expiring Certifications
- Cycle filter dropdown (for compliance report)
- Days-ahead slider (for expiring certs, default 90)
- Data table showing report results
- "Export CSV" button that calls the reports API with `format=csv`
- Summary stats at top

- [ ] **Step 2: Add Reports to agency navigation**

Add to the nav items array in layout.tsx (admin only):
```tsx
{ title: "Reports", href: "/agency/reports", icon: <BarChart3 className="h-5 w-5" />, adminOnly: true }
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/(agency)/agency/reports/page.tsx" "src/app/(agency)/agency/layout.tsx"
git commit -m "feat(agency): add compliance reports page with CSV export"
```

---

## Phase 4: Email Notifications

### Task 16: MD Invitation Emails

**Files:**
- Modify: `src/app/api/agency/invite-md/route.ts` — send email on invite
- Create: `src/lib/notifications/agency-templates.ts` — email template generators (uses existing `sendEmail()` from `email-service.ts`)

- [ ] **Step 1: Create agency email helper**

```typescript
// src/lib/notifications/agency-templates.ts
// Uses the existing EmailTemplate interface + sendEmail() from email-service.ts
// NO new npm dependencies — Resend is called via raw fetch in email-service.ts

import type { EmailTemplate } from "./email-templates";

export function mdInviteTemplate(params: {
  mdName: string;
  agencyName: string;
  registrationUrl: string;
  invitedByName: string;
  expiresAt: string;
}): EmailTemplate {
  const expiryDate = new Date(params.expiresAt).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  return {
    subject: `You've been invited as Medical Director for ${params.agencyName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Medical Director Invitation</h2>
        <p>Hello Dr. ${params.mdName},</p>
        <p><strong>${params.invitedByName}</strong> has invited you to join <strong>${params.agencyName}</strong> as a Medical Director on MedicForge.</p>
        <p>As Medical Director, you'll be able to review and verify employee competencies for the agency.</p>
        <p style="margin: 24px 0;">
          <a href="${params.registrationUrl}" style="background: #C53030; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Accept Invitation
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">This invitation expires on ${expiryDate}.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">MedicForge — EMS Workforce Management</p>
      </div>
    `,
    text: `Dr. ${params.mdName}, ${params.invitedByName} has invited you to join ${params.agencyName} as Medical Director on MedicForge. Accept: ${params.registrationUrl} (expires ${expiryDate})`,
  };
}

export function expiringCertTemplate(params: {
  employeeName: string;
  agencyName: string;
  certLevel: string;
  expirationDate: string;
  daysUntil: number;
}): EmailTemplate {
  return {
    subject: `Certification expiring in ${params.daysUntil} days — ${params.employeeName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Certification Expiration Notice</h2>
        <p>The following employee's certification is expiring soon:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Employee</strong></td><td style="padding: 8px; border: 1px solid #eee;">${params.employeeName}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Cert Level</strong></td><td style="padding: 8px; border: 1px solid #eee;">${params.certLevel}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Expiration</strong></td><td style="padding: 8px; border: 1px solid #eee;">${params.expirationDate}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Days Until</strong></td><td style="padding: 8px; border: 1px solid #eee;">${params.daysUntil} days</td></tr>
        </table>
        <p style="color: #999; font-size: 12px;">MedicForge — ${params.agencyName}</p>
      </div>
    `,
    text: `${params.employeeName}'s ${params.certLevel} certification expires on ${params.expirationDate} (${params.daysUntil} days). — ${params.agencyName}`,
  };
}

export function pendingVerificationTemplate(params: {
  mdName: string;
  agencyName: string;
  pendingCount: number;
  dashboardUrl: string;
}): EmailTemplate {
  return {
    subject: `${params.pendingCount} competencies awaiting your verification`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Pending Verifications</h2>
        <p>Hello Dr. ${params.mdName},</p>
        <p>There are <strong>${params.pendingCount}</strong> employee competencies awaiting your review at <strong>${params.agencyName}</strong>.</p>
        <p style="margin: 24px 0;">
          <a href="${params.dashboardUrl}" style="background: #C53030; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Review Verifications
          </a>
        </p>
        <p style="color: #999; font-size: 12px;">MedicForge — EMS Workforce Management</p>
      </div>
    `,
    text: `Dr. ${params.mdName}, there are ${params.pendingCount} competencies awaiting your review at ${params.agencyName}. Review: ${params.dashboardUrl}`,
  };
}
```

**Usage pattern** — in API routes, import the template generator + `sendEmail`:
```typescript
import { sendEmail } from "@/lib/notifications/email-service";
import { mdInviteTemplate } from "@/lib/notifications/agency-templates";

await sendEmail({
  to: invitation.email,
  template: mdInviteTemplate({ mdName, agencyName, registrationUrl, invitedByName, expiresAt }),
});
```

- [ ] **Step 2: Wire email into invite-md route**

In `src/app/api/agency/invite-md/route.ts`, after successfully creating the invitation:
```typescript
import { sendEmail } from "@/lib/notifications/email-service";
import { mdInviteTemplate } from "@/lib/notifications/agency-templates";

// After invitation insert succeeds:
await sendEmail({
  to: invitation.email,
  template: mdInviteTemplate({ mdName, agencyName, registrationUrl, invitedByName, expiresAt }),
});
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/notifications/agency-templates.ts src/app/api/agency/invite-md/route.ts
git commit -m "feat(agency): add email notifications for MD invitations"
```

---

### Task 17: Notification Trigger Endpoint

**Files:**
- Create: `src/app/api/agency/notifications/route.ts`

- [ ] **Step 1: Create notifications endpoint**

This endpoint can be called manually by admin or on a cron. It checks for:
1. Expiring certifications (within configured reminder days)
2. Pending verifications needing MD attention

Sends emails via the helpers from Task 16.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/agency/notifications/
git commit -m "feat(agency): add notification trigger endpoint for expiring certs and pending verifications"
```

---

## Phase 5: Final Integration

### Task 18: Update Cycles Create to Auto-Generate Competencies

**Files:**
- Modify: `src/app/(agency)/agency/cycles/new/page.tsx`

- [ ] **Step 1: Add post-creation competency generation**

After successfully creating a cycle via POST `/api/agency/cycles`, immediately call `/api/agency/cycles/[newId]/generate` to create competency records. Show a success message with the count of generated records.

- [ ] **Step 2: Commit**

```bash
git add "src/app/(agency)/agency/cycles/new/page.tsx"
git commit -m "feat(agency): auto-generate competencies after cycle creation"
```

---

### Task 19: Final Build + Verification

- [ ] **Step 1: Run build**

```bash
cd C:/MedicForge-full && npm run build
```

Fix any TypeScript errors.

- [ ] **Step 2: Verify all routes resolve**

Check that all new pages and API routes are accessible:
- `/agency/employees/[id]`
- `/agency/cycles/[id]`
- `/agency/skills/new`
- `/agency/skills/[id]`
- `/agency/employees/import`
- `/agency/medical-directors/dashboard`
- `/agency/reports`
- All new API endpoints

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(agency): complete agency competency tracking feature set"
```

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 0: Utilities | Task 0 | Shared auth helper for agency API routes |
| 1: APIs | Tasks 1-6 | All missing CRUD endpoints, competency generation, batch verify, reports, import |
| 2: Hooks | Tasks 7-8b | React Query hooks for competencies, cycle details, batch verify |
| 3: Pages | Tasks 9-15 | Employee detail, cycle detail, skill CRUD, import, MD dashboard, reports |
| 4: Email | Tasks 16-17 | MD invite emails, expiring cert alerts, pending verification reminders |
| 5: Integration | Tasks 18-19 | Auto-generate competencies on cycle create, build verification |
