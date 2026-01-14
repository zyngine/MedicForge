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

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

async function runSQL() {
  console.log("Running question_bank migration via SQL...\n");
  console.log(`Project: ${projectRef}`);

  // Read the SQL file
  const sqlPath = path.join(__dirname, "create-question-bank.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  // Use the pg-meta endpoint to execute SQL
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": supabaseServiceKey,
      "Authorization": `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ sql }),
  });

  if (!response.ok) {
    // Try alternative: use the query endpoint
    console.log("exec_sql not available, trying direct query...\n");

    // Split SQL into individual statements and run one at a time
    const statements = sql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"));

    console.log(`Found ${statements.length} statements to execute`);

    // We can't run arbitrary SQL via REST API without a function
    // Let me try using the Supabase CLI instead
    console.log("\nThe Supabase REST API doesn't support arbitrary SQL execution.");
    console.log("\nPlease run this SQL in your Supabase Dashboard:");
    console.log("1. Go to https://supabase.com/dashboard/project/" + projectRef + "/sql/new");
    console.log("2. Copy the contents of: scripts/create-question-bank.sql");
    console.log("3. Run the SQL");
    console.log("\nThen re-run: npx tsx scripts/setup-and-import-questions.ts");

    return false;
  }

  const result = await response.json();
  console.log("SQL executed successfully:", result);
  return true;
}

runSQL().catch(console.error);
