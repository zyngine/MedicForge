"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export type NoteColor = "yellow" | "green" | "blue" | "pink" | "purple" | "orange";

export interface StudentNote {
  id: string;
  tenant_id: string;
  student_id: string;
  course_id: string;
  lesson_id: string | null;
  module_id: string | null;
  title: string | null;
  content: string;
  color: NoteColor;
  is_pinned: boolean;
  is_private: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  lesson?: { id: string; title: string };
  module?: { id: string; title: string };
  course?: { id: string; title: string };
}

export interface NoteHighlight {
  id: string;
  note_id: string;
  lesson_id: string;
  highlighted_text: string;
  start_offset: number;
  end_offset: number;
  color: NoteColor;
  annotation: string | null;
  created_at: string;
}

export interface NotesSummary {
  course_id: string;
  course_title: string;
  notes_count: number;
  last_note_at: string | null;
}

// Hook for managing notes
export function useNotes(options?: {
  courseId?: string;
  lessonId?: string;
  moduleId?: string;
}) {
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchNotes = useCallback(async () => {
    if (!profile?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("student_notes")
        .select(`
          *,
          lesson:lessons(id, title),
          module:modules(id, title),
          course:courses(id, title)
        `)
        .eq("student_id", profile.id)
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false });

      if (options?.courseId) {
        query = query.eq("course_id", options.courseId);
      }
      if (options?.lessonId) {
        query = query.eq("lesson_id", options.lessonId);
      }
      if (options?.moduleId) {
        query = query.eq("module_id", options.moduleId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setNotes(data || []);
    } catch (err) {
      console.error("Failed to fetch notes:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, options?.courseId, options?.lessonId, options?.moduleId, supabase]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = async (input: {
    course_id: string;
    lesson_id?: string;
    module_id?: string;
    title?: string;
    content: string;
    color?: NoteColor;
    is_private?: boolean;
    tags?: string[];
  }): Promise<StudentNote | null> => {
    if (!profile?.tenant_id || !profile?.id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("student_notes")
        .insert({
          tenant_id: profile.tenant_id,
          student_id: profile.id,
          course_id: input.course_id,
          lesson_id: input.lesson_id || null,
          module_id: input.module_id || null,
          title: input.title || null,
          content: input.content,
          color: input.color || "yellow",
          is_private: input.is_private !== false,
          tags: input.tags || [],
        })
        .select(`
          *,
          lesson:lessons(id, title),
          module:modules(id, title),
          course:courses(id, title)
        `)
        .single();

      if (error) throw error;
      setNotes((prev) => [data, ...prev]);
      toast.success("Note saved");
      return data;
    } catch (err) {
      toast.error("Failed to save note");
      return null;
    }
  };

  const updateNote = async (
    id: string,
    updates: Partial<StudentNote>
  ): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("student_notes")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n))
      );
      return true;
    } catch (err) {
      toast.error("Failed to update note");
      return false;
    }
  };

  const deleteNote = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("student_notes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success("Note deleted");
      return true;
    } catch (err) {
      toast.error("Failed to delete note");
      return false;
    }
  };

  const togglePin = async (id: string, isPinned: boolean): Promise<boolean> => {
    return updateNote(id, { is_pinned: !isPinned });
  };

  const searchNotes = async (query: string, courseId?: string): Promise<StudentNote[]> => {
    if (!profile?.id || query.length < 2) return [];

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .rpc("search_student_notes", {
          p_student_id: profile.id,
          p_query: query,
          p_course_id: courseId || null,
        });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Search failed:", err);
      return [];
    }
  };

  return {
    notes,
    isLoading,
    refetch: fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    searchNotes,
  };
}

// Hook for notes summary across courses
export function useNotesSummary() {
  const [summary, setSummary] = useState<NotesSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  useEffect(() => {
    if (!profile?.id) {
      setIsLoading(false);
      return;
    }

    const fetchSummary = async () => {
      try {
        setIsLoading(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .rpc("get_notes_summary", { p_student_id: profile.id });

        if (error) throw error;
        setSummary(data || []);
      } catch (err) {
        console.error("Failed to fetch notes summary:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [profile?.id, supabase]);

  return { summary, isLoading };
}

// Hook for text highlights in lessons
export function useLessonHighlights(lessonId: string) {
  const [highlights, setHighlights] = useState<NoteHighlight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchHighlights = useCallback(async () => {
    if (!profile?.id || !lessonId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("note_highlights")
        .select(`
          *,
          note:student_notes!inner(student_id)
        `)
        .eq("lesson_id", lessonId)
        .eq("note.student_id", profile.id);

      if (error) throw error;
      setHighlights(data || []);
    } catch (err) {
      console.error("Failed to fetch highlights:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, lessonId, supabase]);

  useEffect(() => {
    fetchHighlights();
  }, [fetchHighlights]);

  const createHighlight = async (
    noteId: string,
    input: {
      highlighted_text: string;
      start_offset: number;
      end_offset: number;
      color?: NoteColor;
      annotation?: string;
    }
  ): Promise<NoteHighlight | null> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("note_highlights")
        .insert({
          note_id: noteId,
          lesson_id: lessonId,
          ...input,
          color: input.color || "yellow",
        })
        .select()
        .single();

      if (error) throw error;
      setHighlights((prev) => [...prev, data]);
      return data;
    } catch (err) {
      toast.error("Failed to save highlight");
      return null;
    }
  };

  const deleteHighlight = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("note_highlights")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setHighlights((prev) => prev.filter((h) => h.id !== id));
      return true;
    } catch (err) {
      toast.error("Failed to delete highlight");
      return false;
    }
  };

  return {
    highlights,
    isLoading,
    refetch: fetchHighlights,
    createHighlight,
    deleteHighlight,
  };
}

// Note color options for UI
export const NOTE_COLORS: { value: NoteColor; label: string; class: string }[] = [
  { value: "yellow", label: "Yellow", class: "bg-yellow-100 border-yellow-300" },
  { value: "green", label: "Green", class: "bg-green-100 border-green-300" },
  { value: "blue", label: "Blue", class: "bg-blue-100 border-blue-300" },
  { value: "pink", label: "Pink", class: "bg-pink-100 border-pink-300" },
  { value: "purple", label: "Purple", class: "bg-purple-100 border-purple-300" },
  { value: "orange", label: "Orange", class: "bg-orange-100 border-orange-300" },
];
