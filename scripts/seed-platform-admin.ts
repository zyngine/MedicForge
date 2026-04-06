/**
 * Seed Platform Admin for MedicForge
 *
 * This script creates the developer/platform admin account.
 * Run with: npx tsx scripts/seed-platform-admin.ts
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

// Platform Admin credentials - CHANGE THESE FOR PRODUCTION
const PLATFORM_ADMIN = {
  email: "admin@medicforge.com",
  password: "MedicForge2024!",
  name: "Platform Administrator",
};

async function seedPlatformAdmin() {
  console.log("🔐 Creating Platform Admin account...\n");

  try {
    // Check if admin already exists
    const { data: existingAdmin } = await supabase
      .from("platform_admins")
      .select("id, user_id")
      .limit(1)
      .single();

    if (existingAdmin) {
      console.log("  ⚠️  Platform admin already exists");

      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(existingAdmin.user_id);
      if (userData?.user) {
        console.log(`  Email: ${userData.user.email}`);
      }
      return;
    }

    // Create auth user
    console.log("Creating auth user...");
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: PLATFORM_ADMIN.email,
      password: PLATFORM_ADMIN.password,
      email_confirm: true,
      user_metadata: {
        full_name: PLATFORM_ADMIN.name,
        is_platform_admin: true,
      },
    });

    if (authError) throw authError;
    console.log(`  ✓ Auth user created: ${authUser.user.id}`);

    // Add to platform_admins table
    console.log("Adding to platform_admins table...");
    const { error: adminError } = await supabase.from("platform_admins").insert({
      user_id: authUser.user.id,
      role: "super_admin",
    });

    if (adminError) throw adminError;
    console.log("  ✓ Added to platform_admins table");

    // Done!
    console.log("\n" + "=".repeat(60));
    console.log("✅ Platform Admin created successfully!");
    console.log("=".repeat(60));
    console.log("\n🔑 Platform Admin Credentials:");
    console.log(`   Email: ${PLATFORM_ADMIN.email}`);
    console.log(`   Password: ${PLATFORM_ADMIN.password}`);
    console.log("\n⚠️  IMPORTANT: Change this password in production!");
    console.log("\n   Login at: /platform-admin");
    console.log("\n");

  } catch (error) {
    console.error("Error creating platform admin:", error);
    process.exit(1);
  }
}

seedPlatformAdmin();
