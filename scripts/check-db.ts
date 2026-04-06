import { createClient } from "@supabase/supabase-js";
import path from "path";

import dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log("Checking database...\n");

  // Check tenants
  const { data: tenants, error: tenantError } = await supabase
    .from("tenants")
    .select("id, name, slug");

  console.log("Tenants:", tenants?.length || 0);
  if (tenants) {
    tenants.forEach(t => console.log(`  - ${t.name} (${t.slug})`));
  }
  if (tenantError) console.log("Tenant error:", tenantError.message);

  // Check users
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("email, role, full_name")
    .limit(10);

  console.log("\nUsers:", users?.length || 0);
  if (users) {
    users.forEach(u => console.log(`  - ${u.full_name} (${u.role}): ${u.email}`));
  }
  if (userError) console.log("User error:", userError.message);

  // Check courses
  const { data: courses, error: courseError } = await supabase
    .from("courses")
    .select("title, course_type");

  console.log("\nCourses:", courses?.length || 0);
  if (courses) {
    courses.forEach(c => console.log(`  - ${c.title} (${c.course_type})`));
  }
  if (courseError) console.log("Course error:", courseError.message);

  // Check clinical sites
  const { data: sites, error: siteError } = await supabase
    .from("clinical_sites")
    .select("name, site_type");

  console.log("\nClinical Sites:", sites?.length || 0);
  if (sites) {
    sites.forEach(s => console.log(`  - ${s.name} (${s.site_type})`));
  }
  if (siteError) console.log("Site error:", siteError.message);

  // Check submissions
  const { data: submissions, error: subError } = await supabase
    .from("submissions")
    .select("id, status, raw_score")
    .eq("status", "graded");

  console.log("\nGraded Submissions:", submissions?.length || 0);
  if (subError) console.log("Submission error:", subError.message);

  console.log("\nDone!");
}

main().catch(console.error);
