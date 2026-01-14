import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixUserTenant() {
  // Get email from command line argument
  const email = process.argv[2];

  if (!email) {
    console.log("Usage: npx tsx scripts/fix-user-tenant.ts <email>");
    console.log("Example: npx tsx scripts/fix-user-tenant.ts user@example.com");
    return;
  }

  console.log(`Looking for user: ${email}\n`);

  // Find the auth user
  const { data: authList } = await supabase.auth.admin.listUsers();
  const authUser = authList?.users?.find((u) => u.email === email);

  if (!authUser) {
    console.log("Auth user not found!");
    return;
  }

  console.log("Auth user found:", authUser.id);
  console.log("User metadata:", JSON.stringify(authUser.user_metadata, null, 2));

  // Check if profile exists
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (profile) {
    console.log("\nProfile exists:");
    console.log("  tenant_id:", profile.tenant_id || "MISSING");
    console.log("  role:", profile.role);
    console.log("  full_name:", profile.full_name);

    if (!profile.tenant_id) {
      console.log("\n⚠️ Profile has no tenant_id - needs fixing");
    } else {
      console.log("\n✅ Profile looks OK");
      return;
    }
  } else {
    console.log("\n⚠️ No profile found - will create one");
  }

  // Get metadata from auth user
  const metadata = authUser.user_metadata;
  const fullName = metadata?.full_name || email.split("@")[0];
  const organizationName = metadata?.organization_name || "My Organization";

  // Create a tenant
  const slug =
    organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 50) +
    "-" +
    Date.now().toString(36);

  console.log("\nCreating tenant:", organizationName, `(slug: ${slug})`);

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({
      name: organizationName,
      slug: slug,
      subscription_tier: "free",
      subscription_status: "active",
    })
    .select()
    .single();

  if (tenantError) {
    console.error("Error creating tenant:", tenantError.message);
    return;
  }

  console.log("Tenant created:", tenant.id);

  // Create or update profile
  if (profile) {
    const { error: updateError } = await supabase
      .from("users")
      .update({ tenant_id: tenant.id })
      .eq("id", authUser.id);

    if (updateError) {
      console.error("Error updating profile:", updateError.message);
      return;
    }
    console.log("Profile updated with tenant_id");
  } else {
    const { error: insertError } = await supabase.from("users").insert({
      id: authUser.id,
      tenant_id: tenant.id,
      email: email,
      full_name: fullName,
      role: "admin",
      is_active: true,
    });

    if (insertError) {
      console.error("Error creating profile:", insertError.message);
      return;
    }
    console.log("Profile created");
  }

  console.log("\n✅ Done! User now has a tenant.");
  console.log("   Please log out and log back in to see the changes.");
}

fixUserTenant();
