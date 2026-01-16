"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Spinner } from "@/components/ui";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Processing authentication...");

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      console.log("[Auth Callback Client] Starting...", { code: !!code, errorParam });

      if (errorParam) {
        setError(errorDescription || errorParam);
        return;
      }

      if (!code) {
        setError("No authentication code provided");
        return;
      }

      try {
        const supabase = createClient();

        setStatus("Exchanging code for session...");
        console.log("[Auth Callback Client] Exchanging code for session");

        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

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
