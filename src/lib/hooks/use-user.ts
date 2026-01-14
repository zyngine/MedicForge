"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type UserProfile = Database["public"]["Tables"]["users"]["Row"];

interface UseUserReturn {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Create a singleton supabase client
const supabase = createClient();

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const loadingRef = useRef(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }

      return data;
    } catch (err) {
      console.error("Profile fetch failed:", err);
      return null;
    }
  }, []);

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    let isMounted = true;
    loadingRef.current = true;

    const getUser = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (authError) {
          console.error("Auth error:", authError);
          loadingRef.current = false;
          setIsLoading(false);
          return;
        }

        setUser(user);

        if (user) {
          const profileData = await fetchProfile(user.id);
          if (isMounted) {
            setProfile(profileData);
          }
        }
      } catch (err) {
        console.error("getUser failed:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to get user"));
        }
      } finally {
        if (isMounted) {
          loadingRef.current = false;
          setIsLoading(false);
        }
      }
    };

    // Set a timeout to prevent infinite loading - use ref to check current state
    const timeout = setTimeout(() => {
      if (isMounted && loadingRef.current) {
        console.warn("User fetch timeout - stopping loading state");
        loadingRef.current = false;
        setIsLoading(false);
      }
    }, 10000);

    getUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      setUser(session?.user ?? null);

      if (session?.user) {
        const profileData = await fetchProfile(session.user.id);
        if (isMounted) {
          setProfile(profileData);
        }
      } else {
        setProfile(null);
      }

      loadingRef.current = false;
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return {
    user,
    profile,
    isLoading,
    error,
    signOut,
    refreshProfile,
  };
}

// Helper to get dashboard URL based on role
export function getDashboardUrl(role: string | null): string {
  switch (role) {
    case "student":
      return "/student/dashboard";
    case "instructor":
    case "admin":
      return "/instructor/dashboard";
    default:
      return "/login";
  }
}
