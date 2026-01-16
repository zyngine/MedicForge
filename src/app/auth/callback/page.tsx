"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Processing authentication...");

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      console.log("[Auth Callback Client] Starting...", {
        code: !!code,
        token_hash: !!token_hash,
        type,
        errorParam,
        allParams: Object.fromEntries(searchParams.entries())
      });

      if (errorParam) {
        setError(errorDescription || errorParam);
        return;
      }

      try {
        const supabase = createClient();
        let data;
        let exchangeError;

        // Handle different auth flows
        if (token_hash && type) {
          // Token hash flow (email verification, password reset)
          setStatus("Verifying email...");
          console.log("[Auth Callback Client] Using verifyOtp with token_hash");

          const result = await supabase.auth.verifyOtp({
            token_hash,
            type: type as 'signup' | 'email' | 'recovery' | 'invite' | 'magiclink',
          });
          data = result.data;
          exchangeError = result.error;
        } else if (code) {
          // PKCE code flow
          setStatus("Exchanging code for session...");
          console.log("[Auth Callback Client] Exchanging code for session");

          const result = await supabase.auth.exchangeCodeForSession(code);
          data = result.data;
          exchangeError = result.error;
        } else {
          // Check if session already exists (might have been set by hash fragment)
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session) {
            data = { user: sessionData.session.user, session: sessionData.session };
          } else {
            setError("No authentication code or token provided");
            return;
          }
        }

        if (exchangeError) {
          console.error("[Auth Callback Client] Exchange error:", exchangeError);
          setError(exchangeError.message);
          return;
        }

        if (!data.user) {
          setError("No user returned from authentication");
          return;
        }

        console.log("[Auth Callback Client] Session created for:", data.user.email);
        setStatus("Setting up your account...");

        // Call server endpoint to create user profile
        const response = await fetch("/api/auth/setup-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: data.user.id,
            email: data.user.email,
            metadata: data.user.user_metadata,
          }),
        });

        const result = await response.json();
        console.log("[Auth Callback Client] Setup result:", result);

        if (!response.ok) {
          setError(result.error || "Failed to set up account");
          return;
        }

        setStatus("Redirecting to dashboard...");

        // Redirect based on role
        if (result.role === "student") {
          router.push("/student/dashboard");
        } else {
          router.push("/instructor/dashboard");
        }
      } catch (err) {
        console.error("[Auth Callback Client] Unexpected error:", err);
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-2xl">!</span>
          </div>
          <h1 className="text-xl font-bold mb-2">Authentication Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
