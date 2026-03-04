"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui";

/**
 * Client-side handler for Supabase invite magic links.
 *
 * Supabase's inviteUserByEmail sends the session as a URL hash fragment
 * (#access_token=...&type=invite). Hash fragments are never sent to the
 * server, so a server-side route.ts cannot handle them. This client-side
 * page lets the Supabase SDK read the hash, establish the session, then
 * redirect the user to the set-password page.
 */
export default function AcceptInvitePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // onAuthStateChange fires as soon as the SDK parses the hash fragment
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        // Session is established — send the user to set their password
        router.replace("/auth/set-password");
      }
    });

    // Also handle the case where the session was already set before
    // this component mounted (e.g. fast navigation)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/auth/set-password");
      }
    });

    // Timeout: if the SDK never fires SIGNED_IN the link is invalid/expired
    const timeout = setTimeout(() => {
      setError(
        "This invitation link is invalid or has expired. Please contact your administrator for a new one."
      );
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold">Invitation Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <a
            href="/login"
            className="inline-block text-primary underline underline-offset-4"
          >
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Spinner size="lg" />
        <p className="text-muted-foreground">Setting up your account&hellip;</p>
      </div>
    </div>
  );
}
