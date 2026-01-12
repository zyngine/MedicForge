/**
 * End-to-End Demo Flow Test
 *
 * Tests all major features of MedicForge using the demo data.
 * Run with: npx tsx scripts/test-demo-flow.ts
 */

import { createClient } from "@supabase/supabase-js";
import path from "path";

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function log(message: string) {
  console.log(message);
}

function pass(name: string, details: string) {
  results.push({ name, passed: true, details });
  console.log(`  ✅ ${name}: ${details}`);
}

function fail(name: string, details: string) {
  results.push({ name, passed: false, details });
  console.log(`  ❌ ${name}: ${details}`);
}

async function testTenantExists() {
  log("\n📦 Testing Tenant & Organization...");

  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("*")
    .ilike("slug", "metro-ems%")
    .single();

  if (error || !tenant) {
    fail("Demo Tenant", "Metro EMS Academy not found");
    return null;
  }

  pass("Demo Tenant", `Found: ${tenant.name} (${tenant.subscription_tier} tier)`);
  return tenant;
}

async function testUsersExist(tenantId: string) {
  log("\n👥 Testing Users...");

  // Test instructor
  const { data: instructor } = await supabase
    .from("users")
    .select("*")
    .eq("email", "demo.instructor@medicforge.com")
    .single();

  if (instructor) {
    pass("Demo Instructor", `${instructor.full_name} (${instructor.role})`);
  } else {
    fail("Demo Instructor", "Not found");
  }

  // Test students
  const { data: students } = await supabase
    .from("users")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("role", "student");

  if (students && students.length > 0) {
    pass("Demo Students", `${students.length} students found`);
  } else {
    fail("Demo Students", "No students found");
  }

  return { instructor, students };
}

async function testCoursesExist(tenantId: string) {
  log("\n📚 Testing Courses...");

  const { data: courses } = await supabase
    .from("courses")
    .select(`
      *,
      modules:modules(
        id, title,
        lessons:lessons(id, title)
      )
    `)
    .eq("tenant_id", tenantId);

  if (courses && courses.length > 0) {
    pass("Courses", `${courses.length} course(s) found`);

    for (const course of courses) {
      const moduleCount = course.modules?.length || 0;
      const lessonCount = course.modules?.reduce((sum: number, m: any) => sum + (m.lessons?.length || 0), 0) || 0;
      pass(`Course: ${course.title}`, `${moduleCount} modules, ${lessonCount} lessons`);
    }
  } else {
    fail("Courses", "No courses found");
  }

  return courses;
}

async function testEnrollmentsExist(tenantId: string) {
  log("\n🎓 Testing Enrollments...");

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
      *,
      student:users!enrollments_student_id_fkey(full_name),
      course:courses(title)
    `)
    .eq("tenant_id", tenantId);

  if (enrollments && enrollments.length > 0) {
    pass("Enrollments", `${enrollments.length} enrollment(s) found`);

    const active = enrollments.filter(e => e.status === "active").length;
    pass("Active Enrollments", `${active} students actively enrolled`);
  } else {
    fail("Enrollments", "No enrollments found");
  }

  return enrollments;
}

async function testAssignmentsExist(tenantId: string) {
  log("\n📝 Testing Assignments...");

  const { data: assignments } = await supabase
    .from("assignments")
    .select(`
      *,
      quiz_questions:quiz_questions(id)
    `)
    .eq("tenant_id", tenantId);

  if (assignments && assignments.length > 0) {
    pass("Assignments", `${assignments.length} assignment(s) found`);

    const quizzes = assignments.filter(a => a.type === "quiz");
    const written = assignments.filter(a => a.type === "written");

    if (quizzes.length > 0) {
      const totalQuestions = quizzes.reduce((sum, q) => sum + (q.quiz_questions?.length || 0), 0);
      pass("Quizzes", `${quizzes.length} quiz(zes) with ${totalQuestions} total questions`);
    }
    if (written.length > 0) {
      pass("Written Assignments", `${written.length} written assignment(s)`);
    }
  } else {
    fail("Assignments", "No assignments found");
  }

  return assignments;
}

async function testSubmissionsExist(tenantId: string) {
  log("\n📤 Testing Submissions & Grades...");

  const { data: submissions } = await supabase
    .from("submissions")
    .select(`
      *,
      student:users!submissions_student_id_fkey(full_name),
      assignment:assignments(title, points_possible)
    `)
    .eq("tenant_id", tenantId);

  if (submissions && submissions.length > 0) {
    pass("Submissions", `${submissions.length} submission(s) found`);

    const graded = submissions.filter(s => s.status === "graded");
    if (graded.length > 0) {
      const avgScore = graded.reduce((sum, s) => sum + (s.raw_score || 0), 0) / graded.length;
      pass("Graded Submissions", `${graded.length} graded, avg score: ${avgScore.toFixed(1)}`);
    }

    const curved = submissions.filter(s => s.curved_score !== null && s.curved_score !== s.raw_score);
    if (curved.length > 0) {
      pass("Curved Grades", `${curved.length} submission(s) have curved scores`);
    }
  } else {
    fail("Submissions", "No submissions found");
  }

  return submissions;
}

async function testClinicalData(tenantId: string) {
  log("\n🏥 Testing Clinical Scheduling...");

  // Sites
  const { data: sites } = await supabase
    .from("clinical_sites")
    .select("*")
    .eq("tenant_id", tenantId);

  if (sites && sites.length > 0) {
    pass("Clinical Sites", `${sites.length} site(s): ${sites.map(s => s.name).join(", ")}`);
  } else {
    fail("Clinical Sites", "No clinical sites found");
  }

  // Shifts
  const { data: shifts } = await supabase
    .from("clinical_shifts")
    .select("*")
    .eq("tenant_id", tenantId);

  if (shifts && shifts.length > 0) {
    const upcoming = shifts.filter(s => new Date(s.shift_date) >= new Date()).length;
    pass("Clinical Shifts", `${shifts.length} shift(s), ${upcoming} upcoming`);
  } else {
    fail("Clinical Shifts", "No clinical shifts found");
  }

  // Bookings
  const { data: bookings } = await supabase
    .from("clinical_shift_bookings")
    .select("*")
    .eq("tenant_id", tenantId);

  if (bookings && bookings.length > 0) {
    pass("Shift Bookings", `${bookings.length} booking(s)`);
  } else {
    fail("Shift Bookings", "No bookings found (may be expected)");
  }

  // Patient Contacts
  const { data: contacts } = await supabase
    .from("clinical_patient_contacts")
    .select("*")
    .eq("tenant_id", tenantId);

  if (contacts && contacts.length > 0) {
    pass("Patient Contacts", `${contacts.length} patient contact(s) logged`);
  } else {
    log("  ℹ️  Patient Contacts: None logged yet (expected for demo)");
  }
}

async function testCompetencyTracking(tenantId: string) {
  log("\n🎯 Testing NREMT Competency Tracking...");

  // Skill Categories
  const { data: categories } = await supabase
    .from("skill_categories")
    .select(`
      *,
      skills:skills(id, name)
    `)
    .eq("tenant_id", tenantId);

  if (categories && categories.length > 0) {
    const totalSkills = categories.reduce((sum, c) => sum + (c.skills?.length || 0), 0);
    pass("Skill Categories", `${categories.length} categories with ${totalSkills} skills`);
  } else {
    fail("Skill Categories", "No skill categories found");
  }

  // Skill Attempts
  const { data: attempts } = await supabase
    .from("skill_attempts")
    .select("*")
    .eq("tenant_id", tenantId);

  if (attempts && attempts.length > 0) {
    const passed = attempts.filter(a => a.status === "passed").length;
    pass("Skill Attempts", `${attempts.length} attempt(s), ${passed} passed`);
  } else {
    log("  ℹ️  Skill Attempts: None recorded yet (expected for demo)");
  }

  // Clinical Logs
  const { data: logs } = await supabase
    .from("clinical_logs")
    .select("*")
    .eq("tenant_id", tenantId);

  if (logs && logs.length > 0) {
    const totalHours = logs.reduce((sum, l) => sum + (l.hours || 0), 0);
    pass("Clinical Logs", `${logs.length} log(s), ${totalHours} total hours`);
  } else {
    log("  ℹ️  Clinical Logs: None recorded yet (expected for demo)");
  }
}

async function testDiscussions(tenantId: string) {
  log("\n💬 Testing Discussion Forums...");

  const { data: threads } = await supabase
    .from("discussion_threads")
    .select(`
      *,
      posts:discussion_posts(id)
    `)
    .eq("tenant_id", tenantId);

  if (threads && threads.length > 0) {
    const totalPosts = threads.reduce((sum, t) => sum + (t.posts?.length || 0), 0);
    pass("Discussion Threads", `${threads.length} thread(s) with ${totalPosts} post(s)`);
  } else {
    log("  ℹ️  Discussion Threads: None created yet (expected for demo)");
  }
}

async function testNotifications(tenantId: string) {
  log("\n🔔 Testing Notifications...");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("tenant_id", tenantId);

  if (notifications && notifications.length > 0) {
    const unread = notifications.filter(n => !n.is_read).length;
    pass("Notifications", `${notifications.length} notification(s), ${unread} unread`);
  } else {
    log("  ℹ️  Notifications: None yet (expected for demo)");
  }
}

async function runAllTests() {
  console.log("🧪 MedicForge End-to-End Demo Flow Test\n");
  console.log("=".repeat(50));

  try {
    // Test tenant
    const tenant = await testTenantExists();
    if (!tenant) {
      console.log("\n❌ Cannot proceed without demo tenant. Run seed script first:");
      console.log("   npx tsx scripts/seed-demo-data.ts\n");
      process.exit(1);
    }

    // Run all tests
    await testUsersExist(tenant.id);
    await testCoursesExist(tenant.id);
    await testEnrollmentsExist(tenant.id);
    await testAssignmentsExist(tenant.id);
    await testSubmissionsExist(tenant.id);
    await testClinicalData(tenant.id);
    await testCompetencyTracking(tenant.id);
    await testDiscussions(tenant.id);
    await testNotifications(tenant.id);

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 TEST SUMMARY\n");

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📈 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log("\n🔍 Failed Tests:");
      results.filter(r => !r.passed).forEach(r => {
        console.log(`   - ${r.name}: ${r.details}`);
      });
    }

    console.log("\n" + "=".repeat(50));

    if (failed === 0) {
      console.log("🎉 All tests passed! Demo is ready.\n");
      console.log("📱 Test in browser:");
      console.log("   1. Open http://localhost:3001/login");
      console.log("   2. Instructor: demo.instructor@medicforge.com / DemoPass123!");
      console.log("   3. Student: demo.student@medicforge.com / DemoPass123!\n");
    } else {
      console.log("⚠️  Some tests failed. Run seed script to fix:\n");
      console.log("   npx tsx scripts/seed-demo-data.ts\n");
    }

  } catch (error) {
    console.error("\n❌ Test error:", error);
    process.exit(1);
  }
}

runAllTests();
