import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { addDays, differenceInDays, parseISO } from "date-fns";

interface DuplicateOptions {
  course_id: string;
  new_title: string;
  include_modules?: boolean;
  include_assignments?: boolean;
  include_quizzes?: boolean;
  reset_dates?: boolean;
  new_start_date?: string;
  save_as_template?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const options: DuplicateOptions = await request.json();

    const {
      course_id,
      new_title,
      include_modules = true,
      include_assignments = true,
      include_quizzes = true,
      reset_dates = false,
      new_start_date,
      save_as_template = false,
    } = options;

    if (!course_id || !new_title) {
      return NextResponse.json(
        { error: "Course ID and new title are required" },
        { status: 400 }
      );
    }

    // Verify user
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin: any = createAdminClient();

    const { data: requesterProfile } = await supabaseAdmin
      .from("users")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (!requesterProfile || !["admin", "instructor"].includes(requesterProfile.role || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const tenant_id = requesterProfile.tenant_id;

    // Get the source course
    const { data: sourceCourse, error: courseError } = await supabaseAdmin
      .from("courses")
      .select("*")
      .eq("id", course_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (courseError || !sourceCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Calculate date offset if resetting dates
    let dateOffset = 0;
    if (reset_dates && new_start_date && sourceCourse.start_date) {
      const originalStart = parseISO(sourceCourse.start_date);
      const newStart = parseISO(new_start_date);
      dateOffset = differenceInDays(newStart, originalStart);
    }

    // Helper function to adjust dates
    const adjustDate = (dateStr: string | null): string | null => {
      if (!dateStr || !reset_dates || dateOffset === 0) return dateStr;
      try {
        const originalDate = parseISO(dateStr);
        return addDays(originalDate, dateOffset).toISOString();
      } catch {
        return dateStr;
      }
    };

    // Create the new course
    const { data: newCourse, error: createError } = await supabaseAdmin
      .from("courses")
      .insert({
        tenant_id,
        title: new_title,
        description: sourceCourse.description,
        course_type: sourceCourse.course_type,
        course_code: sourceCourse.course_code ? `${sourceCourse.course_code}-COPY` : null,
        instructor_id: user.id,
        start_date: reset_dates && new_start_date ? new_start_date : sourceCourse.start_date,
        end_date: adjustDate(sourceCourse.end_date),
        max_students: sourceCourse.max_students,
        is_published: false, // Always start unpublished
        is_archived: false,
        is_template: save_as_template,
        settings: sourceCourse.settings,
        grading_scheme: sourceCourse.grading_scheme,
      })
      .select()
      .single();

    if (createError || !newCourse) {
      return NextResponse.json(
        { error: `Failed to create course: ${createError?.message}` },
        { status: 500 }
      );
    }

    // Maps for tracking IDs
    const moduleIdMap = new Map<string, string>();
    const assignmentIdMap = new Map<string, string>();

    // Duplicate modules if requested
    if (include_modules) {
      const { data: sourceModules } = await supabaseAdmin
        .from("modules")
        .select("*")
        .eq("course_id", course_id)
        .order("position");

      if (sourceModules && sourceModules.length > 0) {
        for (const module of sourceModules) {
          const { data: newModule, error: moduleError } = await supabaseAdmin
            .from("modules")
            .insert({
              tenant_id,
              course_id: newCourse.id,
              title: module.title,
              description: module.description,
              position: module.position,
              is_published: false,
              unlock_at: adjustDate(module.unlock_at),
              lock_at: adjustDate(module.lock_at),
            })
            .select()
            .single();

          if (newModule) {
            moduleIdMap.set(module.id, newModule.id);

            // Duplicate lessons
            const { data: sourceLessons } = await supabaseAdmin
              .from("lessons")
              .select("*")
              .eq("module_id", module.id)
              .order("position");

            if (sourceLessons && sourceLessons.length > 0) {
              for (const lesson of sourceLessons) {
                await supabaseAdmin.from("lessons").insert({
                  tenant_id,
                  module_id: newModule.id,
                  title: lesson.title,
                  content: lesson.content,
                  content_type: lesson.content_type,
                  position: lesson.position,
                  duration_minutes: lesson.duration_minutes,
                  is_published: false,
                  video_url: lesson.video_url,
                });
              }
            }

            // Duplicate assignments if requested
            if (include_assignments) {
              const { data: sourceAssignments } = await supabaseAdmin
                .from("assignments")
                .select("*")
                .eq("module_id", module.id)
                .order("position");

              if (sourceAssignments && sourceAssignments.length > 0) {
                for (const assignment of sourceAssignments) {
                  const { data: newAssignment } = await supabaseAdmin
                    .from("assignments")
                    .insert({
                      tenant_id,
                      module_id: newModule.id,
                      title: assignment.title,
                      description: assignment.description,
                      type: assignment.type,
                      points_possible: assignment.points_possible,
                      position: assignment.position,
                      due_date: adjustDate(assignment.due_date),
                      unlock_at: adjustDate(assignment.unlock_at),
                      lock_at: adjustDate(assignment.lock_at),
                      is_published: false,
                      settings: assignment.settings,
                      rubric_id: null, // Don't copy rubric associations
                    })
                    .select()
                    .single();

                  if (newAssignment) {
                    assignmentIdMap.set(assignment.id, newAssignment.id);

                    // Duplicate quiz questions if it's a quiz and quizzes are included
                    if (include_quizzes && assignment.type === "quiz") {
                      const { data: sourceQuestions } = await supabaseAdmin
                        .from("quiz_questions")
                        .select("*")
                        .eq("assignment_id", assignment.id)
                        .order("position");

                      if (sourceQuestions && sourceQuestions.length > 0) {
                        for (const question of sourceQuestions) {
                          await supabaseAdmin.from("quiz_questions").insert({
                            tenant_id,
                            assignment_id: newAssignment.id,
                            question_text: question.question_text,
                            question_type: question.question_type,
                            options: question.options,
                            correct_answer: question.correct_answer,
                            explanation: question.explanation,
                            points: question.points,
                            position: question.position,
                          });
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Count duplicated items
    const { data: moduleCount } = await supabaseAdmin
      .from("modules")
      .select("id", { count: "exact" })
      .eq("course_id", newCourse.id);

    const { data: lessonCount } = await supabaseAdmin
      .from("lessons")
      .select("id", { count: "exact" })
      .in("module_id", Array.from(moduleIdMap.values()));

    const { data: assignmentCount } = await supabaseAdmin
      .from("assignments")
      .select("id", { count: "exact" })
      .eq("module_id", Array.from(moduleIdMap.values())[0] || "");

    return NextResponse.json({
      success: true,
      course: newCourse,
      summary: {
        modules: moduleIdMap.size,
        lessons: lessonCount?.length || 0,
        assignments: assignmentIdMap.size,
      },
    });
  } catch (error) {
    console.error("Course duplication error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
