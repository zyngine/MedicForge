"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui";

/**
 * Client-side handler for Supabase invite magic links.
 *
 * Supabase can deliver the invite session in two ways:
 *
 * 1. Query param (?code=...) — PKCE flow.
 *    Forward to the server-side /auth/callback which exchanges the code
 *    and redirects to /set-password (because type=invite is appended).
 *
 * 2. Hash fragment (#access_token=...&type=invite) — implicit flow.
 *    Supabase sends invite tokens as hash fragments even on PKCE-configured
 *    projects. The browser client with flowType:'pkce' ignores hash tokens,
 *    so we must parse the hash ourselves and call setSession() directly.
 *    onAuthStateChange is kept as a fallback for any remaining SDK-handled cases.
 */
export default function AcceptInvitePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ── PKCE flow: ?code=xxx arrives as a query param ──────────────────
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");
    if (code) {
      if (!searchParams.has("type")) {
        searchParams.set("type", "invite");
      }
      window.location.replace("/auth/callback?" + searchParams.toString());
      return;
    }

    // ── Implicit/hash flow: #access_token=xxx ──────────────────────────
    // The PKCE browser client ignores hash-based tokens, so handle manually.
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token") ?? "";
    if (accessToken) {
      const supabase = createClient();
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: sessionError }) => {
          if (sessionError) {
            setError(
              "This invitation link is invalid or has expired. Please contact your administrator for a new one."
            );
          } else {
            router.replace("/set-password");
          }
        });
      return;
    }

    // ── Fallback: SDK auto-detection via onAuthStateChange ─────────────
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.replace("/set-password");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/set-password");
      }
    });

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
