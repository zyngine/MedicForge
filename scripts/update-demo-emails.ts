/**
 * Update demo account emails from @medicforge.com to @medicforge.net
 */
import { createClient } from "@supabase/supabase-js";
import path from "path";

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const emailMappings = [
  { old: "demo.instructor@medicforge.com", new: "demo.instructor@medicforge.net" },
  { old: "demo.student@medicforge.com", new: "demo.student@medicforge.net" },
  { old: "emily.davis@medicforge.com", new: "emily.davis@medicforge.net" },
  { old: "james.wilson@medicforge.com", new: "james.wilson@medicforge.net" },
  { old: "sophia.martinez@medicforge.com", new: "sophia.martinez@medicforge.net" },
  { old: "david.brown@medicforge.com", new: "david.brown@medicforge.net" },
  { old: "olivia.taylor@medicforge.com", new: "olivia.taylor@medicforge.net" },
  { old: "noah.anderson@medicforge.com", new: "noah.anderson@medicforge.net" },
  { old: "ava.thomas@medicforge.com", new: "ava.thomas@medicforge.net" },
];

async function updateEmails() {
  console.log("📧 Updating demo account emails to @medicforge.net\n");

  for (const mapping of emailMappings) {
    // Get user ID from users table
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("id")
      .eq("email", mapping.old)
      .single();

    if (fetchError || !user) {
      console.log(`  ⚠️  ${mapping.old} - not found, skipping`);
      continue;
    }

    // Update auth.users email via admin API
    const { error: authError } = await supabase.auth.admin.updateUserById(user.id, {
      email: mapping.new,
    });

    if (authError) {
      console.log(`  ❌ ${mapping.old} - auth update failed: ${authError.message}`);
      continue;
    }

    // Update users table email
    const { error: dbError } = await supabase
      .from("users")
      .update({ email: mapping.new })
      .eq("id", user.id);

    if (dbError) {
      console.log(`  ❌ ${mapping.old} - db update failed: ${dbError.message}`);
      continue;
    }

    console.log(`  ✅ ${mapping.old} → ${mapping.new}`);
  }

  console.log("\n✨ Email update complete!");
  console.log("\n📧 New Demo Credentials:");
  console.log("   Instructor: demo.instructor@medicforge.net / DemoPass123!");
  console.log("   Student: demo.student@medicforge.net / DemoPass123!");
}

updateEmails().catch(console.error);
