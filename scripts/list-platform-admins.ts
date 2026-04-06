/**
 * List Platform Admins
 *
 * This script lists all platform admins in the database.
 * Run with: npx tsx scripts/list-platform-admins.ts
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

async function listPlatformAdmins() {
  console.log("\n📋 Platform Admins\n");
  console.log("=".repeat(60));

  try {
    // Get all platform admins
    const { data: admins, error: adminError } = await supabase
      .from("platform_admins")
      .select("*")
      .order("created_at", { ascending: true });

    if (adminError) throw adminError;

    if (!admins || admins.length === 0) {
      console.log("\n⚠️  No platform admins found in database.");
      console.log("\nRun 'npx tsx scripts/seed-platform-admin.ts' to create the default admin.");
      console.log("Or run 'npx tsx scripts/add-platform-admin.ts <email>' to add a specific user.\n");
      return;
    }

    console.log(`\nFound ${admins.length} platform admin(s):\n`);

    for (const admin of admins) {
      // Get user details from auth
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(admin.user_id);

      if (userError || !userData.user) {
        console.log(`  ❌ User ID: ${admin.user_id} - AUTH USER NOT FOUND (orphaned record)`);
        continue;
      }

      const user = userData.user;
      const confirmedAt = user.email_confirmed_at ? "✓ Email Confirmed" : "⚠️ Email NOT Confirmed";

      console.log(`  📧 ${user.email}`);
      console.log(`     User ID: ${user.id}`);
      console.log(`     Role: ${admin.role || "super_admin"}`);
      console.log(`     Status: ${confirmedAt}`);
      console.log(`     Created: ${new Date(admin.created_at!).toLocaleDateString()}`);
      console.log("");
    }

    console.log("=".repeat(60));
    console.log("\n💡 To add another admin: npx tsx scripts/add-platform-admin.ts <email>");
    console.log("💡 Platform admin login: /platform-admin\n");

  } catch (error) {
    console.error("\n❌ Error listing platform admins:", error);
    process.exit(1);
  }
}

listPlatformAdmins();
