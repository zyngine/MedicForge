import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEMO_ACCOUNTS = [
  {
    email: "demo.instructor@medicforge.com",
    password: "DemoPass123!",
    full_name: "Dr. Sarah Johnson",
    role: "instructor",
  },
  {
    email: "demo.student@medicforge.com",
    password: "DemoPass123!",
    full_name: "Michael Chen",
    role: "student",
  },
];

async function createDemoAccounts() {
  console.log("Creating demo accounts...\n");

  // First, get or create a demo tenant
  let tenantId: string;

  const { data: existingTenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", "demo")
    .single();

  if (existingTenant) {
    tenantId = existingTenant.id;
    console.log("Using existing demo tenant:", tenantId);
  } else {
    const { data: newTenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        name: "MedicForge Demo",
        slug: "demo",
        subscription_tier: "institution",
        subscription_status: "active",
      })
      .select()
      .single();

    if (tenantError) {
      console.error("Error creating tenant:", tenantError.message);
      return;
    }

    tenantId = newTenant.id;
    console.log("Created demo tenant:", tenantId);
  }

  // Create each demo account
  for (const account of DEMO_ACCOUNTS) {
    console.log(`\nCreating ${account.role}: ${account.email}`);

    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: account.full_name,
      },
    });

    if (authError) {
      if (authError.message.includes("already been registered")) {
        console.log("  Auth user already exists, checking profile...");

        // Get existing user
        const { data: authList } = await supabase.auth.admin.listUsers();
        const existingAuth = authList?.users?.find((u) => u.email === account.email);

        if (existingAuth) {
          // Check if profile exists
          const { data: existingProfile } = await supabase
            .from("users")
            .select("id")
            .eq("id", existingAuth.id)
            .single();

          if (!existingProfile) {
            // Create profile for existing auth user
            const { error: profileError } = await supabase.from("users").insert({
              id: existingAuth.id,
              tenant_id: tenantId,
              email: account.email,
              full_name: account.full_name,
              role: account.role,
              is_active: true,
            });

            if (profileError) {
              console.log("  Error creating profile:", profileError.message);
            } else {
              console.log("  Created profile for existing auth user");
            }
          } else {
            console.log("  Profile already exists");
          }
        }
      } else {
        console.error("  Auth error:", authError.message);
      }
      continue;
    }

    console.log("  Created auth user:", authUser.user.id);

    // Create user profile
    const { error: profileError } = await supabase.from("users").insert({
      id: authUser.user.id,
      tenant_id: tenantId,
      email: account.email,
      full_name: account.full_name,
      role: account.role,
      is_active: true,
    });

    if (profileError) {
      console.error("  Profile error:", profileError.message);
    } else {
      console.log("  Created user profile");
    }
  }

  console.log("\n========================================");
  console.log("Demo accounts ready!");
  console.log("========================================");
  console.log("\nLogin at /demo with:");
  console.log("  Instructor: demo.instructor@medicforge.com");
  console.log("  Student: demo.student@medicforge.com");
  console.log("  Password: DemoPass123!");
}

createDemoAccounts();
