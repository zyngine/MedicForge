import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function generateEnrollmentCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's profile and tenant
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { templateData, courseName, courseType, description } = body;

    if (!courseName || !templateData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create the course
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .insert({
        tenant_id: profile.tenant_id,
        title: courseName,
        description: description || null,
        course_type: courseType || "Custom",
        instructor_id: user.id,
        enrollment_code: generateEnrollmentCode(),
        is_active: true,
        is_archived: false,
      })
      .select()
      .single();

    if (courseError) {
      console.error("Error creating course:", courseError);
      return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
    }

    // Create modules and lessons from template
    if (templateData.modules && Array.isArray(templateData.modules)) {
      for (const module of templateData.modules) {
        const { data: newModule, error: moduleError } = await supabase
          .from("modules")
          .insert({
            tenant_id: profile.tenant_id,
            course_id: course.id,
            title: module.title,
            description: module.description || null,
            order_index: module.order_index || 0,
            is_published: false,
          })
          .select()
          .single();

        if (moduleError) {
          console.error("Error creating module:", moduleError);
          continue;
        }

        // Create lessons within the module
        if (module.lessons && Array.isArray(module.lessons) && newModule) {
          for (const lesson of module.lessons) {
            await supabase
              .from("lessons")
              .insert({
                tenant_id: profile.tenant_id,
                module_id: newModule.id,
                title: lesson.title,
                content_type: lesson.content_type || "text",
                content: lesson.content || null,
                order_index: lesson.order_index || 0,
                is_published: false,
              });
          }
        }
      }
    }

    // Create assignments from template if included
    if (templateData.assignments && Array.isArray(templateData.assignments)) {
      // Get the created modules to link assignments
      const { data: modules } = await supabase
        .from("modules")
        .select("id, order_index")
        .eq("course_id", course.id)
        .order("order_index");

      for (const assignment of templateData.assignments) {
        // Find the module to attach this assignment to
        let moduleId = null;
        if (assignment.module_index !== undefined && modules) {
          const targetModule = modules.find(m => m.order_index === assignment.module_index);
          moduleId = targetModule?.id || modules[0]?.id;
        } else if (modules && modules.length > 0) {
          moduleId = modules[0].id;
        }

        if (moduleId) {
          await supabase
            .from("assignments")
            .insert({
              tenant_id: profile.tenant_id,
              module_id: moduleId,
              title: assignment.title,
              description: assignment.description || null,
              type: assignment.type || "quiz",
              points_possible: assignment.points_possible || 100,
              is_published: false,
            });
        }
      }
    }

    return NextResponse.json({
      success: true,
      courseId: course.id,
      message: "Course imported successfully"
    });

  } catch (error) {
    console.error("Import template error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
