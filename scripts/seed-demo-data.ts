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

const DEMO_ACCOUNTS = {
  instructor: {
    email: "demo.instructor@medicforge.com",
    name: "Dr. Sarah Johnson",
  },
  student: {
    email: "demo.student@medicforge.com",
    name: "Michael Chen",
  },
};

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

    // 2. Create demo instructor user in Supabase Auth
    console.log("\nCreating demo instructor...");
    let instructorId: string;

    // Check if user already exists
    const { data: existingInstructor } = await supabase
      .from("users")
      .select("id")
      .eq("email", DEMO_ACCOUNTS.instructor.email)
      .single();

    if (existingInstructor) {
      instructorId = existingInstructor.id;
      console.log(`  ✓ Instructor already exists: ${instructorId}`);
    } else {
      const { data: authInstructor, error: authError } = await supabase.auth.admin.createUser({
        email: DEMO_ACCOUNTS.instructor.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: DEMO_ACCOUNTS.instructor.name,
          demo_account: true,
        },
      });

      if (authError) throw authError;
      instructorId = authInstructor.user.id;

      // Create user profile
      await supabase.from("users").insert({
        id: instructorId,
        tenant_id: tenant.id,
        email: DEMO_ACCOUNTS.instructor.email,
        full_name: DEMO_ACCOUNTS.instructor.name,
        role: "instructor",
      });
      console.log(`  ✓ Instructor created: ${DEMO_ACCOUNTS.instructor.email}`);
    }

    // 3. Create demo student user
    console.log("\nCreating demo student...");
    let studentId: string;

    const { data: existingStudent } = await supabase
      .from("users")
      .select("id")
      .eq("email", DEMO_ACCOUNTS.student.email)
      .single();

    if (existingStudent) {
      studentId = existingStudent.id;
      console.log(`  ✓ Student already exists: ${studentId}`);
    } else {
      const { data: authStudent, error: authStudentError } = await supabase.auth.admin.createUser({
        email: DEMO_ACCOUNTS.student.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: DEMO_ACCOUNTS.student.name,
          demo_account: true,
        },
      });

      if (authStudentError) throw authStudentError;
      studentId = authStudent.user.id;

      await supabase.from("users").insert({
        id: studentId,
        tenant_id: tenant.id,
        email: DEMO_ACCOUNTS.student.email,
        full_name: DEMO_ACCOUNTS.student.name,
        role: "student",
      });
      console.log(`  ✓ Student created: ${DEMO_ACCOUNTS.student.email}`);
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

    // 5. Enroll student in EMT course
    console.log("\nEnrolling demo student...");
    await supabase.from("enrollments").upsert({
      tenant_id: tenant.id,
      course_id: emtCourse.id,
      student_id: studentId,
      status: "active",
      completion_percentage: 65,
    }, { onConflict: "course_id,student_id" });
    console.log(`  ✓ Student enrolled in EMT course`);

    // 6. Create modules for EMT course
    console.log("\nCreating course modules...");
    const modules = [
      { title: "Introduction to EMS", description: "Overview of emergency medical services and the EMT role", order_index: 1, is_published: true },
      { title: "Medical, Legal, and Ethical Issues", description: "Understanding legal responsibilities and ethical considerations", order_index: 2, is_published: true },
      { title: "Patient Assessment", description: "Comprehensive patient assessment techniques", order_index: 3, is_published: true },
      { title: "Airway Management", description: "Airway assessment and management techniques", order_index: 4, is_published: true },
      { title: "Cardiac Emergencies", description: "Recognition and management of cardiac emergencies", order_index: 5, is_published: false },
    ];

    const { data: createdModules, error: moduleError } = await supabase
      .from("modules")
      .upsert(
        modules.map(m => ({ ...m, tenant_id: tenant.id, course_id: emtCourse.id })),
        { onConflict: "course_id,order_index", ignoreDuplicates: false }
      )
      .select();

    if (moduleError) {
      // Try insert if upsert fails (no unique constraint)
      const { data: insertedModules, error: insertError } = await supabase
        .from("modules")
        .insert(modules.map(m => ({ ...m, tenant_id: tenant.id, course_id: emtCourse.id })))
        .select();

      if (!insertError && insertedModules) {
        console.log(`  ✓ Created ${insertedModules.length} modules`);
      }
    } else {
      console.log(`  ✓ Created ${createdModules?.length || 0} modules`);
    }

    // Get modules for creating lessons and assignments
    const { data: allModules } = await supabase
      .from("modules")
      .select("*")
      .eq("course_id", emtCourse.id)
      .order("order_index");

    if (allModules && allModules.length > 0) {
      // 7. Create lessons
      console.log("\nCreating lessons...");
      const lessons = [
        { module_id: allModules[0].id, title: "Welcome to EMT Basic", content_type: "video" as const, duration_minutes: 10, order_index: 1, is_published: true },
        { module_id: allModules[0].id, title: "History of EMS", content_type: "document" as const, duration_minutes: 15, order_index: 2, is_published: true },
        { module_id: allModules[0].id, title: "EMS Systems Overview", content_type: "video" as const, duration_minutes: 20, order_index: 3, is_published: true },
        { module_id: allModules[1].id, title: "Consent and Refusal", content_type: "video" as const, duration_minutes: 15, order_index: 1, is_published: true },
        { module_id: allModules[1].id, title: "Documentation Best Practices", content_type: "document" as const, duration_minutes: 20, order_index: 2, is_published: true },
        { module_id: allModules[2].id, title: "Scene Size-Up", content_type: "video" as const, duration_minutes: 18, order_index: 1, is_published: true },
        { module_id: allModules[2].id, title: "Primary Assessment", content_type: "video" as const, duration_minutes: 25, order_index: 2, is_published: true },
        { module_id: allModules[2].id, title: "Secondary Assessment", content_type: "video" as const, duration_minutes: 30, order_index: 3, is_published: true },
      ];

      await supabase.from("lessons").insert(
        lessons.map(l => ({ ...l, tenant_id: tenant.id }))
      );
      console.log(`  ✓ Created ${lessons.length} lessons`);

      // 8. Create assignments
      console.log("\nCreating assignments...");
      const assignments = [
        {
          tenant_id: tenant.id,
          module_id: allModules[0].id,
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
          module_id: allModules[1].id,
          title: "Written Assignment - Legal Scenarios",
          description: "Analyze three legal scenarios and explain the appropriate EMT response.",
          type: "written" as const,
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          points_possible: 75,
          is_published: true,
        },
        {
          tenant_id: tenant.id,
          module_id: allModules[2].id,
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
          module_id: allModules[2].id,
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
      }

      // 10. Create sample submissions with grades
      console.log("\nCreating sample submissions...");
      const quiz1 = createdAssignments?.find(a => a.title.includes("Module 1 Quiz"));

      if (quiz1) {
        await supabase.from("submissions").insert({
          tenant_id: tenant.id,
          assignment_id: quiz1.id,
          student_id: studentId,
          attempt_number: 1,
          content: JSON.stringify({ answers: [1, 2, 0] }),
          submitted_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          status: "graded",
          raw_score: 95,
          final_score: 95,
          graded_by: instructorId,
          graded_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          feedback: JSON.stringify({ comment: "Excellent work! Great understanding of EMS fundamentals." }),
        });
        console.log(`  ✓ Created sample submission with grade`);
      }
    }

    // 11. Create skill categories for NREMT tracking
    console.log("\nCreating NREMT skill categories...");
    const skillCategories = [
      { name: "Airway Management", description: "Airway assessment and management skills", required_count: 5, course_type: "EMT" as const },
      { name: "Patient Assessment", description: "Medical and trauma patient assessment", required_count: 10, course_type: "EMT" as const },
      { name: "Cardiac Care", description: "CPR, AED, and cardiac monitoring", required_count: 5, course_type: "EMT" as const },
      { name: "Trauma Care", description: "Bleeding control, splinting, spinal immobilization", required_count: 5, course_type: "EMT" as const },
      { name: "Medical Emergencies", description: "Diabetic, allergic, respiratory emergencies", required_count: 5, course_type: "EMT" as const },
    ];

    await supabase.from("skill_categories").insert(
      skillCategories.map(s => ({ ...s, tenant_id: tenant.id }))
    );
    console.log(`  ✓ Created ${skillCategories.length} skill categories`);

    // 12. Create clinical log entries
    console.log("\nCreating clinical log entries...");
    const clinicalLogs = [
      {
        tenant_id: tenant.id,
        student_id: studentId,
        course_id: emtCourse.id,
        log_type: "hours" as const,
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        hours: 8,
        site_name: "City Hospital ER",
        site_type: "hospital_er",
        supervisor_name: "Dr. Williams",
        supervisor_credentials: "MD",
        verification_status: "verified" as const,
        skills_performed: JSON.stringify(["Patient Assessment", "Vital Signs", "IV Access"]),
      },
      {
        tenant_id: tenant.id,
        student_id: studentId,
        course_id: emtCourse.id,
        log_type: "hours" as const,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        hours: 6,
        site_name: "Metro Ambulance Service",
        site_type: "ambulance",
        supervisor_name: "Paramedic Johnson",
        supervisor_credentials: "NRP",
        verification_status: "pending" as const,
        skills_performed: JSON.stringify(["Patient Assessment", "CPR", "AED"]),
      },
      {
        tenant_id: tenant.id,
        student_id: studentId,
        course_id: emtCourse.id,
        log_type: "patient_contact" as const,
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        site_name: "City Hospital ER",
        patient_info: JSON.stringify({
          age: 65,
          gender: "Male",
          chief_complaint: "Chest Pain",
          assessment: "Suspected MI",
        }),
        was_team_lead: true,
        verification_status: "verified" as const,
      },
    ];

    await supabase.from("clinical_logs").insert(clinicalLogs);
    console.log(`  ✓ Created ${clinicalLogs.length} clinical log entries`);

    // Done!
    console.log("\n" + "=".repeat(60));
    console.log("✅ Demo data seeded successfully!");
    console.log("=".repeat(60));
    console.log("\n📧 Demo Accounts:");
    console.log(`\n  Instructor Login:`);
    console.log(`    Email: ${DEMO_ACCOUNTS.instructor.email}`);
    console.log(`    Password: ${DEMO_PASSWORD}`);
    console.log(`\n  Student Login:`);
    console.log(`    Email: ${DEMO_ACCOUNTS.student.email}`);
    console.log(`    Password: ${DEMO_PASSWORD}`);
    console.log(`\n  Enrollment Code: DEMO-EMT`);
    console.log("\n");

  } catch (error) {
    console.error("Error seeding demo data:", error);
    process.exit(1);
  }
}

seedDemoData();
