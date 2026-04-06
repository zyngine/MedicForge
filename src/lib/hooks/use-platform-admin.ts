"use client";

/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface UsePlatformAdminReturn {
  user: User | null;
  isPlatformAdmin: boolean;
  isLoading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
}

export function usePlatformAdmin(): UsePlatformAdminReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const checkPlatformAdmin = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        setUser(user);

        if (user) {
          // Use RPC function to check admin status (bypasses RLS)
          const { data: isAdmin, error: adminError } = await supabase
            .rpc("is_platform_admin");

          if (adminError) {
            console.error("Error checking admin status:", adminError);
          }

          setIsPlatformAdmin(!!isAdmin);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to check admin status"));
      } finally {
        setIsLoading(false);
      }
    };

    checkPlatformAdmin();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        const { data: isAdmin } = await supabase.rpc("is_platform_admin");
        setIsPlatformAdmin(!!isAdmin);
      } else {
        setIsPlatformAdmin(false);
      }

      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsPlatformAdmin(false);
  };

  return {
    user,
    isPlatformAdmin,
    isLoading,
    error,
    signOut,
  };
}
