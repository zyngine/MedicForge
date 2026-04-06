import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log("Applying question bank migration...\n");

  // Read the migration file
  const migrationPath = path.join(__dirname, "../supabase/migrations/20240310000000_question_bank.sql");
  const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

  // Split by statements (rough split on semicolons followed by newlines)
  const statements = migrationSQL
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith("--"));

  console.log(`Found ${statements.length} SQL statements to execute`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 80).replace(/\n/g, " ");

    try {
      const { error } = await supabase.rpc("exec_sql", { sql: stmt + ";" });

      if (error) {
        // Skip "already exists" errors
        if (error.message?.includes("already exists")) {
          console.log(`  [SKIP] ${preview}... (already exists)`);
        } else {
          console.error(`  [ERROR] ${preview}...`);
          console.error(`    ${error.message}`);
        }
      } else {
        console.log(`  [OK] ${preview}...`);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(`  [ERROR] ${preview}...`);
      console.error(`    ${err.message || err}`);
    }
  }

  console.log("\nMigration complete!");
}

applyMigration().catch(console.error);
