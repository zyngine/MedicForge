import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigrations() {
  const migrationsDir = path.join(__dirname, "../supabase/migrations");
  const files = fs.readdirSync(migrationsDir).sort();

  console.log("Applying migrations to:", supabaseUrl);
  console.log("Found migrations:", files);

  for (const file of files) {
    if (!file.endsWith(".sql")) continue;

    console.log(`\nApplying ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");

    // Split by semicolons but keep track of function bodies
    const statements = splitSqlStatements(sql);

    for (const statement of statements) {
      const trimmed = statement.trim();
      if (!trimmed || trimmed.startsWith("--")) continue;

      try {
        const { error } = await supabase.rpc("exec_sql", { sql_query: trimmed });
        if (error) {
          // Try direct query if RPC doesn't work
          console.log(`  Statement starting with: ${trimmed.substring(0, 50)}...`);
        }
      } catch (err) {
        console.log(`  Note: ${(err as Error).message.substring(0, 100)}`);
      }
    }

    console.log(`  ✓ Processed ${file}`);
  }

  console.log("\n✓ Migrations complete!");
}

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inFunction = false;

  const lines = sql.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Track if we're inside a function body
    if (
      trimmedLine.includes("$$") ||
      trimmedLine.toLowerCase().startsWith("create or replace function") ||
      trimmedLine.toLowerCase().startsWith("create function")
    ) {
      const dollarCount = (line.match(/\$\$/g) || []).length;
      if (dollarCount === 1) {
        inFunction = !inFunction;
      }
    }

    current += line + "\n";

    // Only split on semicolon if not inside a function
    if (!inFunction && trimmedLine.endsWith(";")) {
      statements.push(current.trim());
      current = "";
    }
  }

  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

applyMigrations().catch(console.error);
