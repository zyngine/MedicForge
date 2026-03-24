import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/notifications/email-service";
import {
  expiringCertTemplate,
  pendingVerificationTemplate,
} from "@/lib/notifications/agency-templates";

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

    const body = await request.json().catch(() => ({}));
    const type = body.type || "all"; // "expiring" | "pending_verifications" | "all"

    const results: { type: string; sent: number; errors: number }[] = [];

    // Get tenant info
    const { data: tenant } = await adminClient
      .from("tenants")
      .select("name, slug")
      .eq("id", profile.tenant_id)
      .single();

    const agencyName = tenant?.name || "Your Agency";

    // Get agency settings for reminder days
    const { data: settings } = await adminClient
      .from("agency_settings")
      .select("verification_reminder_days")
      .eq("tenant_id", profile.tenant_id)
      .single();

    const reminderDays = settings?.verification_reminder_days || 90;

    // 1. Expiring certifications
    if (type === "expiring" || type === "all") {
      const cutoff = new Date(Date.now() + reminderDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const { data: expiring } = await adminClient
        .from("agency_employees")
        .select("id, first_name, last_name, email, certification_level, certification_expiration")
        .eq("tenant_id", profile.tenant_id)
        .eq("is_active", true)
        .not("email", "is", null)
        .not("certification_expiration", "is", null)
        .lte("certification_expiration", cutoff)
        .order("certification_expiration");

      let sent = 0;
      let errors = 0;

      for (const emp of expiring || []) {
        if (!emp.email) continue;

        const daysUntil = Math.ceil(
          (new Date(emp.certification_expiration!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntil < 0) continue; // Already expired, skip

        const result = await sendEmail({
          to: emp.email,
          template: expiringCertTemplate({
            employeeName: `${emp.first_name} ${emp.last_name}`,
            agencyName,
            certLevel: emp.certification_level,
            expirationDate: emp.certification_expiration!,
            daysUntil,
          }),
        });

        if (result.success) sent++;
        else errors++;
      }

      results.push({ type: "expiring_certs", sent, errors });
    }

    // 2. Pending verifications needing MD attention
    if (type === "pending_verifications" || type === "all") {
      // Count pending verifications
      const { count } = await adminClient
        .from("employee_competencies")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", profile.tenant_id)
        .eq("status", "pending_review");

      const pendingCount = count || 0;

      if (pendingCount > 0) {
        // Get active MDs
        const { data: mds } = await adminClient
          .from("medical_director_assignments")
          .select("user_id, md_name, md_email")
          .eq("tenant_id", profile.tenant_id)
          .eq("is_active", true);

        let sent = 0;
        let errors = 0;

        const dashboardUrl = tenant?.slug
          ? `https://${tenant.slug}.medicforge.net/agency/medical-directors/pending`
          : `${process.env.NEXT_PUBLIC_APP_URL || "https://www.medicforge.net"}/agency/medical-directors/pending`;

        for (const md of mds || []) {
          if (!md.md_email) continue;

          const result = await sendEmail({
            to: md.md_email,
            template: pendingVerificationTemplate({
              mdName: md.md_name,
              agencyName,
              pendingCount,
              dashboardUrl,
            }),
          });

          if (result.success) sent++;
          else errors++;
        }

        results.push({ type: "pending_verifications", sent, errors });
      } else {
        results.push({ type: "pending_verifications", sent: 0, errors: 0 });
      }
    }

    // Audit log
    await adminClient.from("agency_audit_log").insert({
      tenant_id: profile.tenant_id,
      action: "notifications_sent",
      entity_type: "notification",
      entity_id: null,
      performed_by: user.id,
      new_values: { type, results },
    });

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("POST /api/agency/notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
