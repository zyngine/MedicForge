"use client";

import { useEffect, useLayoutEffect, useState, useCallback } from "react";

// useLayoutEffect runs before paint on the client; fall back to useEffect on the server
// to avoid the SSR warning ("useLayoutEffect does nothing on the server").
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

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
  // Do NOT read localStorage here — it runs on the server too (during SSR) and
  // would produce a different value than the server, causing React error #418.
  // localStorage is restored in useEffect instead.
  const [profile, setProfile] = useState<UserProfile | null>(cachedProfile);
  const [isLoading, setIsLoading] = useState(!authInitialized && !cachedProfile);
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

  // Restore localStorage cache before the browser paints so returning users
  // never see a spinner flash. useLayoutEffect is synchronous with the DOM
  // paint cycle; the isomorphic wrapper avoids the SSR warning.
  useIsomorphicLayoutEffect(() => {
    if (!cachedProfile) {
      const localCached = loadCachedProfile();
      if (localCached) {
        cachedProfile = localCached.profile;
        cachedUserId = localCached.userId;
        setProfile(localCached.profile);
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let effectInitialized = false;

    const initAuth = async () => {
      // Prevent double initialization within same effect cycle
      if (effectInitialized) return;
      effectInitialized = true;

      try {
        // Race getSession against a 4s timeout — getSession auto-refreshes
        // expired tokens (a network call), which can hang in Chrome
        let session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] = null;
        let sessionError: Error | null = null;

        try {
          const result = await Promise.race([
            supabase.auth.getSession(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("getSession timeout")), 8000)
            ),
          ]);
          session = result.data.session;
          if (result.error) sessionError = result.error;
        } catch (_timeoutErr) {
          console.warn("[useUser] getSession timed out, using cached data");
          // If we have cached data, proceed with it — the onAuthStateChange
          // listener will update state when the refresh eventually completes
          if (cachedUser && cachedProfile) {
            setUser(cachedUser);
            setProfile(cachedProfile);
            authInitialized = true;
            setIsLoading(false);
            // Kick off a background refresh so the session recovers
            supabase.auth.refreshSession().catch(() => {});
            return;
          }
        }

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

    // Safety timeout to prevent infinite loading states.
    // After 8s, force-unblock and clear stale cache. If there's no profile,
    // the consumer's redirect-to-login effect will fire.
    const timeout = setTimeout(() => {
      if (isMounted && !authInitialized) {
        console.warn("[useUser] Auth initialization timed out after 8s — unblocking UI");
        authInitialized = true;
        // Don't keep stale cached profile if auth never confirmed
        if (!cachedUser) {
          cachedProfile = null;
          setProfile(null);
        }
        setIsLoading(false);
        // Kick off a background refresh so the session can recover
        supabase.auth.refreshSession().catch(() => {});
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
          const { data, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            console.warn("[useUser] Session refresh failed:", refreshError.message);
            // If refresh token is invalid/expired, clear state so the layout
            // redirects to login instead of showing a stale UI
            if (
              refreshError.message.includes("invalid") ||
              refreshError.message.includes("expired") ||
              refreshError.message.includes("Token")
            ) {
              clearCachedState();
              setUser(null);
              setProfile(null);
            }
          } else if (data.session) {
            // Update cached user from refreshed session
            cachedUser = data.session.user;
            setUser(data.session.user);
          }
        } catch (err) {
          console.warn("[useUser] Session refresh error:", err);
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
      // Include SameSite and Secure attributes to match how they were set (required by Chrome)
      if (typeof document !== "undefined") {
        const expiry = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
        const isSecure = window.location.protocol === "https:";
        const secureSuffix = isSecure ? "; Secure; SameSite=Lax" : "; SameSite=Lax";

        document.cookie = `tenant_id=; path=/; ${expiry}${secureSuffix}`;
        document.cookie = `tenant_slug=; path=/; ${expiry}${secureSuffix}`;

        const cookies = document.cookie.split(";");
        for (const cookie of cookies) {
          const cookieName = cookie.split("=")[0].trim();
          if (cookieName.includes("supabase") || cookieName.includes("sb-")) {
            document.cookie = `${cookieName}=; path=/; ${expiry}${secureSuffix}`;
            document.cookie = `${cookieName}=; path=/; ${expiry}; domain=${window.location.hostname}${secureSuffix}`;
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
