/**
 * Test production authentication
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kftsdjuciwblaxfgvrku.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmdHNkanVjaXdibGF4Zmd2cmt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDQ0NDQsImV4cCI6MjA4MzQ4MDQ0NH0.MfJ_gdF4SEl5O2ZQp1z_End9A4TEUHy1fTjOOJzpWak";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  console.log("🔐 Testing Production Authentication\n");

  // Test instructor login
  console.log("1. Testing instructor login...");
  const { data: instructorData, error: instructorError } = await supabase.auth.signInWithPassword({
    email: "demo.instructor@medicforge.net",
    password: "DemoPass123!",
  });

  if (instructorError) {
    console.log("   ❌ Instructor login failed:", instructorError.message);
  } else {
    console.log("   ✅ Instructor login successful!");
    console.log("   User ID:", instructorData.user?.id);
    console.log("   Email:", instructorData.user?.email);

    // Sign out
    await supabase.auth.signOut();
  }

  // Test student login
  console.log("\n2. Testing student login...");
  const { data: studentData, error: studentError } = await supabase.auth.signInWithPassword({
    email: "demo.student@medicforge.net",
    password: "DemoPass123!",
  });

  if (studentError) {
    console.log("   ❌ Student login failed:", studentError.message);
  } else {
    console.log("   ✅ Student login successful!");
    console.log("   User ID:", studentData.user?.id);
    console.log("   Email:", studentData.user?.email);

    // Test fetching user data
    console.log("\n3. Testing data access...");
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("full_name, role, tenant_id")
      .eq("id", studentData.user?.id)
      .single();

    if (userError) {
      console.log("   ❌ User data fetch failed:", userError.message);
    } else {
      console.log("   ✅ User data fetched!");
      console.log("   Name:", userData.full_name);
      console.log("   Role:", userData.role);
    }

    // Test fetching enrollments
    const { data: enrollments, error: enrollError } = await supabase
      .from("enrollments")
      .select("id, status, course:courses(title)")
      .eq("student_id", studentData.user?.id);

    if (enrollError) {
      console.log("   ❌ Enrollments fetch failed:", enrollError.message);
    } else {
      console.log("   ✅ Enrollments fetched:", enrollments?.length, "enrollment(s)");
    }

    await supabase.auth.signOut();
  }

  console.log("\n✨ Authentication test complete!");
}

testAuth().catch(console.error);
