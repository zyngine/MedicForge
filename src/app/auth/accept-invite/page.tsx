"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui";

/**
 * Client-side handler for Supabase invite magic links.
 *
 * Supabase can deliver the invite session two ways:
 *
 * 1. Hash fragment (#access_token=...&type=invite) — implicit flow.
 *    The server never sees the hash, so we handle it here via
 *    onAuthStateChange which the Supabase SDK fires automatically.
 *
 * 2. Query param (?code=...&type=invite) — PKCE flow.
 *    The client-side SDK cannot exchange PKCE codes without a stored
 *    code verifier, so we forward the code to the server-side
 *    /auth/callback route which can exchange it properly and will then
 *    redirect to /set-password because type=invite is present.
 */
export default function AcceptInvitePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ── PKCE flow: ?code=xxx arrives as a query param ──────────────────
    // The server-side /auth/callback route can exchange PKCE codes and
    // already detects type=invite to redirect to /set-password.
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");
    if (code) {
      // Ensure type=invite is in the params so the callback knows to
      // redirect to /set-password instead of the dashboard.
      if (!searchParams.has("type")) {
        searchParams.set("type", "invite");
      }
      window.location.replace("/auth/callback?" + searchParams.toString());
      return;
    }

    // ── Implicit flow: #access_token=xxx arrives as a hash fragment ─────
    const supabase = createClient();

    // onAuthStateChange fires as soon as the SDK parses the hash
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.replace("/set-password");
      }
    });

    // Handle the case where the session was already set before this
    // component mounted (e.g. fast navigation / re-visit)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/set-password");
      }
    });

    // Timeout: if nothing fires the link is invalid or expired
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
