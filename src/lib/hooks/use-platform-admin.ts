"use client";

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
          // Check if user is in platform_admins table
          const { data: adminData, error: adminError } = await supabase
            .from("platform_admins")
            .select("id, role")
            .eq("user_id", user.id)
            .single();

          if (adminError && adminError.code !== "PGRST116") {
            // PGRST116 = no rows found, which is fine
            console.error("Error checking admin status:", adminError);
          }

          setIsPlatformAdmin(!!adminData);
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
        const { data: adminData } = await supabase
          .from("platform_admins")
          .select("id, role")
          .eq("user_id", session.user.id)
          .single();

        setIsPlatformAdmin(!!adminData);
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
