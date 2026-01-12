/**
 * Test instructor dashboard data after demo login
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kftsdjuciwblaxfgvrku.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmdHNkanVjaXdibGF4Zmd2cmt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDQ0NDQsImV4cCI6MjA4MzQ4MDQ0NH0.MfJ_gdF4SEl5O2ZQp1z_End9A4TEUHy1fTjOOJzpWak";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInstructorDashboard() {
  console.log("🎓 Testing Instructor Dashboard Data\n");

  // Login as instructor
  console.log("1. Logging in as instructor...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "demo.instructor@medicforge.net",
    password: "DemoPass123!",
  });

  if (authError) {
    console.log("   ❌ Login failed:", authError.message);
    return;
  }
  console.log("   ✅ Logged in as:", authData.user?.email);

  const userId = authData.user?.id;

  // Get user profile with tenant
  console.log("\n2. Fetching user profile...");
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("full_name, role, tenant_id")
    .eq("id", userId)
    .single();

  if (userError) {
    console.log("   ❌ User fetch failed:", userError.message);
  } else {
    console.log("   ✅ User:", userData.full_name);
    console.log("   Role:", userData.role);
  }

  // Get instructor's courses
  console.log("\n3. Fetching instructor courses...");
  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select("id, title, course_code, course_type, is_active")
    .eq("instructor_id", userId);

  if (coursesError) {
    console.log("   ❌ Courses fetch failed:", coursesError.message);
  } else {
    console.log("   ✅ Found", courses?.length, "course(s):");
    courses?.forEach((c) => {
      console.log(`      - ${c.title} (${c.course_code}) - ${c.course_type}`);
    });
  }

  // Get enrollments for instructor's courses
  if (courses && courses.length > 0) {
    console.log("\n4. Fetching enrollments...");
    const courseIds = courses.map(c => c.id);
    const { data: enrollments, error: enrollError } = await supabase
      .from("enrollments")
      .select("id, status, student:users!enrollments_student_id_fkey(full_name)")
      .in("course_id", courseIds);

    if (enrollError) {
      console.log("   ❌ Enrollments fetch failed:", enrollError.message);
    } else {
      console.log("   ✅ Found", enrollments?.length, "enrollment(s):");
      enrollments?.forEach((e: any) => {
        console.log(`      - ${e.student?.full_name} (${e.status})`);
      });
    }
  }

  // Get submissions needing grading
  console.log("\n5. Fetching submissions needing grading...");
  const { data: submissions, error: subError } = await supabase
    .from("submissions")
    .select(`
      id, 
      status, 
      submitted_at,
      student:users!submissions_student_id_fkey(full_name),
      assignment:assignments(title)
    `)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false })
    .limit(5);

  if (subError) {
    console.log("   ❌ Submissions fetch failed:", subError.message);
  } else {
    console.log("   ✅ Found", submissions?.length, "pending submission(s):");
    submissions?.forEach((s: any) => {
      console.log(`      - ${s.assignment?.title} by ${s.student?.full_name}`);
    });
  }

  // Get clinical sites
  console.log("\n6. Fetching clinical sites...");
  const { data: sites, error: sitesError } = await supabase
    .from("clinical_sites")
    .select("id, name, site_type, is_active")
    .eq("tenant_id", userData?.tenant_id);

  if (sitesError) {
    console.log("   ❌ Sites fetch failed:", sitesError.message);
  } else {
    console.log("   ✅ Found", sites?.length, "clinical site(s):");
    sites?.forEach((s) => {
      console.log(`      - ${s.name} (${s.site_type})`);
    });
  }

  // Get upcoming shifts
  console.log("\n7. Fetching clinical shifts...");
  const { data: shifts, error: shiftsError } = await supabase
    .from("clinical_shifts")
    .select("id, title, shift_date, start_time, end_time, site:clinical_sites(name)")
    .gte("shift_date", new Date().toISOString().split("T")[0])
    .order("shift_date", { ascending: true })
    .limit(5);

  if (shiftsError) {
    console.log("   ❌ Shifts fetch failed:", shiftsError.message);
  } else {
    console.log("   ✅ Found", shifts?.length, "upcoming shift(s):");
    shifts?.forEach((s: any) => {
      console.log(`      - ${s.title} on ${s.shift_date} at ${s.site?.name}`);
    });
  }

  await supabase.auth.signOut();
  console.log("\n✨ Instructor dashboard test complete!");
}

testInstructorDashboard().catch(console.error);
