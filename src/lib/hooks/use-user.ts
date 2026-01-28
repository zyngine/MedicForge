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
        // First check if we have a session (fast, from cookies)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (sessionError || !session) {
          // No session, user is not logged in
          loadingRef.current = false;
          setIsLoading(false);
          return;
        }

        // We have a session, now verify with getUser (validates JWT with server)
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!isMounted) return;

        if (authError) {
          // Token might be expired, try to refresh
          console.log("Auth error, attempting refresh:", authError.message);
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

          if (refreshError || !refreshData.user) {
            console.error("Session refresh failed:", refreshError);
            loadingRef.current = false;
            setIsLoading(false);
            return;
          }

          // Refresh succeeded, use the new user data
          setUser(refreshData.user);
          if (refreshData.user) {
            const profileData = await fetchProfile(refreshData.user.id);
            if (isMounted) {
              setProfile(profileData);
            }
          }
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

    // Set a timeout to prevent infinite loading - increased to 15 seconds
    // to allow for session refresh which can take longer
    const timeout = setTimeout(() => {
      if (isMounted && loadingRef.current) {
        console.warn("User fetch timeout - stopping loading state");
        loadingRef.current = false;
        setIsLoading(false);
      }
    }, 15000);

    getUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      // Handle different auth events
      if (event === "TOKEN_REFRESHED") {
        console.log("Session token refreshed");
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        loadingRef.current = false;
        setIsLoading(false);
        return;
      }

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

  // Separate effect for visibility change - refresh session when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && user) {
        try {
          const { error } = await supabase.auth.refreshSession();
          if (error) {
            console.log("Background refresh failed, session may have expired");
          }
        } catch (err) {
          console.error("Visibility refresh error:", err);
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
      // Clear local state first
      setUser(null);
      setProfile(null);

      // Sign out from Supabase (clears auth cookies)
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      // Ignore AbortErrors and other errors during sign out
      console.error("Sign out error:", err);
    } finally {
      // Clear all auth-related cookies manually as fallback
      if (typeof document !== "undefined") {
        // Clear tenant cookies
        document.cookie = "tenant_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "tenant_slug=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

        // Clear any Supabase auth cookies that might remain
        const cookies = document.cookie.split(";");
        for (const cookie of cookies) {
          const cookieName = cookie.split("=")[0].trim();
          if (cookieName.includes("supabase") || cookieName.includes("sb-")) {
            document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
            // Also try with domain variations
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
