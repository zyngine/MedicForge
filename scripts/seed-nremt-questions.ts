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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Map CSV category names to NREMT category codes
const categoryMap: Record<string, string> = {
  Airway: "ARV",
  Cardiology: "CAR",
  Trauma: "TRA",
  Medical: "MOG",
  Operations: "OPS",
};

// Difficulty mapping based on question complexity (can be refined)
function getDifficulty(subcategory: string): "easy" | "medium" | "hard" | "expert" {
  const hardSubcategories = ["Anatomy", "Pharmacology", "ECG", "Advanced"];
  const easySubcategories = ["Safety", "Documentation", "Basic"];

  if (hardSubcategories.some((s) => subcategory.includes(s))) {
    return "hard";
  }
  if (easySubcategories.some((s) => subcategory.includes(s))) {
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

async function importQuestions() {
  console.log("Starting NREMT question import...\n");

  // First, get the category IDs from the database
  const { data: categories, error: catError } = await supabase
    .from("question_bank_categories")
    .select("id, name, nremt_category_code")
    .is("tenant_id", null); // System-wide categories

  if (catError) {
    console.error("Error fetching categories:", catError);
    process.exit(1);
  }

  // Create a map from NREMT code to category ID
  const categoryIdMap = new Map<string, string>();
  categories?.forEach((cat) => {
    if (cat.nremt_category_code) {
      categoryIdMap.set(cat.nremt_category_code, cat.id);
    }
  });

  console.log("Found categories:", Array.from(categoryIdMap.keys()).join(", "));

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

  let totalImported = 0;
  let totalErrors = 0;

  for (const csvFile of csvFiles) {
    const filePath = path.join(csvDir, csvFile);

    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      continue;
    }

    console.log(`\nProcessing ${csvFile}...`);

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const records: CSVQuestion[] = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    console.log(`Found ${records.length} questions`);

    // Transform and insert questions
    const questions = records.map((record) => {
      const categoryCode = categoryMap[record.category];
      const categoryId = categoryIdMap.get(categoryCode);

      // Create options array
      const options = [
        { id: "A", text: record.option_a, isCorrect: record.correct_answer === "A" },
        { id: "B", text: record.option_b, isCorrect: record.correct_answer === "B" },
        { id: "C", text: record.option_c, isCorrect: record.correct_answer === "C" },
        { id: "D", text: record.option_d, isCorrect: record.correct_answer === "D" },
      ];

      // Create correct answer object
      const correctAnswer = {
        id: record.correct_answer,
        text: record[`option_${record.correct_answer.toLowerCase()}` as keyof CSVQuestion],
      };

      return {
        tenant_id: null, // System-wide questions
        category_id: categoryId || null,
        question_text: record.question,
        question_type: "multiple_choice",
        options: options,
        correct_answer: correctAnswer,
        explanation: record.rationale,
        certification_level: "EMT", // Default to EMT
        difficulty: getDifficulty(record.subcategory),
        points: 1,
        time_estimate_seconds: 60,
        source: "NREMT Practice Bank",
        is_validated: true,
        is_active: true,
        tags: [record.category, record.subcategory, "NREMT"],
      };
    });

    // Insert in batches of 50
    const batchSize = 50;
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);

      const { data, error } = await supabase
        .from("question_bank")
        .insert(batch)
        .select("id");

      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error.message);
        totalErrors += batch.length;
      } else {
        totalImported += data?.length || 0;
        console.log(`  Inserted ${data?.length || 0} questions (batch ${i / batchSize + 1})`);
      }
    }
  }

  console.log("\n========================================");
  console.log(`Import complete!`);
  console.log(`Total imported: ${totalImported}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log("========================================\n");
}

importQuestions().catch(console.error);
