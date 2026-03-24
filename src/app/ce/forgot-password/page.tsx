"use client";

import { useState } from "react";
import Link from "next/link";
import { createCEClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Input } from "@/components/ui";
import { Button } from "@/components/ui";
import { Alert } from "@/components/ui";
import { Spinner } from "@/components/ui";
import { BookOpen } from "lucide-react";

export default function CEForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createCEClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/ce/reset-password`,
      });

      if (resetError) {
        setError("Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <BookOpen className="h-7 w-7 text-red-700" />
          <span className="text-xl font-bold">MedicForge CE</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Reset your password</CardTitle>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  If an account exists with that email, you'll receive a password reset link.
                </p>
                <Link
                  href="/ce/login"
                  className="text-sm text-red-700 hover:underline font-medium"
                >
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <>
                {error && (
                  <Alert variant="error" className="mb-4">
                    {error}
                  </Alert>
                )}

                <p className="text-sm text-muted-foreground mb-4">
                  Enter your email address and we'll send you a link to reset your password.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Spinner size="sm" />
                        Sending...
                      </span>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center text-sm">
                  <Link href="/ce/login" className="text-red-700 hover:underline font-medium">
                    Back to Sign In
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="mt-2 text-center text-xs text-muted-foreground">
          <Link href="/ce" className="hover:underline">
            &larr; Back to CE Home
          </Link>
        </div>
      </div>
    </div>
  );
}
