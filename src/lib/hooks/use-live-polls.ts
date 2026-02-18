"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export type PollStatus = "draft" | "active" | "closed";
export type PollType = "single_choice" | "multiple_choice" | "word_cloud" | "rating" | "open_ended";

export interface LivePoll {
  id: string;
  tenant_id: string;
  course_id: string;
  created_by: string;
  title: string;
  description: string | null;
  poll_type: PollType;
  options: string[];
  settings: {
    show_results_live?: boolean;
    anonymous?: boolean;
    time_limit?: number;
    allow_change_answer?: boolean;
  };
  status: PollStatus;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PollResponse {
  id: string;
  poll_id: string;
  user_id: string;
  response: {
    selected?: string | string[];
    text?: string;
    rating?: number;
  };
  created_at: string;
}

export interface PollResults {
  total_responses: number;
  options?: Array<{
    option: string;
    count: number;
    percentage: number;
  }>;
  average_rating?: number;
  distribution?: Record<string, number>;
  responses?: string[];
}

// Hook for managing live polls
export function useLivePolls(courseId: string) {
  const [polls, setPolls] = useState<LivePoll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchPolls = useCallback(async () => {
    if (!profile?.tenant_id || !courseId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("live_polls")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPolls(data || []);
    } catch (err) {
      console.error("Failed to fetch polls:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, courseId, supabase]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  // Subscribe to real-time updates for active polls
  useEffect(() => {
    if (!courseId) return;

    const channel = supabase
      .channel(`polls:${courseId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_polls",
          filter: `course_id=eq.${courseId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setPolls((prev) => [payload.new as LivePoll, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setPolls((prev) =>
              prev.map((p) => (p.id === payload.new.id ? (payload.new as LivePoll) : p))
            );
          } else if (payload.eventType === "DELETE") {
            setPolls((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [courseId, supabase]);

  const createPoll = async (input: {
    title: string;
    description?: string;
    poll_type: PollType;
    options?: string[];
    settings?: LivePoll["settings"];
  }): Promise<LivePoll | null> => {
    if (!profile?.tenant_id || !courseId) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("live_polls")
        .insert({
          tenant_id: profile.tenant_id,
          course_id: courseId,
          created_by: profile.id,
          title: input.title,
          description: input.description || null,
          poll_type: input.poll_type,
          options: input.options || [],
          settings: input.settings || {},
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("Poll created");
      return data;
    } catch (err) {
      console.error("Failed to create poll:", err);
      toast.error("Failed to create poll");
      return null;
    }
  };

  const updatePoll = async (id: string, updates: Partial<LivePoll>): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("live_polls")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      return true;
    } catch (err) {
      toast.error("Failed to update poll");
      return false;
    }
  };

  const startPoll = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("live_polls")
        .update({
          status: "active",
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Poll started");
      return true;
    } catch (err) {
      toast.error("Failed to start poll");
      return false;
    }
  };

  const closePoll = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("live_polls")
        .update({
          status: "closed",
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Poll closed");
      return true;
    } catch (err) {
      toast.error("Failed to close poll");
      return false;
    }
  };

  const deletePoll = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("live_polls")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Poll deleted");
      return true;
    } catch (err) {
      toast.error("Failed to delete poll");
      return false;
    }
  };

  const getPollResults = async (pollId: string): Promise<PollResults | null> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc("get_poll_results", {
        p_poll_id: pollId,
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error("Failed to get poll results:", err);
      return null;
    }
  };

  return {
    polls,
    isLoading,
    refetch: fetchPolls,
    createPoll,
    updatePoll,
    startPoll,
    closePoll,
    deletePoll,
    getPollResults,
  };
}

// Hook for responding to polls (student view)
export function usePollResponse(pollId: string) {
  const [poll, setPoll] = useState<LivePoll | null>(null);
  const [myResponse, setMyResponse] = useState<PollResponse | null>(null);
  const [results, setResults] = useState<PollResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  // Fetch poll and user's response
  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id || !pollId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch poll
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: pollData, error: pollError } = await (supabase as any)
          .from("live_polls")
          .select("*")
          .eq("id", pollId)
          .single();

        if (pollError) throw pollError;
        setPoll(pollData);

        // Fetch user's response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: responseData } = await (supabase as any)
          .from("poll_responses")
          .select("*")
          .eq("poll_id", pollId)
          .eq("user_id", profile.id)
          .single();

        setMyResponse(responseData || null);

        // Fetch results if allowed
        if (pollData.settings?.show_results_live || pollData.status === "closed") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: resultsData } = await (supabase as any).rpc("get_poll_results", {
            p_poll_id: pollId,
          });
          setResults(resultsData);
        }
      } catch (err) {
        console.error("Failed to fetch poll data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [profile?.id, pollId, supabase]);

  // Subscribe to real-time poll updates
  useEffect(() => {
    if (!pollId) return;

    const channel = supabase
      .channel(`poll:${pollId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_polls",
          filter: `id=eq.${pollId}`,
        },
        (payload) => {
          setPoll(payload.new as LivePoll);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pollId, supabase]);

  const submitResponse = async (response: PollResponse["response"]): Promise<boolean> => {
    if (!profile?.tenant_id || !profile?.id || !pollId) {
      toast.error("You must be logged in");
      return false;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("poll_responses")
        .upsert({
          tenant_id: profile.tenant_id,
          poll_id: pollId,
          user_id: profile.id,
          response,
        })
        .select()
        .single();

      if (error) throw error;
      setMyResponse(data);
      toast.success("Response submitted");
      return true;
    } catch (err) {
      console.error("Failed to submit response:", err);
      toast.error("Failed to submit response");
      return false;
    }
  };

  return {
    poll,
    myResponse,
    results,
    isLoading,
    submitResponse,
    hasResponded: !!myResponse,
  };
}

// Poll type options for UI
export const POLL_TYPE_OPTIONS = [
  {
    value: "single_choice",
    label: "Single Choice",
    description: "Students select one option",
  },
  {
    value: "multiple_choice",
    label: "Multiple Choice",
    description: "Students can select multiple options",
  },
  {
    value: "word_cloud",
    label: "Word Cloud",
    description: "Free-form text responses displayed as a word cloud",
  },
  {
    value: "rating",
    label: "Rating Scale",
    description: "Students rate on a numeric scale (1-5 or 1-10)",
  },
  {
    value: "open_ended",
    label: "Open Ended",
    description: "Free-form text responses",
  },
];
