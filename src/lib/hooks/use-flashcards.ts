"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "./use-user";
import { toast } from "sonner";

export interface FlashcardDeck {
  id: string;
  tenant_id: string;
  course_id: string | null;
  created_by: string;
  title: string;
  description: string | null;
  category: string | null;
  is_public: boolean;
  is_official: boolean;
  card_count: number;
  total_reviews: number;
  average_difficulty: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  // Joined
  creator?: { id: string; full_name: string };
  course?: { id: string; title: string };
  user_progress?: {
    cards_studied: number;
    mastery_percentage: number;
    due_today: number;
  };
}

export interface Flashcard {
  id: string;
  tenant_id: string;
  deck_id: string;
  front_content: string;
  back_content: string;
  front_image_url: string | null;
  back_image_url: string | null;
  audio_url: string | null;
  hints: string[];
  tags: string[];
  order_index: number;
  created_at: string;
  updated_at: string;
  // Progress data (when fetched with progress)
  ease_factor?: number;
  interval_days?: number;
  next_review_date?: string;
  is_new?: boolean;
}

export interface FlashcardProgress {
  id: string;
  tenant_id: string;
  user_id: string;
  card_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_date: string | null;
  last_reviewed_at: string | null;
  quality_history: number[];
  total_reviews: number;
  correct_count: number;
}

export interface StudySession {
  deck: FlashcardDeck;
  cards: Flashcard[];
  currentIndex: number;
  reviewed: number;
  correct: number;
  startTime: Date;
}

// Quality ratings for SM-2 algorithm
export const QUALITY_RATINGS = {
  AGAIN: 0, // Complete blackout
  HARD: 2, // Incorrect but upon seeing correct answer remembered
  GOOD: 3, // Correct with difficulty
  EASY: 4, // Correct with ease
  PERFECT: 5, // Perfect response
} as const;

// Hook for flashcard decks
export function useFlashcardDecks(options?: { courseId?: string; myDecksOnly?: boolean }) {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchDecks = useCallback(async () => {
    if (!profile?.tenant_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("flashcard_decks")
        .select(`
          *,
          creator:users!flashcard_decks_created_by_fkey(id, full_name),
          course:courses(id, title)
        `)
        .eq("tenant_id", profile.tenant_id);

      if (options?.courseId) {
        query = query.eq("course_id", options.courseId);
      }

      if (options?.myDecksOnly) {
        query = query.eq("created_by", profile.id);
      } else {
        // Show public, official, or own decks
        query = query.or(`is_public.eq.true,is_official.eq.true,created_by.eq.${profile.id}`);
      }

      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setDecks(data || []);
    } catch (err) {
      console.error("Failed to fetch decks:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, profile?.id, options?.courseId, options?.myDecksOnly, supabase]);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  const createDeck = async (input: {
    course_id?: string;
    title: string;
    description?: string;
    category?: string;
    is_public?: boolean;
    tags?: string[];
  }): Promise<FlashcardDeck | null> => {
    if (!profile?.tenant_id || !profile?.id) {
      toast.error("You must be logged in");
      return null;
    }

    try {
      const isInstructor = profile.role === "admin" || profile.role === "instructor";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("flashcard_decks")
        .insert({
          tenant_id: profile.tenant_id,
          created_by: profile.id,
          course_id: input.course_id || null,
          title: input.title,
          description: input.description || null,
          category: input.category || null,
          is_public: input.is_public ?? false,
          is_official: isInstructor,
          tags: input.tags || [],
        })
        .select()
        .single();

      if (error) throw error;
      setDecks((prev) => [data, ...prev]);
      toast.success("Deck created");
      return data;
    } catch (err) {
      console.error("Failed to create deck:", err);
      toast.error("Failed to create deck");
      return null;
    }
  };

  const updateDeck = async (id: string, updates: Partial<FlashcardDeck>): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("flashcard_decks")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      setDecks((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
      toast.success("Deck updated");
      return true;
    } catch (err) {
      toast.error("Failed to update deck");
      return false;
    }
  };

  const deleteDeck = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("flashcard_decks")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setDecks((prev) => prev.filter((d) => d.id !== id));
      toast.success("Deck deleted");
      return true;
    } catch (err) {
      toast.error("Failed to delete deck");
      return false;
    }
  };

  return {
    decks,
    isLoading,
    refetch: fetchDecks,
    createDeck,
    updateDeck,
    deleteDeck,
  };
}

// Hook for flashcards within a deck
export function useFlashcards(deckId: string) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  const fetchCards = useCallback(async () => {
    if (!profile?.tenant_id || !deckId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("flashcards")
        .select("*")
        .eq("deck_id", deckId)
        .order("order_index");

      if (error) throw error;
      setCards(data || []);
    } catch (err) {
      console.error("Failed to fetch cards:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, deckId, supabase]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const createCard = async (input: {
    front_content: string;
    back_content: string;
    front_image_url?: string;
    back_image_url?: string;
    audio_url?: string;
    hints?: string[];
    tags?: string[];
  }): Promise<Flashcard | null> => {
    if (!profile?.tenant_id) return null;

    try {
      const maxOrder = cards.length > 0 ? Math.max(...cards.map((c) => c.order_index)) : -1;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("flashcards")
        .insert({
          tenant_id: profile.tenant_id,
          deck_id: deckId,
          front_content: input.front_content,
          back_content: input.back_content,
          front_image_url: input.front_image_url || null,
          back_image_url: input.back_image_url || null,
          audio_url: input.audio_url || null,
          hints: input.hints || [],
          tags: input.tags || [],
          order_index: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      setCards((prev) => [...prev, data]);
      return data;
    } catch (err) {
      toast.error("Failed to create card");
      return null;
    }
  };

  const updateCard = async (id: string, updates: Partial<Flashcard>): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("flashcards")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
      return true;
    } catch (err) {
      toast.error("Failed to update card");
      return false;
    }
  };

  const deleteCard = async (id: string): Promise<boolean> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("flashcards")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setCards((prev) => prev.filter((c) => c.id !== id));
      return true;
    } catch (err) {
      toast.error("Failed to delete card");
      return false;
    }
  };

  const reorderCards = async (cardIds: string[]): Promise<boolean> => {
    try {
      const updates = cardIds.map((id, index) => ({
        id,
        order_index: index,
      }));

       
      for (const update of updates) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("flashcards")
          .update({ order_index: update.order_index })
          .eq("id", update.id);
      }

      setCards((prev) => {
        const cardMap = new Map(prev.map((c) => [c.id, c]));
        return cardIds.map((id, index) => ({
          ...cardMap.get(id)!,
          order_index: index,
        }));
      });

      return true;
    } catch (err) {
      toast.error("Failed to reorder cards");
      return false;
    }
  };

  const importCards = async (cardsData: Array<{ front: string; back: string }>): Promise<number> => {
    if (!profile?.tenant_id) return 0;

    try {
      const maxOrder = cards.length > 0 ? Math.max(...cards.map((c) => c.order_index)) : -1;

      const newCards = cardsData.map((card, index) => ({
        tenant_id: profile.tenant_id,
        deck_id: deckId,
        front_content: card.front,
        back_content: card.back,
        order_index: maxOrder + 1 + index,
        hints: [],
        tags: [],
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("flashcards")
        .insert(newCards)
        .select();

      if (error) throw error;
      setCards((prev) => [...prev, ...(data || [])]);
      toast.success(`Imported ${data?.length || 0} cards`);
      return data?.length || 0;
    } catch (err) {
      toast.error("Failed to import cards");
      return 0;
    }
  };

  return {
    cards,
    isLoading,
    refetch: fetchCards,
    createCard,
    updateCard,
    deleteCard,
    reorderCards,
    importCards,
  };
}

// Hook for study session with spaced repetition
export function useFlashcardStudy(deckId: string) {
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });
  const { profile } = useUser();
  const supabase = createClient();

  const fetchDueCards = useCallback(async () => {
    if (!profile?.tenant_id || !profile?.id || !deckId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Use the database function to get due cards
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .rpc("get_due_flashcards", {
          p_user_id: profile.id,
          p_deck_id: deckId,
          p_limit: 50,
        });

      if (error) throw error;

      // Transform data
      const cards: Flashcard[] = (data || []).map((item: {
        card_id: string;
        front_content: string;
        back_content: string;
        front_image_url: string | null;
        back_image_url: string | null;
        ease_factor: number;
        interval_days: number;
        is_new: boolean;
      }) => ({
        id: item.card_id,
        front_content: item.front_content,
        back_content: item.back_content,
        front_image_url: item.front_image_url,
        back_image_url: item.back_image_url,
        ease_factor: item.ease_factor,
        interval_days: item.interval_days,
        is_new: item.is_new,
      }));

      setDueCards(cards);
      setCurrentIndex(0);
      setSessionStats({ reviewed: 0, correct: 0 });
    } catch (err) {
      console.error("Failed to fetch due cards:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.tenant_id, profile?.id, deckId, supabase]);

  useEffect(() => {
    fetchDueCards();
  }, [fetchDueCards]);

  const rateCard = async (quality: number): Promise<FlashcardProgress | null> => {
    if (!profile?.id) return null;

    const currentCard = dueCards[currentIndex];
    if (!currentCard) return null;

    try {
      // Use the database function for SM-2 algorithm
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .rpc("update_flashcard_progress", {
          p_user_id: profile.id,
          p_card_id: currentCard.id,
          p_quality: quality,
        });

      if (error) throw error;

      // Update session stats
      setSessionStats((prev) => ({
        reviewed: prev.reviewed + 1,
        correct: quality >= 3 ? prev.correct + 1 : prev.correct,
      }));

      // Move to next card
      if (currentIndex < dueCards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }

      return data;
    } catch (err) {
      console.error("Failed to rate card:", err);
      return null;
    }
  };

  const skipCard = () => {
    if (currentIndex < dueCards.length - 1) {
      // Move current card to end
      setDueCards((prev) => {
        const newCards = [...prev];
        const [skipped] = newCards.splice(currentIndex, 1);
        newCards.push(skipped);
        return newCards;
      });
    }
  };

  const currentCard = dueCards[currentIndex];
  const isSessionComplete = currentIndex >= dueCards.length || dueCards.length === 0;
  const progress = dueCards.length > 0 ? (currentIndex / dueCards.length) * 100 : 100;

  return {
    dueCards,
    currentCard,
    currentIndex,
    isLoading,
    isSessionComplete,
    sessionStats,
    progress,
    totalDue: dueCards.length,
    rateCard,
    skipCard,
    restartSession: fetchDueCards,
  };
}

// Hook for deck statistics and user progress
export function useFlashcardStats(deckId: string) {
  const [stats, setStats] = useState<{
    totalCards: number;
    cardsStudied: number;
    masteredCards: number;
    dueToday: number;
    averageEaseFactor: number;
    accuracyRate: number;
    streak: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { profile } = useUser();
  const supabase = createClient();

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile?.tenant_id || !profile?.id || !deckId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Get total cards
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count: totalCards } = await (supabase as any)
          .from("flashcards")
          .select("*", { count: "exact", head: true })
          .eq("deck_id", deckId);

        // Get progress data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: progressData } = await (supabase as any)
          .from("flashcard_progress")
          .select("*")
          .eq("user_id", profile.id)
          .in(
            "card_id",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (await (supabase as any)
              .from("flashcards")
              .select("id")
              .eq("deck_id", deckId)).data?.map((c: { id: string }) => c.id) || []
          );

        const progress = progressData || [];

        // Calculate stats
        const cardsStudied = progress.length;
        const masteredCards = progress.filter((p: FlashcardProgress) => p.ease_factor >= 2.5 && p.interval_days >= 21).length;
        const dueToday = progress.filter((p: FlashcardProgress) =>
          p.next_review_date && new Date(p.next_review_date) <= new Date()
        ).length + (totalCards || 0) - cardsStudied;

        const totalReviews = progress.reduce((sum: number, p: FlashcardProgress) => sum + p.total_reviews, 0);
        const totalCorrect = progress.reduce((sum: number, p: FlashcardProgress) => sum + p.correct_count, 0);

        setStats({
          totalCards: totalCards || 0,
          cardsStudied,
          masteredCards,
          dueToday: Math.max(0, dueToday),
          averageEaseFactor: progress.length > 0
            ? progress.reduce((sum: number, p: FlashcardProgress) => sum + p.ease_factor, 0) / progress.length
            : 2.5,
          accuracyRate: totalReviews > 0 ? (totalCorrect / totalReviews) * 100 : 0,
          streak: 0, // Would need separate tracking
        });
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [profile?.tenant_id, profile?.id, deckId, supabase]);

  return { stats, isLoading };
}
