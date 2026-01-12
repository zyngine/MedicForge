/**
 * Seed Demo Data for MedicForge
 *
 * This script creates demo accounts and sample data for institutions to explore.
 * Run with: npx tsx scripts/seed-demo-data.ts
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/supabase";
import path from "path";

// Load environment variables from the project root
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Demo credentials
const DEMO_PASSWORD = "DemoPass123!";

const DEMO_INSTRUCTOR = {
  email: "demo.instructor@medicforge.net",
  name: "Dr. Sarah Johnson",
};

const DEMO_STUDENTS = [
  { email: "demo.student@medicforge.net", name: "Michael Chen", progress: 65 },
  { email: "emily.davis@medicforge.net", name: "Emily Davis", progress: 85 },
  { email: "james.wilson@medicforge.net", name: "James Wilson", progress: 45 },
  { email: "sophia.martinez@medicforge.net", name: "Sophia Martinez", progress: 92 },
  { email: "david.brown@medicforge.net", name: "David Brown", progress: 30 },
  { email: "olivia.taylor@medicforge.net", name: "Olivia Taylor", progress: 78 },
  { email: "noah.anderson@medicforge.net", name: "Noah Anderson", progress: 55 },
  { email: "ava.thomas@medicforge.net", name: "Ava Thomas", progress: 88 },
];

async function createOrGetUser(
  email: string,
  name: string,
  tenantId: string,
  role: "instructor" | "student"
): Promise<string> {
  // Check if user already exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (existingUser) {
    return existingUser.id;
  }

  // Create in Supabase Auth
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: name,
      demo_account: true,
    },
  });

  if (authError) throw authError;

  // Create user profile
  await supabase.from("users").insert({
    id: authUser.user.id,
    tenant_id: tenantId,
    email,
    full_name: name,
    role,
  });

  return authUser.user.id;
}

async function seedDemoData() {
  console.log("🌱 Seeding demo data for MedicForge...\n");

  try {
    // 1. Create demo tenant
    console.log("Creating demo tenant...");
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .upsert({
        name: "Metro EMS Academy",
        slug: "metro-ems-demo",
        primary_color: "#1e40af",
        subscription_tier: "pro",
        subscription_status: "active",
        settings: {
          demo: true,
          features: ["all"],
        },
      }, { onConflict: "slug" })
      .select()
      .single();

    if (tenantError) throw tenantError;
    console.log(`  ✓ Tenant created: ${tenant.name} (${tenant.id})`);

    // 2. Create demo instructor
    console.log("\nCreating demo instructor...");
    const instructorId = await createOrGetUser(
      DEMO_INSTRUCTOR.email,
      DEMO_INSTRUCTOR.name,
      tenant.id,
      "instructor"
    );
    console.log(`  ✓ Instructor: ${DEMO_INSTRUCTOR.email}`);

    // 3. Create demo students
    console.log("\nCreating demo students...");
    const studentIds: string[] = [];
    for (const student of DEMO_STUDENTS) {
      const studentId = await createOrGetUser(
        student.email,
        student.name,
        tenant.id,
        "student"
      );
      studentIds.push(studentId);
      console.log(`  ✓ Student: ${student.email}`);
    }

    // 4. Create demo courses
    console.log("\nCreating demo courses...");
    const courses = [
      {
        tenant_id: tenant.id,
        title: "EMT Basic - Spring 2024",
        description: "Comprehensive EMT certification course covering all NREMT requirements including patient assessment, airway management, trauma care, and medical emergencies.",
        course_code: "EMT-101",
        course_type: "EMT" as const,
        instructor_id: instructorId,
        enrollment_code: "DEMO-EMT",
        start_date: "2024-01-15",
        end_date: "2024-05-15",
        max_students: 40,
        is_active: true,
      },
      {
        tenant_id: tenant.id,
        title: "Paramedic - Fall 2024",
        description: "Advanced paramedic training program with clinical rotations and advanced life support procedures.",
        course_code: "PARA-201",
        course_type: "Paramedic" as const,
        instructor_id: instructorId,
        enrollment_code: "DEMO-PARA",
        start_date: "2024-08-20",
        end_date: "2025-05-20",
        max_students: 30,
        is_active: true,
      },
    ];

    const { data: createdCourses, error: courseError } = await supabase
      .from("courses")
      .upsert(courses, { onConflict: "tenant_id,enrollment_code" })
      .select();

    if (courseError) throw courseError;
    console.log(`  ✓ Created ${createdCourses.length} courses`);

    const emtCourse = createdCourses.find(c => c.enrollment_code === "DEMO-EMT")!;

    // 5. Enroll all students in EMT course with varied progress
    console.log("\nEnrolling demo students...");
    for (let i = 0; i < studentIds.length; i++) {
      await supabase.from("enrollments").upsert({
        tenant_id: tenant.id,
        course_id: emtCourse.id,
        student_id: studentIds[i],
        status: "active",
        completion_percentage: DEMO_STUDENTS[i].progress,
      }, { onConflict: "course_id,student_id" });
    }
    console.log(`  ✓ Enrolled ${studentIds.length} students`);

    // 6. Create modules for EMT course
    console.log("\nCreating course modules...");
    const modules = [
      { title: "Introduction to EMS", description: "Overview of emergency medical services and the EMT role", order_index: 1, is_published: true },
      { title: "Medical, Legal, and Ethical Issues", description: "Understanding legal responsibilities and ethical considerations", order_index: 2, is_published: true },
      { title: "Patient Assessment", description: "Comprehensive patient assessment techniques", order_index: 3, is_published: true },
      { title: "Airway Management", description: "Airway assessment and management techniques", order_index: 4, is_published: true },
      { title: "Cardiac Emergencies", description: "Recognition and management of cardiac emergencies", order_index: 5, is_published: false },
    ];

    // Delete existing modules first to avoid conflicts
    await supabase.from("modules").delete().eq("course_id", emtCourse.id);

    const { data: createdModules, error: moduleError } = await supabase
      .from("modules")
      .insert(modules.map(m => ({ ...m, tenant_id: tenant.id, course_id: emtCourse.id })))
      .select();

    if (moduleError) throw moduleError;
    console.log(`  ✓ Created ${createdModules.length} modules`);

    // 7. Create lessons
    console.log("\nCreating lessons...");
    const lessons = [
      { module_id: createdModules[0].id, title: "Welcome to EMT Basic", content_type: "video" as const, duration_minutes: 10, order_index: 1, is_published: true },
      { module_id: createdModules[0].id, title: "History of EMS", content_type: "document" as const, duration_minutes: 15, order_index: 2, is_published: true },
      { module_id: createdModules[0].id, title: "EMS Systems Overview", content_type: "video" as const, duration_minutes: 20, order_index: 3, is_published: true },
      { module_id: createdModules[1].id, title: "Consent and Refusal", content_type: "video" as const, duration_minutes: 15, order_index: 1, is_published: true },
      { module_id: createdModules[1].id, title: "Documentation Best Practices", content_type: "document" as const, duration_minutes: 20, order_index: 2, is_published: true },
      { module_id: createdModules[2].id, title: "Scene Size-Up", content_type: "video" as const, duration_minutes: 18, order_index: 1, is_published: true },
      { module_id: createdModules[2].id, title: "Primary Assessment", content_type: "video" as const, duration_minutes: 25, order_index: 2, is_published: true },
      { module_id: createdModules[2].id, title: "Secondary Assessment", content_type: "video" as const, duration_minutes: 30, order_index: 3, is_published: true },
    ];

    await supabase.from("lessons").insert(lessons.map(l => ({ ...l, tenant_id: tenant.id })));
    console.log(`  ✓ Created ${lessons.length} lessons`);

    // 8. Create assignments
    console.log("\nCreating assignments...");
    const assignments = [
      {
        tenant_id: tenant.id,
        module_id: createdModules[0].id,
        title: "Module 1 Quiz - Introduction to EMS",
        description: "Test your knowledge of EMS systems and EMT responsibilities.",
        type: "quiz" as const,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        points_possible: 100,
        time_limit_minutes: 30,
        attempts_allowed: 2,
        is_published: true,
      },
      {
        tenant_id: tenant.id,
        module_id: createdModules[1].id,
        title: "Written Assignment - Legal Scenarios",
        description: "Analyze three legal scenarios and explain the appropriate EMT response.",
        type: "written" as const,
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        points_possible: 75,
        is_published: true,
      },
      {
        tenant_id: tenant.id,
        module_id: createdModules[2].id,
        title: "Module 3 Quiz - Patient Assessment",
        description: "Comprehensive quiz on patient assessment techniques.",
        type: "quiz" as const,
        due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        points_possible: 100,
        time_limit_minutes: 45,
        attempts_allowed: 1,
        is_published: true,
      },
      {
        tenant_id: tenant.id,
        module_id: createdModules[2].id,
        title: "Skill Checklist - Vital Signs",
        description: "Demonstrate proper vital signs assessment technique.",
        type: "skill_checklist" as const,
        due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        points_possible: 100,
        is_published: true,
      },
    ];

    const { data: createdAssignments } = await supabase
      .from("assignments")
      .insert(assignments)
      .select();

    console.log(`  ✓ Created ${createdAssignments?.length || 0} assignments`);

    // 9. Create quiz questions
    if (createdAssignments) {
      console.log("\nCreating quiz questions...");
      const quiz1 = createdAssignments.find(a => a.title.includes("Module 1 Quiz"));

      if (quiz1) {
        const questions = [
          {
            tenant_id: tenant.id,
            assignment_id: quiz1.id,
            question_text: "What is the primary role of an EMT?",
            question_type: "multiple_choice" as const,
            options: JSON.stringify([
              "Perform surgery in the field",
              "Provide emergency medical care and transport",
              "Diagnose medical conditions",
              "Prescribe medications"
            ]),
            correct_answer: JSON.stringify(1),
            points: 10,
            order_index: 1,
            explanation: "EMTs provide emergency medical care and transport patients to healthcare facilities.",
          },
          {
            tenant_id: tenant.id,
            assignment_id: quiz1.id,
            question_text: "The EMS system includes which of the following components?",
            question_type: "multiple_choice" as const,
            options: JSON.stringify([
              "Only ambulances",
              "Only hospitals",
              "Public access, clinical services, and support services",
              "Only fire departments"
            ]),
            correct_answer: JSON.stringify(2),
            points: 10,
            order_index: 2,
          },
          {
            tenant_id: tenant.id,
            assignment_id: quiz1.id,
            question_text: "EMTs must maintain patient confidentiality at all times.",
            question_type: "true_false" as const,
            options: JSON.stringify(["True", "False"]),
            correct_answer: JSON.stringify(0),
            points: 10,
            order_index: 3,
            explanation: "HIPAA requires all healthcare providers to maintain patient confidentiality.",
          },
        ];

        await supabase.from("quiz_questions").insert(questions);
        console.log(`  ✓ Created ${questions.length} quiz questions`);
      }

      // 10. Create sample submissions with varied grades
      console.log("\nCreating sample submissions...");
      const grades = [95, 88, 72, 98, 65, 82, 78, 91];

      for (let i = 0; i < studentIds.length; i++) {
        if (quiz1 && DEMO_STUDENTS[i].progress > 40) {
          await supabase.from("submissions").insert({
            tenant_id: tenant.id,
            assignment_id: quiz1.id,
            student_id: studentIds[i],
            attempt_number: 1,
            content: JSON.stringify({ answers: [1, 2, 0] }),
            submitted_at: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
            status: "graded",
            raw_score: grades[i],
            final_score: grades[i],
            graded_by: instructorId,
            graded_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
            feedback: JSON.stringify({ comment: grades[i] >= 90 ? "Excellent work!" : grades[i] >= 80 ? "Good job!" : "Keep studying!" }),
          });
        }
      }
      console.log(`  ✓ Created sample submissions`);
    }

    // 11. Create skill categories for NREMT tracking
    console.log("\nCreating NREMT skill categories...");

    // Delete existing categories first
    await supabase.from("skill_categories").delete().eq("tenant_id", tenant.id);

    const skillCategories = [
      { name: "Airway Management", description: "Airway assessment and management skills", required_count: 5, course_type: "EMT" as const },
      { name: "Patient Assessment", description: "Medical and trauma patient assessment", required_count: 10, course_type: "EMT" as const },
      { name: "Cardiac Care", description: "CPR, AED, and cardiac monitoring", required_count: 5, course_type: "EMT" as const },
      { name: "Trauma Care", description: "Bleeding control, splinting, spinal immobilization", required_count: 5, course_type: "EMT" as const },
      { name: "Medical Emergencies", description: "Diabetic, allergic, respiratory emergencies", required_count: 5, course_type: "EMT" as const },
    ];

    const { data: createdCategories } = await supabase
      .from("skill_categories")
      .insert(skillCategories.map(s => ({ ...s, tenant_id: tenant.id, is_active: true })))
      .select();

    console.log(`  ✓ Created ${createdCategories?.length || 0} skill categories`);

    // 12. Create skills within categories
    if (createdCategories) {
      console.log("\nCreating skills...");
      const skills = [
        // Airway Management
        { category_id: createdCategories[0].id, name: "OPA Insertion", description: "Oropharyngeal airway insertion" },
        { category_id: createdCategories[0].id, name: "NPA Insertion", description: "Nasopharyngeal airway insertion" },
        { category_id: createdCategories[0].id, name: "Suctioning", description: "Airway suctioning technique" },
        { category_id: createdCategories[0].id, name: "BVM Ventilation", description: "Bag-valve-mask ventilation" },
        { category_id: createdCategories[0].id, name: "Oxygen Administration", description: "Oxygen delivery devices" },
        // Patient Assessment
        { category_id: createdCategories[1].id, name: "Primary Assessment", description: "ABCDE assessment" },
        { category_id: createdCategories[1].id, name: "Secondary Assessment", description: "Head-to-toe assessment" },
        { category_id: createdCategories[1].id, name: "Vital Signs", description: "Complete vital signs assessment" },
        { category_id: createdCategories[1].id, name: "History Taking", description: "SAMPLE history" },
        { category_id: createdCategories[1].id, name: "Blood Glucose", description: "Blood glucose monitoring" },
        // Cardiac Care
        { category_id: createdCategories[2].id, name: "CPR Adult", description: "Adult CPR technique" },
        { category_id: createdCategories[2].id, name: "CPR Infant", description: "Infant CPR technique" },
        { category_id: createdCategories[2].id, name: "AED Use", description: "Automated external defibrillator" },
        // Trauma Care
        { category_id: createdCategories[3].id, name: "Bleeding Control", description: "Direct pressure and tourniquet" },
        { category_id: createdCategories[3].id, name: "Splinting", description: "Extremity splinting" },
        { category_id: createdCategories[3].id, name: "Spinal Immobilization", description: "C-spine and backboard" },
        // Medical Emergencies
        { category_id: createdCategories[4].id, name: "Epinephrine Auto-Injector", description: "EpiPen administration" },
        { category_id: createdCategories[4].id, name: "Oral Glucose", description: "Oral glucose administration" },
        { category_id: createdCategories[4].id, name: "Nebulizer Treatment", description: "Nebulizer administration" },
      ];

      const { data: createdSkills } = await supabase
        .from("skills")
        .insert(skills.map(s => ({ ...s, tenant_id: tenant.id })))
        .select();

      console.log(`  ✓ Created ${createdSkills?.length || 0} skills`);

      // 13. Create skill attempts for students
      if (createdSkills) {
        console.log("\nCreating skill attempts...");
        let attemptCount = 0;

        for (let i = 0; i < studentIds.length; i++) {
          const numSkills = Math.floor(DEMO_STUDENTS[i].progress / 10);

          for (let j = 0; j < numSkills && j < createdSkills.length; j++) {
            const status = Math.random() > 0.2 ? "passed" : "needs_practice";
            await supabase.from("skill_attempts").insert({
              tenant_id: tenant.id,
              skill_id: createdSkills[j].id,
              student_id: studentIds[i],
              course_id: emtCourse.id,
              evaluator_id: instructorId,
              attempt_number: 1,
              status: status as any,
              notes: status === "passed" ? "Good technique" : "Needs more practice",
              evaluated_at: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
            });
            attemptCount++;
          }
        }
        console.log(`  ✓ Created ${attemptCount} skill attempts`);
      }
    }

    // 14. Create clinical sites
    console.log("\nCreating clinical sites...");

    // Clean up existing clinical data for this tenant (for re-runs)
    await supabase.from("clinical_shift_bookings").delete().eq("tenant_id", tenant.id);
    await supabase.from("clinical_shifts").delete().eq("tenant_id", tenant.id);
    await supabase.from("clinical_sites").delete().eq("tenant_id", tenant.id);

    const clinicalSites = [
      {
        tenant_id: tenant.id,
        name: "Metro General Hospital",
        site_type: "hospital" as const,
        address: "123 Medical Center Drive",
        city: "Metro City",
        state: "CA",
        zip: "90210",
        phone: "(555) 123-4567",
        contact_name: "Nurse Manager Williams",
        contact_email: "williams@metrogeneral.com",
        preceptors: JSON.stringify([
          { name: "Dr. Amanda Roberts", credentials: "MD, FACEP", phone: "(555) 123-4568" },
          { name: "Sarah Chen, RN", credentials: "BSN, CEN", phone: "(555) 123-4569" },
        ]),
        is_active: true,
      },
      {
        tenant_id: tenant.id,
        name: "Metro Ambulance Service",
        site_type: "ambulance_service" as const,
        address: "456 First Responder Way",
        city: "Metro City",
        state: "CA",
        zip: "90211",
        phone: "(555) 234-5678",
        contact_name: "Captain Mike Johnson",
        contact_email: "mjohnson@metroambulance.com",
        preceptors: JSON.stringify([
          { name: "Paramedic James Wilson", credentials: "NRP", phone: "(555) 234-5679" },
          { name: "Paramedic Lisa Park", credentials: "NRP", phone: "(555) 234-5680" },
        ]),
        is_active: true,
      },
      {
        tenant_id: tenant.id,
        name: "Central Fire Station #1",
        site_type: "fire_department" as const,
        address: "789 Fire Lane",
        city: "Metro City",
        state: "CA",
        zip: "90212",
        phone: "(555) 345-6789",
        contact_name: "Chief Rodriguez",
        contact_email: "rodriguez@metrofd.gov",
        preceptors: JSON.stringify([
          { name: "FF/PM Tom Bradley", credentials: "NRP, FPC", phone: "(555) 345-6790" },
        ]),
        is_active: true,
      },
    ];

    const { data: createdSites, error: sitesError } = await supabase
      .from("clinical_sites")
      .insert(clinicalSites)
      .select();

    if (sitesError) {
      console.error("  ✗ Error creating clinical sites:", sitesError.message);
    } else {
      console.log(`  ✓ Created ${createdSites?.length || 0} clinical sites`);
    }

    // 15. Create clinical shifts
    if (createdSites) {
      console.log("\nCreating clinical shifts...");
      const shifts = [];
      const today = new Date();

      for (const site of createdSites) {
        // Create shifts for the next 14 days
        for (let day = 1; day <= 14; day++) {
          const shiftDate = new Date(today);
          shiftDate.setDate(today.getDate() + day);
          const dateStr = shiftDate.toISOString().split("T")[0];

          // Day shift
          shifts.push({
            tenant_id: tenant.id,
            site_id: site.id,
            course_id: emtCourse.id,
            title: "Day Shift",
            shift_date: dateStr,
            start_time: "07:00",
            end_time: "19:00",
            capacity: 2,
            created_by: instructorId,
            is_active: true,
          });

          // Night shift (every other day)
          if (day % 2 === 0) {
            shifts.push({
              tenant_id: tenant.id,
              site_id: site.id,
              course_id: emtCourse.id,
              title: "Night Shift",
              shift_date: dateStr,
              start_time: "19:00",
              end_time: "07:00",
              capacity: 2,
              created_by: instructorId,
              is_active: true,
            });
          }
        }
      }

      await supabase.from("clinical_shifts").insert(shifts);
      console.log(`  ✓ Created ${shifts.length} clinical shifts`);

      // 16. Book some shifts for students
      const { data: allShifts } = await supabase
        .from("clinical_shifts")
        .select("*")
        .eq("tenant_id", tenant.id)
        .limit(20);

      if (allShifts) {
        console.log("\nBooking clinical shifts for students...");
        let bookingCount = 0;

        for (let i = 0; i < Math.min(studentIds.length, allShifts.length); i++) {
          await supabase.from("clinical_shift_bookings").insert({
            tenant_id: tenant.id,
            shift_id: allShifts[i].id,
            student_id: studentIds[i % studentIds.length],
            status: i < 3 ? "completed" : "booked",
            booked_at: new Date().toISOString(),
            hours_completed: i < 3 ? 12 : null,
          });
          bookingCount++;
        }
        console.log(`  ✓ Created ${bookingCount} shift bookings`);
      }
    }

    // 17. Create clinical log entries
    console.log("\nCreating clinical log entries...");
    const clinicalLogs = [];

    for (let i = 0; i < studentIds.length; i++) {
      const numLogs = Math.floor(DEMO_STUDENTS[i].progress / 15);

      for (let j = 0; j < numLogs; j++) {
        const logType: "hours" | "patient_contact" = j % 3 === 0 ? "patient_contact" : "hours";
        const verificationStatus: "pending" | "verified" | "rejected" = j < 2 ? "verified" : "pending";
        clinicalLogs.push({
          tenant_id: tenant.id,
          student_id: studentIds[i],
          course_id: emtCourse.id,
          log_type: logType,
          date: new Date(Date.now() - (j + 1) * 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          hours: j % 3 === 0 ? null : 6 + Math.floor(Math.random() * 6),
          site_name: ["Metro General Hospital", "Metro Ambulance Service", "Central Fire Station #1"][j % 3],
          site_type: ["hospital", "ambulance_service", "fire_department"][j % 3],
          supervisor_name: ["Dr. Williams", "Paramedic Johnson", "FF/PM Bradley"][j % 3],
          supervisor_credentials: ["MD", "NRP", "NRP"][j % 3],
          verification_status: verificationStatus,
          patient_info: j % 3 === 0 ? JSON.stringify({
            ageGroup: ["adult", "geriatric", "adolescent"][j % 3],
            chiefComplaint: ["Chest Pain", "Shortness of Breath", "Fall"][j % 3],
            impression: ["Cardiac", "Respiratory", "Trauma"][j % 3],
          }) : null,
          was_team_lead: j === 0,
          skills_performed: JSON.stringify(["Patient Assessment", "Vital Signs"]),
        });
      }
    }

    await supabase.from("clinical_logs").insert(clinicalLogs);
    console.log(`  ✓ Created ${clinicalLogs.length} clinical log entries`);

    // 18. Create discussion threads and posts
    console.log("\nCreating discussion threads...");
    const threads = [
      {
        tenant_id: tenant.id,
        course_id: emtCourse.id,
        title: "Tips for remembering drug dosages?",
        content: "Hey everyone! I'm struggling with memorizing all the medication dosages for the exam. Does anyone have any good mnemonics or study tips they can share?",
        author_id: studentIds[0],
        is_pinned: false,
        is_locked: false,
      },
      {
        tenant_id: tenant.id,
        course_id: emtCourse.id,
        title: "Study Group - Module 3 Review",
        content: "I'm organizing a virtual study group for the Module 3 Patient Assessment quiz. We'll be meeting this Saturday at 2 PM via Zoom. Reply if you're interested!",
        author_id: studentIds[1],
        is_pinned: true,
        is_locked: false,
      },
      {
        tenant_id: tenant.id,
        course_id: emtCourse.id,
        title: "Welcome to EMT Basic!",
        content: "Welcome to the EMT Basic course! This discussion board is for asking questions, sharing resources, and connecting with your classmates. Please be respectful and helpful to each other.",
        author_id: instructorId,
        is_pinned: true,
        is_locked: false,
      },
      {
        tenant_id: tenant.id,
        course_id: emtCourse.id,
        title: "Clinical site recommendations?",
        content: "Has anyone done clinical hours at Metro General? I'm trying to decide between there and the ambulance service. What was your experience like?",
        author_id: studentIds[2],
        is_pinned: false,
        is_locked: false,
      },
    ];

    const { data: createdThreads } = await supabase
      .from("discussion_threads")
      .insert(threads)
      .select();

    console.log(`  ✓ Created ${createdThreads?.length || 0} discussion threads`);

    // 19. Create discussion posts (replies)
    if (createdThreads) {
      console.log("\nCreating discussion posts...");
      const posts = [
        // Replies to "Tips for remembering drug dosages"
        {
          tenant_id: tenant.id,
          thread_id: createdThreads[0].id,
          content: "I use flashcards with spaced repetition! There's a great app called Anki that helps with this. I can share my deck if anyone wants it.",
          author_id: studentIds[3],
          upvotes: 5,
        },
        {
          tenant_id: tenant.id,
          thread_id: createdThreads[0].id,
          content: "The instructor shared a great mnemonic in class for epi dosages. Check the Module 3 notes!",
          author_id: studentIds[5],
          upvotes: 3,
        },
        // Replies to study group
        {
          tenant_id: tenant.id,
          thread_id: createdThreads[1].id,
          content: "Count me in! I'll be there.",
          author_id: studentIds[4],
          upvotes: 1,
        },
        {
          tenant_id: tenant.id,
          thread_id: createdThreads[1].id,
          content: "Thanks for organizing this! Can you share the Zoom link?",
          author_id: studentIds[6],
          upvotes: 0,
        },
        // Reply to clinical site question
        {
          tenant_id: tenant.id,
          thread_id: createdThreads[3].id,
          content: "I did my hours at Metro General and loved it! The ER gets a good variety of calls. The staff are very welcoming to students.",
          author_id: studentIds[7],
          upvotes: 4,
        },
      ];

      await supabase.from("discussion_posts").insert(posts);
      console.log(`  ✓ Created ${posts.length} discussion posts`);
    }

    // 20. Create announcements
    console.log("\nCreating announcements...");
    const announcements = [
      {
        tenant_id: tenant.id,
        course_id: emtCourse.id,
        title: "Midterm Exam Schedule Posted",
        content: "The midterm exam is scheduled for next Friday at 9 AM in Room 201. Please arrive 15 minutes early. Bring your student ID and two #2 pencils. Good luck!",
        author_id: instructorId,
        is_pinned: true,
      },
      {
        tenant_id: tenant.id,
        course_id: emtCourse.id,
        title: "New Clinical Site Added",
        content: "We've added Central Fire Station #1 as a new clinical site option. They have day and night shifts available. Check the clinical scheduling page to book your hours.",
        author_id: instructorId,
        is_pinned: false,
      },
      {
        tenant_id: tenant.id,
        course_id: emtCourse.id,
        title: "Skills Lab This Saturday",
        content: "Reminder: Open skills lab this Saturday from 10 AM - 2 PM. This is a great opportunity to practice for your practical exams. Attendance is optional but highly recommended.",
        author_id: instructorId,
        is_pinned: false,
      },
    ];

    await supabase.from("announcements").insert(announcements);
    console.log(`  ✓ Created ${announcements.length} announcements`);

    // Done!
    console.log("\n" + "=".repeat(60));
    console.log("✅ Demo data seeded successfully!");
    console.log("=".repeat(60));
    console.log("\n📧 Demo Accounts:");
    console.log(`\n  Instructor Login:`);
    console.log(`    Email: ${DEMO_INSTRUCTOR.email}`);
    console.log(`    Password: ${DEMO_PASSWORD}`);
    console.log(`\n  Primary Student Login:`);
    console.log(`    Email: ${DEMO_STUDENTS[0].email}`);
    console.log(`    Password: ${DEMO_PASSWORD}`);
    console.log(`\n  Additional Students (${DEMO_STUDENTS.length - 1} more):`);
    for (let i = 1; i < DEMO_STUDENTS.length; i++) {
      console.log(`    - ${DEMO_STUDENTS[i].name}: ${DEMO_STUDENTS[i].email}`);
    }
    console.log(`\n  Enrollment Code: DEMO-EMT`);
    console.log("\n📊 Demo Data Summary:");
    console.log(`    - 1 Instructor`);
    console.log(`    - ${DEMO_STUDENTS.length} Students (varied progress)`);
    console.log(`    - 2 Courses`);
    console.log(`    - 5 Modules with lessons`);
    console.log(`    - 4 Assignments with quiz questions`);
    console.log(`    - 5 Skill categories with skills`);
    console.log(`    - 3 Clinical sites with shifts`);
    console.log(`    - Discussion threads and posts`);
    console.log(`    - Announcements`);
    console.log("\n");

  } catch (error) {
    console.error("Error seeding demo data:", error);
    process.exit(1);
  }
}

seedDemoData();
