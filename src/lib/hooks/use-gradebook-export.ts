"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export interface GradebookExportTemplate {
  id: string;
  tenant_id: string;
  name: string;
  format: "csv" | "xlsx" | "json" | "pdf";
  columns: string[];
  settings: {
    include_header?: boolean;
    date_format?: string;
    decimal_places?: number;
    include_hidden_assignments?: boolean;
    include_ungraded?: boolean;
    group_by?: "student" | "assignment";
    sort_by?: string;
    sort_order?: "asc" | "desc";
  } | null;
  is_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GradebookExport {
  id: string;
  tenant_id: string;
  course_id: string;
  template_id: string | null;
  format: "csv" | "xlsx" | "json" | "pdf";
  file_url: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  exported_by: string;
  created_at: string;
  completed_at: string | null;
  // Joined
  course?: { id: string; title: string };
  template?: GradebookExportTemplate;
  exporter?: { id: string; full_name: string };
}

interface GradebookData {
  students: Array<{
    id: string;
    full_name: string;
    email: string;
    enrollment_date: string;
    final_grade: number | null;
    completion_percentage: number;
    grades: Record<string, {
      score: number | null;
      max_score: number;
      submitted_at: string | null;
      graded_at: string | null;
    }>;
  }>;
  assignments: Array<{
    id: string;
    title: string;
    points_possible: number;
    due_date: string | null;
    type: string;
  }>;
  courseInfo: {
    id: string;
    title: string;
    course_code: string | null;
    instructor: string;
  };
}

// Hook for managing export templates
export function useGradebookExportTemplates() {
  const [templates, setTemplates] = useState<GradebookExportTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchTemplates = useCallback(async () => {
    if (!profile?.tenant_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("gradebook_export_templates")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .order("is_default", { ascending: false })
        .order("name");

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error("Failed to fetch export templates:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, supabase]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (input: {
    name: string;
    format: GradebookExportTemplate["format"];
    columns: string[];
    settings?: GradebookExportTemplate["settings"];
  }): Promise<GradebookExportTemplate | null> => {
    if (!profile?.tenant_id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("gradebook_export_templates")
        .insert({
          tenant_id: profile.tenant_id,
          name: input.name,
          format: input.format,
          columns: input.columns,
          settings: input.settings || null,
          is_default: false,
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;
      setTemplates((prev) => [...prev, data]);
      toast.success("Template created");
      return data;
    } catch (_err) {
      toast.error("Failed to create template");
      return null;
    }
  };

  const updateTemplate = async (
    id: string,
    updates: Partial<GradebookExportTemplate>
  ): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("gradebook_export_templates")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
      toast.success("Template updated");
      return true;
    } catch (_err) {
      toast.error("Failed to update template");
      return false;
    }
  };

  const deleteTemplate = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("gradebook_export_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template deleted");
      return true;
    } catch (_err) {
      toast.error("Failed to delete template");
      return false;
    }
  };

  const setDefaultTemplate = async (id: string): Promise<boolean> => {
    if (!profile?.tenant_id) return false;

    try {
      // Clear existing default
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("gradebook_export_templates")
        .update({ is_default: false })
        .eq("tenant_id", profile.tenant_id);

      // Set new default
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("gradebook_export_templates")
        .update({ is_default: true })
        .eq("id", id);

      setTemplates((prev) =>
        prev.map((t) => ({ ...t, is_default: t.id === id }))
      );
      toast.success("Default template set");
      return true;
    } catch (_err) {
      toast.error("Failed to set default template");
      return false;
    }
  };

  const defaultTemplate = templates.find((t) => t.is_default);

  return {
    templates,
    defaultTemplate,
    isLoading,
    refetch: fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setDefaultTemplate,
  };
}

// Hook for exporting gradebook
export function useGradebookExport(courseId: string) {
  const [exports, setExports] = useState<GradebookExport[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchExports = useCallback(async () => {
    if (!profile?.tenant_id || !courseId) return;

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("gradebook_exports")
        .select(`
          *,
          course:courses(id, title),
          template:gradebook_export_templates(id, name, format),
          exporter:users!gradebook_exports_exported_by_fkey(id, full_name)
        `)
        .eq("course_id", courseId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setExports(data || []);
    } catch (err) {
      console.error("Failed to fetch exports:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, courseId, supabase]);

  useEffect(() => {
    fetchExports();
  }, [fetchExports]);

  const fetchGradebookData = async (): Promise<GradebookData | null> => {
    if (!profile?.tenant_id) return null;

    try {
      // Fetch course info
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: course } = await (supabase as any)
        .from("courses")
        .select(`
          id, title, course_code,
          instructor:users!courses_instructor_id_fkey(full_name)
        `)
        .eq("id", courseId)
        .single();

      // Fetch assignments through modules
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: modules } = await (supabase as any)
        .from("modules")
        .select("id")
        .eq("course_id", courseId);

      const moduleIds = modules?.map((m: { id: string }) => m.id) || [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: assignments } = await (supabase as any)
        .from("assignments")
        .select("id, title, points_possible, due_date, type")
        .in("module_id", moduleIds)
        .eq("is_published", true)
        .order("due_date");

      // Fetch enrollments with grades
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: enrollments } = await (supabase as any)
        .from("enrollments")
        .select(`
          student_id, enrolled_at, final_grade, completion_percentage,
          student:users!enrollments_student_id_fkey(id, full_name, email)
        `)
        .eq("course_id", courseId)
        .eq("status", "active");

      // Fetch all submissions for this course
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: submissions } = await (supabase as any)
        .from("submissions")
        .select("student_id, assignment_id, final_score, submitted_at, graded_at")
        .in("assignment_id", assignments?.map((a: { id: string }) => a.id) || [])
        .in("status", ["submitted", "graded"]);

      // Build submission map
      const submissionMap: Record<string, Record<string, {
        score: number | null;
        max_score: number;
        submitted_at: string | null;
        graded_at: string | null;
      }>> = {};

      for (const sub of submissions || []) {
        if (!submissionMap[sub.student_id]) {
          submissionMap[sub.student_id] = {};
        }
        const assignment = assignments?.find((a: { id: string }) => a.id === sub.assignment_id);
        submissionMap[sub.student_id][sub.assignment_id] = {
          score: sub.final_score,
          max_score: assignment?.points_possible || 0,
          submitted_at: sub.submitted_at,
          graded_at: sub.graded_at,
        };
      }

      const students = enrollments?.map((e: {
        student_id: string;
        enrolled_at: string;
        final_grade: number | null;
        completion_percentage: number;
        student: { id: string; full_name: string; email: string };
      }) => ({
        id: e.student_id,
        full_name: e.student?.full_name || "",
        email: e.student?.email || "",
        enrollment_date: e.enrolled_at,
        final_grade: e.final_grade,
        completion_percentage: e.completion_percentage,
        grades: submissionMap[e.student_id] || {},
      })) || [];

      return {
        students,
        assignments: assignments || [],
        courseInfo: {
          id: course.id,
          title: course.title,
          course_code: course.course_code,
          instructor: course.instructor?.full_name || "",
        },
      };
    } catch (err) {
      console.error("Failed to fetch gradebook data:", err);
      return null;
    }
  };

  const generateCSV = (data: GradebookData, columns?: string[]): string => {
    const allColumns = columns || [
      "student_name",
      "email",
      ...data.assignments.map((a) => a.id),
      "final_grade",
      "completion",
    ];

    // Header row
    const headerRow = allColumns.map((col) => {
      if (col === "student_name") return "Student Name";
      if (col === "email") return "Email";
      if (col === "final_grade") return "Final Grade";
      if (col === "completion") return "Completion %";
      const assignment = data.assignments.find((a) => a.id === col);
      return assignment?.title || col;
    });

    const rows = [headerRow.join(",")];

    // Data rows
    for (const student of data.students) {
      const row = allColumns.map((col) => {
        if (col === "student_name") return `"${student.full_name}"`;
        if (col === "email") return student.email;
        if (col === "final_grade") return student.final_grade?.toString() || "";
        if (col === "completion") return student.completion_percentage.toString();
        const grade = student.grades[col];
        return grade?.score?.toString() || "";
      });
      rows.push(row.join(","));
    }

    return rows.join("\n");
  };

  const generateJSON = (data: GradebookData): string => {
    return JSON.stringify(data, null, 2);
  };

  const exportGradebook = async (
    format: "csv" | "xlsx" | "json" | "pdf",
    templateId?: string
  ): Promise<string | null> => {
    if (!profile?.tenant_id) {
      toast.error("You must be logged in");
      return null;
    }

    setIsExporting(true);

    try {
      // Create export record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: exportRecord, error: insertError } = await (supabase as any)
        .from("gradebook_exports")
        .insert({
          tenant_id: profile.tenant_id,
          course_id: courseId,
          template_id: templateId || null,
          format,
          status: "processing",
          exported_by: profile.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Fetch data
      const data = await fetchGradebookData();
      if (!data) throw new Error("Failed to fetch gradebook data");

      // Get template settings if using template
      let columns: string[] | undefined;
      if (templateId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: template } = await (supabase as any)
          .from("gradebook_export_templates")
          .select("columns, settings")
          .eq("id", templateId)
          .single();

        columns = template?.columns;
      }

      // Generate file content
      let content: string;
      let contentType: string;
      let extension: string;

      switch (format) {
        case "csv":
          content = generateCSV(data, columns);
          contentType = "text/csv";
          extension = "csv";
          break;
        case "json":
          content = generateJSON(data);
          contentType = "application/json";
          extension = "json";
          break;
        case "xlsx":
        case "pdf":
          // These would require additional libraries (xlsx, puppeteer/react-pdf)
          // For now, fall back to CSV
          content = generateCSV(data, columns);
          contentType = "text/csv";
          extension = "csv";
          toast.info(`${format.toUpperCase()} export not yet implemented, using CSV`);
          break;
        default:
          content = generateCSV(data, columns);
          contentType = "text/csv";
          extension = "csv";
      }

      // Upload to storage
      const fileName = `gradebook_${courseId}_${Date.now()}.${extension}`;
      const filePath = `exports/${profile.tenant_id}/${fileName}`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: uploadError } = await (supabase as any)
        .storage
        .from("exports")
        .upload(filePath, new Blob([content], { type: contentType }));

      if (uploadError) throw uploadError;

      // Get public URL
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: urlData } = (supabase as any)
        .storage
        .from("exports")
        .getPublicUrl(filePath);

      // Update export record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("gradebook_exports")
        .update({
          status: "completed",
          file_url: urlData.publicUrl,
          completed_at: new Date().toISOString(),
        })
        .eq("id", exportRecord.id);

      await fetchExports();
      toast.success("Gradebook exported successfully");

      // Trigger download
      const link = document.createElement("a");
      link.href = urlData.publicUrl;
      link.download = fileName;
      link.click();

      return urlData.publicUrl;
    } catch (err) {
      console.error("Failed to export gradebook:", err);
      toast.error("Failed to export gradebook");
      return null;
    } finally {
      setIsExporting(false);
    }
  };

  const downloadExport = (exportRecord: GradebookExport) => {
    if (!exportRecord.file_url) {
      toast.error("Export file not available");
      return;
    }

    const link = document.createElement("a");
    link.href = exportRecord.file_url;
    link.download = `gradebook_export.${exportRecord.format}`;
    link.click();
  };

  return {
    exports,
    isExporting,
    isLoading,
    refetch: fetchExports,
    fetchGradebookData,
    exportGradebook,
    downloadExport,
  };
}

// Hook for quick export (no template)
export function useQuickExport() {
  const { profile } = useUser();
  const supabase = createClient();

  const quickExportCSV = async (courseId: string): Promise<void> => {
    if (!profile?.tenant_id) {
      toast.error("You must be logged in");
      return;
    }

    try {
      // Fetch course info
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: course } = await (supabase as any)
        .from("courses")
        .select("title")
        .eq("id", courseId)
        .single();

      // Fetch modules
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: modules } = await (supabase as any)
        .from("modules")
        .select("id")
        .eq("course_id", courseId);

      const moduleIds = modules?.map((m: { id: string }) => m.id) || [];

      // Fetch assignments
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: assignments } = await (supabase as any)
        .from("assignments")
        .select("id, title, points_possible")
        .in("module_id", moduleIds)
        .eq("is_published", true);

      // Fetch enrollments
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: enrollments } = await (supabase as any)
        .from("enrollments")
        .select(`
          student_id, final_grade,
          student:users!enrollments_student_id_fkey(full_name, email)
        `)
        .eq("course_id", courseId)
        .eq("status", "active");

      // Fetch submissions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: submissions } = await (supabase as any)
        .from("submissions")
        .select("student_id, assignment_id, final_score")
        .in("assignment_id", assignments?.map((a: { id: string }) => a.id) || []);

      // Build CSV
      const headers = [
        "Student Name",
        "Email",
        ...assignments?.map((a: { title: string }) => a.title) || [],
        "Final Grade",
      ];

      const rows = [headers.join(",")];

      for (const enrollment of enrollments || []) {
        const studentSubmissions = submissions?.filter(
          (s: { student_id: string }) => s.student_id === enrollment.student_id
        );

        const row = [
          `"${enrollment.student?.full_name || ""}"`,
          enrollment.student?.email || "",
          ...assignments?.map((a: { id: string }) => {
            const sub = studentSubmissions?.find(
              (s: { assignment_id: string }) => s.assignment_id === a.id
            );
            return sub?.final_score?.toString() || "";
          }) || [],
          enrollment.final_grade?.toString() || "",
        ];

        rows.push(row.join(","));
      }

      // Download
      const csv = rows.join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${course?.title || "gradebook"}_grades.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Gradebook exported");
    } catch (err) {
      console.error("Failed to export:", err);
      toast.error("Failed to export gradebook");
    }
  };

  return { quickExportCSV };
}
