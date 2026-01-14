import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkDemoAccounts() {
  console.log("Checking demo accounts...\n");

  // Check users table
  const { data: users, error } = await supabase
    .from("users")
    .select("id, email, role, full_name, tenant_id")
    .in("email", ["demo.instructor@medicforge.com", "demo.student@medicforge.com"]);

  if (error) {
    console.log("Error querying users:", error.message);
    return;
  }

  if (!users || users.length === 0) {
    console.log("Demo accounts NOT found in users table.");
    console.log("\nYou need to create these accounts in Supabase:");
    console.log("  1. demo.instructor@medicforge.com (role: instructor)");
    console.log("  2. demo.student@medicforge.com (role: student)");
  } else {
    console.log("Demo accounts found:");
    users.forEach((u) => {
      console.log(`  ${u.role}: ${u.email}`);
      console.log(`    Name: ${u.full_name}`);
      console.log(`    Tenant: ${u.tenant_id || "None"}`);
    });
  }

  // Check auth.users via admin API
  const { data: authData } = await supabase.auth.admin.listUsers();
  const demoAuthUsers = authData?.users?.filter((u) =>
    ["demo.instructor@medicforge.com", "demo.student@medicforge.com"].includes(u.email || "")
  );

  console.log("\nAuth accounts:");
  if (demoAuthUsers && demoAuthUsers.length > 0) {
    demoAuthUsers.forEach((u) => {
      console.log(`  ${u.email} - confirmed: ${u.email_confirmed_at ? "yes" : "no"}`);
    });
  } else {
    console.log("  No demo accounts in auth.users");
  }
}

checkDemoAccounts();
