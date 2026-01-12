import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID || "medicforge";
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

interface VercelDomain {
  name: string;
  verified: boolean;
  verification?: Array<{
    type: string;
    domain: string;
    value: string;
    reason: string;
  }>;
}

// GET - Get domain status for current tenant
export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user and their tenant
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!userData || !userData.role || !["admin", "instructor"].includes(userData.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get tenant's custom domain
    const { data: tenant } = await supabase
      .from("tenants")
      .select("custom_domain, slug")
      .eq("id", userData.tenant_id)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // If no custom domain set, return empty
    if (!tenant.custom_domain) {
      return NextResponse.json({
        domain: null,
        verified: false,
        subdomain: `${tenant.slug}.medicforge.net`,
      });
    }

    // Check domain status in Vercel
    if (!VERCEL_TOKEN) {
      return NextResponse.json({
        domain: tenant.custom_domain,
        verified: false,
        error: "Vercel integration not configured",
        subdomain: `${tenant.slug}.medicforge.net`,
      });
    }

    const vercelUrl = VERCEL_TEAM_ID
      ? `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${tenant.custom_domain}?teamId=${VERCEL_TEAM_ID}`
      : `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${tenant.custom_domain}`;

    const response = await fetch(vercelUrl, {
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        domain: tenant.custom_domain,
        verified: false,
        subdomain: `${tenant.slug}.medicforge.net`,
      });
    }

    const domainData: VercelDomain = await response.json();

    return NextResponse.json({
      domain: tenant.custom_domain,
      verified: domainData.verified,
      verification: domainData.verification,
      subdomain: `${tenant.slug}.medicforge.net`,
    });
  } catch (error) {
    console.error("Error getting domain status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Add a custom domain
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { domain } = await request.json();

    if (!domain || typeof domain !== "string") {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 });
    }

    // Validate domain format
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json({ error: "Invalid domain format" }, { status: 400 });
    }

    // Don't allow medicforge.net subdomains
    if (domain.endsWith(".medicforge.net") || domain === "medicforge.net") {
      return NextResponse.json({ error: "Cannot use medicforge.net domains" }, { status: 400 });
    }

    // Get current user and their tenant
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!userData || userData.role !== "admin") {
      return NextResponse.json({ error: "Only admins can manage domains" }, { status: 403 });
    }

    // Check if domain is already used by another tenant
    const { data: existingTenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("custom_domain", domain)
      .neq("id", userData.tenant_id)
      .single();

    if (existingTenant) {
      return NextResponse.json({ error: "Domain is already in use" }, { status: 409 });
    }

    // Add domain to Vercel
    if (!VERCEL_TOKEN) {
      return NextResponse.json({ error: "Vercel integration not configured" }, { status: 500 });
    }

    const vercelUrl = VERCEL_TEAM_ID
      ? `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains?teamId=${VERCEL_TEAM_ID}`
      : `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`;

    const vercelResponse = await fetch(vercelUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    });

    if (!vercelResponse.ok) {
      const error = await vercelResponse.json();
      console.error("Vercel API error:", error);
      return NextResponse.json({
        error: error.error?.message || "Failed to add domain to Vercel"
      }, { status: 400 });
    }

    const domainData: VercelDomain = await vercelResponse.json();

    // Update tenant with custom domain
    const { error: updateError } = await supabase
      .from("tenants")
      .update({ custom_domain: domain })
      .eq("id", userData.tenant_id);

    if (updateError) {
      console.error("Error updating tenant:", updateError);
      return NextResponse.json({ error: "Failed to save domain" }, { status: 500 });
    }

    return NextResponse.json({
      domain: domain,
      verified: domainData.verified,
      verification: domainData.verification,
      message: domainData.verified
        ? "Domain added and verified!"
        : "Domain added. Please configure DNS.",
    });
  } catch (error) {
    console.error("Error adding domain:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Remove custom domain
export async function DELETE() {
  try {
    const supabase = await createClient();

    // Get current user and their tenant
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from("users")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (!userData || userData.role !== "admin") {
      return NextResponse.json({ error: "Only admins can manage domains" }, { status: 403 });
    }

    // Get tenant's current domain
    const { data: tenant } = await supabase
      .from("tenants")
      .select("custom_domain")
      .eq("id", userData.tenant_id)
      .single();

    if (!tenant?.custom_domain) {
      return NextResponse.json({ error: "No custom domain configured" }, { status: 400 });
    }

    // Remove domain from Vercel
    if (VERCEL_TOKEN) {
      const vercelUrl = VERCEL_TEAM_ID
        ? `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${tenant.custom_domain}?teamId=${VERCEL_TEAM_ID}`
        : `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains/${tenant.custom_domain}`;

      await fetch(vercelUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
        },
      });
    }

    // Remove from tenant
    const { error: updateError } = await supabase
      .from("tenants")
      .update({ custom_domain: null })
      .eq("id", userData.tenant_id);

    if (updateError) {
      console.error("Error updating tenant:", updateError);
      return NextResponse.json({ error: "Failed to remove domain" }, { status: 500 });
    }

    return NextResponse.json({ message: "Domain removed successfully" });
  } catch (error) {
    console.error("Error removing domain:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
