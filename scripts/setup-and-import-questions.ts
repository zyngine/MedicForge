import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// Map CSV category names to database category info
const categoryData = [
  { name: "Airway, Respiration & Ventilation", code: "ARV", csvName: "Airway" },
  { name: "Cardiology & Resuscitation", code: "CAR", csvName: "Cardiology" },
  { name: "Trauma", code: "TRA", csvName: "Trauma" },
  { name: "Medical/Obstetrics/Gynecology", code: "MOG", csvName: "Medical" },
  { name: "EMS Operations", code: "OPS", csvName: "Operations" },
];

// Difficulty mapping based on question complexity
function getDifficulty(subcategory: string): string {
  const hardSubcategories = ["Anatomy", "Pharmacology", "ECG", "Advanced", "Pathophysiology"];
  const easySubcategories = ["Safety", "Documentation", "Basic", "Introduction"];

  if (hardSubcategories.some((s) => subcategory.toLowerCase().includes(s.toLowerCase()))) {
    return "hard";
  }
  if (easySubcategories.some((s) => subcategory.toLowerCase().includes(s.toLowerCase()))) {
    return "easy";
  }
  return "medium";
}

interface CSVQuestion {
  id: string;
  category: string;
  subcategory: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  rationale: string;
}

async function checkAndCreateTables() {
  console.log("Checking if question_bank table exists...");

  // Try to query the table
  const { error } = await supabase
    .from("question_bank")
    .select("id")
    .limit(1);

  if (error && error.code === "PGRST204") {
    console.log("\nERROR: The question_bank table doesn't exist.");
    console.log("\nPlease run this SQL in your Supabase Dashboard SQL Editor:");
    console.log("(Dashboard > SQL Editor > New Query)\n");
    console.log("-------------------------------------------");
    console.log(`
-- Create question_bank table
CREATE TABLE IF NOT EXISTS question_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    category_id UUID,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'multiple_choice',
    options JSONB,
    correct_answer JSONB NOT NULL,
    explanation TEXT,
    certification_level TEXT DEFAULT 'EMT',
    difficulty TEXT DEFAULT 'medium',
    points INTEGER DEFAULT 1,
    time_estimate_seconds INTEGER DEFAULT 60,
    source TEXT,
    is_validated BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    times_used INTEGER DEFAULT 0,
    times_correct INTEGER DEFAULT 0,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;

-- Allow read access
CREATE POLICY "Allow read access to question_bank" ON question_bank
    FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access" ON question_bank
    FOR ALL USING (true);
`);
    console.log("-------------------------------------------");
    console.log("\nAfter running the SQL, re-run this script.");
    return false;
  }

  if (error && error.code !== "PGRST116") {
    // PGRST116 means no rows found, which is fine
    console.error("Error checking table:", error);
    return false;
  }

  console.log("Table exists, proceeding with import...\n");
  return true;
}

async function importQuestions() {
  console.log("Starting NREMT question import...\n");

  // Check if table exists
  const tableExists = await checkAndCreateTables();
  if (!tableExists) {
    return;
  }

  // CSV files to import
  const csvDir = path.join(
    process.env.USERPROFILE || process.env.HOME || "",
    "Downloads",
    "nremt_questions"
  );

  const csvFiles = [
    "NREMT_Airway_Questions_100.csv",
    "NREMT_Cardiology_Questions_100.csv",
    "NREMT_Trauma_Questions_100.csv",
    "NREMT_Medical_Questions_100.csv",
    "NREMT_Operations_Questions_100.csv",
  ];

  // Map CSV category names to our category info
  const csvToCategoryMap = new Map(categoryData.map(c => [c.csvName, c]));

  let totalImported = 0;
  let totalErrors = 0;

  for (const csvFile of csvFiles) {
    const filePath = path.join(csvDir, csvFile);

    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      continue;
    }

    console.log(`Processing ${csvFile}...`);

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const records: CSVQuestion[] = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    });

    console.log(`  Found ${records.length} questions`);

    // Transform and prepare questions
    const questions = records.map((record) => {
      const categoryInfo = csvToCategoryMap.get(record.category);

      // Create options array
      const options = [
        { id: "A", text: record.option_a, isCorrect: record.correct_answer === "A" },
        { id: "B", text: record.option_b, isCorrect: record.correct_answer === "B" },
        { id: "C", text: record.option_c, isCorrect: record.correct_answer === "C" },
        { id: "D", text: record.option_d, isCorrect: record.correct_answer === "D" },
      ];

      // Get correct answer text
      const answerKey = `option_${record.correct_answer.toLowerCase()}` as keyof CSVQuestion;
      const correctAnswerText = record[answerKey] || "";

      return {
        tenant_id: null, // System-wide questions
        category_id: null, // We're not using category_id since table might not have the reference
        question_text: record.question,
        question_type: "multiple_choice",
        options: options,
        correct_answer: { id: record.correct_answer, text: correctAnswerText },
        explanation: record.rationale,
        certification_level: "EMT",
        difficulty: getDifficulty(record.subcategory),
        points: 1,
        time_estimate_seconds: 60,
        source: "NREMT Practice Bank",
        is_validated: true,
        is_active: true,
        tags: [record.category, record.subcategory, "NREMT", categoryInfo?.code || ""].filter(Boolean),
      };
    });

    // Insert in batches of 25
    const batchSize = 25;
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);

      const { data, error } = await supabase
        .from("question_bank")
        .insert(batch)
        .select("id");

      if (error) {
        console.error(`  Error batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        totalErrors += batch.length;
      } else {
        totalImported += data?.length || 0;
        process.stdout.write(`  Imported ${totalImported} questions...\r`);
      }
    }

    console.log(`  Completed: ${questions.length} questions processed`);
  }

  console.log("\n========================================");
  console.log("Import Complete!");
  console.log(`Total imported: ${totalImported}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log("========================================\n");

  // Verify import
  const { count } = await supabase
    .from("question_bank")
    .select("*", { count: "exact", head: true });

  console.log(`Total questions in database: ${count}`);
}

importQuestions().catch(console.error);
