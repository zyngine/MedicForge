/**
 * Add Platform Admin by Email
 *
 * This script adds an existing user as a platform admin.
 * Run with: npx tsx scripts/add-platform-admin.ts <email>
 *
 * Example: npx tsx scripts/add-platform-admin.ts john@example.com
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/supabase";
import path from "path";

// Load environment variables from the project root
import dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function addPlatformAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error("\n❌ Error: Please provide an email address");
    console.log("\nUsage: npx tsx scripts/add-platform-admin.ts <email>");
    console.log("Example: npx tsx scripts/add-platform-admin.ts john@example.com\n");
    process.exit(1);
  }

  console.log(`\n🔍 Looking up user: ${email}`);

  try {
    // List users to find by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) throw listError;

    const user = users.users.find(u => u.email === email);

    if (!user) {
      console.error(`\n❌ No user found with email: ${email}`);
      console.log("\nMake sure the user has registered and confirmed their email first.");
      console.log("\nAlternatively, run 'npx tsx scripts/seed-platform-admin.ts' to create the default admin account.\n");
      process.exit(1);
    }

    console.log(`✓ Found user: ${user.id}`);

    // Check if already a platform admin
    const { data: existing } = await supabase
      .from("platform_admins")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existing) {
      console.log(`\n⚠️  ${email} is already a platform admin.\n`);
      return;
    }

    // Add to platform_admins table
    console.log("Adding to platform_admins table...");
    const { error: adminError } = await supabase.from("platform_admins").insert({
      user_id: user.id,
      role: "super_admin",
    });

    if (adminError) throw adminError;

    console.log("\n" + "=".repeat(50));
    console.log("✅ Platform Admin added successfully!");
    console.log("=".repeat(50));
    console.log(`\n   Email: ${email}`);
    console.log("   Login at: /platform-admin");
    console.log("\n");

  } catch (error) {
    console.error("\n❌ Error adding platform admin:", error);
    process.exit(1);
  }
}

addPlatformAdmin();
