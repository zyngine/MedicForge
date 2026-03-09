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
let cachedUserId: string | null = null; // Track which user ID the cache is for

// Try to load cached profile from localStorage for instant display
function loadCachedProfile(): { profile: UserProfile; userId: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem("user_profile_cache");
    if (cached) {
      const parsed = JSON.parse(cached);
      // Check if cache is less than 1 hour old and has userId
      if (parsed.timestamp && parsed.userId && Date.now() - parsed.timestamp < 3600000) {
        return { profile: parsed.profile, userId: parsed.userId };
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

// Clear all cached state (call when user changes)
function clearCachedState() {
  cachedUser = null;
  cachedProfile = null;
  cachedUserId = null;
  authInitialized = false;
  if (typeof window !== "undefined") {
    localStorage.removeItem("user_profile_cache");
  }
}

function saveCachedProfile(profile: UserProfile | null, userId?: string) {
  if (typeof window === "undefined") return;
  try {
    if (profile && userId) {
      localStorage.setItem("user_profile_cache", JSON.stringify({
        profile,
        userId,
        timestamp: Date.now(),
      }));
    } else {
      localStorage.removeItem("user_profile_cache");
    }
  } catch {
    // Ignore storage errors
  }
}

export function useUser(): UseUserReturn {
  // Initialize from cache to prevent loading flash on navigation
  // Try localStorage cache first for instant display
  const [user, setUser] = useState<User | null>(cachedUser);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    if (cachedProfile) return cachedProfile;
    const localCached = loadCachedProfile();
    if (localCached) {
      cachedProfile = localCached.profile;
      cachedUserId = localCached.userId;
      return localCached.profile;
    }
    return null;
  });
  // Only show loading if we don't have any cached profile
  const [isLoading, setIsLoading] = useState(() => {
    const hasLocalCache = loadCachedProfile() !== null;
    return !authInitialized && !cachedProfile && !hasLocalCache;
  });
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

      try {
        // Get session from cookies (fast, no network call if token valid)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        // Check if cached user matches current session user
        // If different, clear the cache to prevent showing wrong user data
        const currentUserId = session?.user?.id || null;
        if (cachedUserId !== null && cachedUserId !== currentUserId) {
          console.log("User changed, clearing cached state");
          clearCachedState();
        }

        // If we've already initialized with matching user, skip re-fetching
        if (authInitialized && cachedUser !== null && cachedUserId === currentUserId) {
          setUser(cachedUser);
          setProfile(cachedProfile);
          setIsLoading(false);
          return;
        }

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

        // We have a session - set user immediately
        cachedUser = session.user;
        cachedUserId = session.user.id;
        setUser(session.user);

        // Try to create a temporary profile from auth metadata for instant display
        const metadata = session.user.user_metadata;
        const tempProfile: UserProfile | null = metadata?.full_name ? {
          id: session.user.id,
          email: session.user.email || "",
          full_name: metadata.full_name || session.user.email?.split("@")[0] || "User",
          role: metadata.role || "student",
          tenant_id: metadata.tenant_id || null,
          avatar_url: metadata.avatar_url || null,
          created_at: session.user.created_at,
          updated_at: new Date().toISOString(),
          phone: null,
          emergency_contact: null,
          is_active: true,
          agency_role: null,
        } as UserProfile : null;

        // If we have metadata, show it immediately while fetching full profile
        if (tempProfile) {
          cachedProfile = tempProfile;
          setProfile(tempProfile);
          authInitialized = true;
          setIsLoading(false);
        }

        // Fetch full profile in background (or foreground if no temp profile)
        if (session.user) {
          try {
            const profileData = await fetchProfile(session.user.id);
            if (isMounted && profileData) {
              cachedProfile = profileData;
              setProfile(profileData);
              saveCachedProfile(profileData, session.user.id); // Cache for next page load
            }
          } catch (profileErr) {
            console.error("Profile fetch failed:", profileErr);
            // If we have temp profile, that's fine - already showing it
          }
        }

        // If we didn't have temp profile, now mark as done loading
        if (isMounted && !tempProfile) {
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

    // Set timeout (15 seconds) to prevent infinite loading states
    // NOTE: We do NOT clear cookies on timeout - that destroys the user's session
    // Instead, just log and stop loading to let the user continue with cached data
    const timeout = setTimeout(() => {
      if (isMounted && !authInitialized) {
        console.warn("Auth initialization timed out after 8s - proceeding with cached data");
        authInitialized = true;
        setIsLoading(false);
        // Keep any cached data we have - don't clear user/profile state
        // The auth listener will update state when the request eventually completes
      }
    }, 8000);

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT") {
        clearCachedState();
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // Check if user changed
        if (cachedUserId && session?.user?.id && cachedUserId !== session.user.id) {
          console.log("User changed via auth event, clearing cached state");
          clearCachedState();
        }

        cachedUser = session?.user ?? null;
        cachedUserId = session?.user?.id ?? null;
        setUser(session?.user ?? null);

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          if (isMounted) {
            cachedProfile = profileData;
            setProfile(profileData);
            saveCachedProfile(profileData, session.user.id);
          }
        } else {
          clearCachedState();
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
      clearCachedState();
      setUser(null);
      setProfile(null);

      // Sign out from Supabase
      await supabase.auth.signOut({ scope: 'global' });
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
