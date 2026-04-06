/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("Make sure .env.local is properly configured");
  process.exit(1);
}

async function _executeSql(sql) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ sql_query: sql }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SQL Error: ${text}`);
  }

  return response.json();
}

async function applyMigrations() {
  const migrationsDir = path.join(__dirname, "../supabase/migrations");
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith(".sql")).sort();

  console.log("=".repeat(60));
  console.log("MedicForge Database Migration");
  console.log("=".repeat(60));
  console.log("\nSupabase URL:", supabaseUrl);
  console.log("Migrations to apply:", files);
  console.log("\n");

  // Read and combine all migrations
  let allSql = "";
  for (const file of files) {
    console.log(`Reading ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    allSql += `\n-- ${file}\n${sql}\n`;
  }

  // Output the combined SQL for manual execution
  const outputPath = path.join(__dirname, "../supabase/combined-migration.sql");
  fs.writeFileSync(outputPath, allSql);
  console.log(`\nCombined SQL written to: ${outputPath}`);
  console.log("\nTo apply migrations:");
  console.log("1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/kftsdjuciwblaxfgvrku/sql/new");
  console.log("2. Copy the contents of supabase/combined-migration.sql");
  console.log("3. Paste and run in the SQL Editor");
  console.log("\n");
}

applyMigrations().catch(console.error);
