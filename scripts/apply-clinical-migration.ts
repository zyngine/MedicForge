/**
 * Apply Clinical Scheduling Migration
 *
 * This script checks if clinical tables exist and provides instructions
 * for applying the migration via Supabase Dashboard.
 *
 * Run with: npx tsx scripts/apply-clinical-migration.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkAndApplyMigration() {
  console.log("Checking clinical scheduling tables...\n");

  // Check if clinical_sites table exists
  const { error: checkError } = await supabase
    .from("clinical_sites")
    .select("id")
    .limit(1);

  if (!checkError) {
    console.log("Clinical tables already exist!");
    console.log("You can run the demo seed script now:");
    console.log("  npx tsx scripts/seed-demo-data.ts");
    return;
  }

  if (checkError.code === "42P01" || checkError.message.includes("does not exist") || checkError.message.includes("schema cache")) {
    console.log("Clinical tables do not exist. Migration needed.\n");

    // Extract project ref from URL
    const projectRef = supabaseUrl.replace("https://", "").split(".")[0];

    console.log("============================================================");
    console.log("APPLY MIGRATION VIA SUPABASE DASHBOARD");
    console.log("============================================================\n");

    console.log("1. Open the Supabase Dashboard:");
    console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new\n`);

    console.log("2. Copy and paste the contents of:");
    console.log("   supabase/migrations/00003_clinical_scheduling.sql\n");

    console.log("3. Click 'Run' to execute the migration\n");

    console.log("4. Then paste and run:");
    console.log("   supabase/migrations/00004_clinical_rls_policies.sql\n");

    console.log("============================================================");
    console.log("QUICK COPY - Migration 1 (Tables & Functions):");
    console.log("============================================================\n");

    const migration1Path = path.join(__dirname, "..", "supabase", "migrations", "00003_clinical_scheduling.sql");
    const migration1 = fs.readFileSync(migration1Path, "utf-8");

    // Output first 50 lines as preview
    const lines1 = migration1.split("\n").slice(0, 30);
    console.log(lines1.join("\n"));
    console.log("\n... (full file: supabase/migrations/00003_clinical_scheduling.sql)\n");

    console.log("============================================================");
    console.log("After applying both migrations, run:");
    console.log("  npx tsx scripts/seed-demo-data.ts");
    console.log("============================================================");

  } else {
    console.error("Unexpected error:", checkError.message);
  }
}

checkAndApplyMigration();
