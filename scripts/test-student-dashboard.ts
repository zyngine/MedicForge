/**
 * Test student dashboard data after demo login
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://kftsdjuciwblaxfgvrku.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmdHNkanVjaXdibGF4Zmd2cmt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MDQ0NDQsImV4cCI6MjA4MzQ4MDQ0NH0.MfJ_gdF4SEl5O2ZQp1z_End9A4TEUHy1fTjOOJzpWak";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testStudentDashboard() {
  console.log("📚 Testing Student Dashboard Data\n");

  // Login as student
  console.log("1. Logging in as student...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "demo.student@medicforge.net",
    password: "DemoPass123!",
  });

  if (authError) {
    console.log("   ❌ Login failed:", authError.message);
    return;
  }
  console.log("   ✅ Logged in as:", authData.user?.email);

  const userId = authData.user?.id;

  // Get user profile
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

  // Get student's enrollments with course info
  console.log("\n3. Fetching enrolled courses...");
  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select(`
      id, 
      status, 
      completion_percentage,
      course:courses(id, title, course_code, course_type, instructor:users!courses_instructor_id_fkey(full_name))
    `)
    .eq("student_id", userId);

  if (enrollError) {
    console.log("   ❌ Enrollments fetch failed:", enrollError.message);
  } else {
    console.log("   ✅ Enrolled in", enrollments?.length, "course(s):");
    enrollments?.forEach((e: any) => {
      console.log(`      - ${e.course?.title} (${e.course?.course_code})`);
      console.log(`        Instructor: ${e.course?.instructor?.full_name}`);
      console.log(`        Progress: ${e.completion_percentage || 0}%`);
    });
  }

  // Get upcoming assignments
  console.log("\n4. Fetching upcoming assignments...");
  const courseIds = enrollments?.map((e: any) => e.course?.id).filter(Boolean) || [];
  
  if (courseIds.length > 0) {
    const { data: assignments, error: assignError } = await supabase
      .from("assignments")
      .select(`
        id, 
        title, 
        type, 
        due_date, 
        points_possible,
        module:modules(course_id)
      `)
      .gte("due_date", new Date().toISOString())
      .order("due_date", { ascending: true })
      .limit(5);

    if (assignError) {
      console.log("   ❌ Assignments fetch failed:", assignError.message);
    } else {
      console.log("   ✅ Found", assignments?.length, "upcoming assignment(s):");
      assignments?.forEach((a: any) => {
        console.log(`      - ${a.title} (${a.type}) - Due: ${a.due_date?.split("T")[0]}`);
        console.log(`        Points: ${a.points_possible}`);
      });
    }
  }

  // Get student's submissions
  console.log("\n5. Fetching submissions...");
  const { data: submissions, error: subError } = await supabase
    .from("submissions")
    .select(`
      id, 
      status, 
      final_score,
      submitted_at,
      assignment:assignments(title, points_possible)
    `)
    .eq("student_id", userId)
    .order("submitted_at", { ascending: false })
    .limit(5);

  if (subError) {
    console.log("   ❌ Submissions fetch failed:", subError.message);
  } else {
    console.log("   ✅ Found", submissions?.length, "submission(s):");
    submissions?.forEach((s: any) => {
      const score = s.final_score !== null ? `${s.final_score}/${s.assignment?.points_possible}` : "Not graded";
      console.log(`      - ${s.assignment?.title}: ${score} (${s.status})`);
    });
  }

  // Get clinical shift bookings
  console.log("\n6. Fetching clinical shift bookings...");
  const { data: bookings, error: bookingsError } = await supabase
    .from("clinical_shift_bookings")
    .select(`
      id, 
      status,
      shift:clinical_shifts(title, shift_date, start_time, end_time, site:clinical_sites(name))
    `)
    .eq("student_id", userId)
    .order("created_at", { ascending: false });

  if (bookingsError) {
    console.log("   ❌ Bookings fetch failed:", bookingsError.message);
  } else {
    console.log("   ✅ Found", bookings?.length, "shift booking(s):");
    bookings?.forEach((b: any) => {
      console.log(`      - ${b.shift?.title} on ${b.shift?.shift_date} at ${b.shift?.site?.name} (${b.status})`);
    });
  }

  // Get patient contacts
  console.log("\n7. Fetching patient contacts...");
  const { data: contacts, error: contactsError } = await supabase
    .from("clinical_patient_contacts")
    .select("id, chief_complaint, patient_age_range, created_at")
    .eq("student_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (contactsError) {
    console.log("   ❌ Patient contacts fetch failed:", contactsError.message);
  } else {
    console.log("   ✅ Found", contacts?.length, "patient contact(s):");
    contacts?.forEach((c) => {
      console.log(`      - ${c.chief_complaint} (${c.patient_age_range})`);
    });
  }

  // Get skill attempts
  console.log("\n8. Fetching skill attempts...");
  const { data: skillAttempts, error: skillsError } = await supabase
    .from("skill_attempts")
    .select(`
      id, 
      status,
      skill:skills(name, category:skill_categories(name))
    `)
    .eq("student_id", userId)
    .order("evaluated_at", { ascending: false })
    .limit(5);

  if (skillsError) {
    console.log("   ❌ Skill attempts fetch failed:", skillsError.message);
  } else {
    console.log("   ✅ Found", skillAttempts?.length, "skill attempt(s):");
    skillAttempts?.forEach((s: any) => {
      console.log(`      - ${s.skill?.name} (${s.skill?.category?.name}): ${s.status}`);
    });
  }

  // Get discussion threads
  console.log("\n9. Fetching discussion activity...");
  const { data: threads, error: threadsError } = await supabase
    .from("discussion_threads")
    .select("id, title, created_at")
    .order("created_at", { ascending: false })
    .limit(3);

  if (threadsError) {
    console.log("   ❌ Threads fetch failed:", threadsError.message);
  } else {
    console.log("   ✅ Found", threads?.length, "discussion thread(s):");
    threads?.forEach((t) => {
      console.log(`      - ${t.title}`);
    });
  }

  await supabase.auth.signOut();
  console.log("\n✨ Student dashboard test complete!");
}

testStudentDashboard().catch(console.error);
