"use client";

import { useEffect, useState, useCallback } from "react";
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

// Use singleton client
const supabase = createClient();

// Module-level cache for auth state to persist across navigations
let cachedUser: User | null = null;
let cachedProfile: UserProfile | null = null;
let authInitialized = false;

export function useUser(): UseUserReturn {
  // Initialize from cache to prevent loading flash on navigation
  const [user, setUser] = useState<User | null>(cachedUser);
  const [profile, setProfile] = useState<UserProfile | null>(cachedProfile);
  // Only show loading if we haven't initialized auth yet
  const [isLoading, setIsLoading] = useState(!authInitialized);
  const [error, setError] = useState<Error | null>(null);

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
    let effectInitialized = false;

    const initAuth = async () => {
      // Prevent double initialization within same effect cycle
      if (effectInitialized) return;
      effectInitialized = true;

      // If we've already initialized and have cached state, skip re-fetching
      if (authInitialized && cachedUser !== null) {
        setUser(cachedUser);
        setProfile(cachedProfile);
        setIsLoading(false);
        return;
      }

      try {
        // Get session from cookies (synchronous, fast)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (sessionError) {
          console.error("Session error:", sessionError.message);
          authInitialized = true;
          setIsLoading(false);
          return;
        }

        if (!session) {
          // No session, user is not logged in
          authInitialized = true;
          cachedUser = null;
          cachedProfile = null;
          setIsLoading(false);
          return;
        }

        // We have a session - set user immediately from session
        cachedUser = session.user;
        setUser(session.user);

        // Fetch profile
        if (session.user) {
          const profileData = await fetchProfile(session.user.id);
          if (isMounted) {
            cachedProfile = profileData;
            setProfile(profileData);
          }
        }

        if (isMounted) {
          authInitialized = true;
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Auth init failed:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to initialize auth"));
          authInitialized = true;
          setIsLoading(false);
        }
      }
    };

    // Set a shorter timeout (5 seconds) to prevent long loading states
    const timeout = setTimeout(() => {
      if (isMounted && !authInitialized) {
        console.warn("Auth initialization timed out");
        authInitialized = true;
        setIsLoading(false);
      }
    }, 5000);

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT") {
        cachedUser = null;
        cachedProfile = null;
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        cachedUser = session?.user ?? null;
        setUser(session?.user ?? null);

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          if (isMounted) {
            cachedProfile = profileData;
            setProfile(profileData);
          }
        } else {
          cachedProfile = null;
          setProfile(null);
        }

        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Refresh session when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && user) {
        try {
          await supabase.auth.refreshSession();
        } catch (err) {
          // Silently ignore refresh errors
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user]);

  const signOut = async () => {
    try {
      // Clear cached and local state first
      cachedUser = null;
      cachedProfile = null;
      authInitialized = false;
      setUser(null);
      setProfile(null);

      // Sign out from Supabase
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      // Clear all auth-related cookies manually as fallback
      if (typeof document !== "undefined") {
        document.cookie = "tenant_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "tenant_slug=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

        const cookies = document.cookie.split(";");
        for (const cookie of cookies) {
          const cookieName = cookie.split("=")[0].trim();
          if (cookieName.includes("supabase") || cookieName.includes("sb-")) {
            document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
            document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${window.location.hostname}`;
          }
        }
      }
    }
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
