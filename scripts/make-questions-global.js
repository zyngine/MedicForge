#!/usr/bin/env node

/**
 * Make all question bank questions global (visible to all tenants)
 * by setting tenant_id to NULL
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function makeQuestionsGlobal() {
  console.log("Making all question bank questions global...\n");

  // First, get count of questions
  const { count, error: countError } = await supabase
    .from("question_bank")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("Error counting questions:", countError);
    return;
  }

  console.log(`Found ${count} questions to update`);

  // Update all questions to have NULL tenant_id (makes them global)
  const { data, error } = await supabase
    .from("question_bank")
    .update({ tenant_id: null })
    .not("tenant_id", "is", null)
    .select("id");

  if (error) {
    console.error("Error updating questions:", error);
    return;
  }

  console.log(`\nUpdated ${data?.length || 0} questions to be global (tenant_id = NULL)`);

  // Also update categories to be global
  const { data: catData, error: catError } = await supabase
    .from("question_bank_categories")
    .update({ tenant_id: null })
    .not("tenant_id", "is", null)
    .select("id");

  if (catError) {
    console.error("Error updating categories:", catError);
  } else {
    console.log(`Updated ${catData?.length || 0} categories to be global`);
  }

  // Verify the update
  const { data: verifyData, error: verifyError } = await supabase
    .from("question_bank")
    .select("tenant_id")
    .not("tenant_id", "is", null)
    .limit(1);

  if (verifyError) {
    console.error("Error verifying:", verifyError);
  } else if (verifyData?.length === 0) {
    console.log("\nSuccess! All questions are now global and visible to all tenants.");
  } else {
    console.log("\nWarning: Some questions still have a tenant_id set.");
  }
}

makeQuestionsGlobal().catch(console.error);
