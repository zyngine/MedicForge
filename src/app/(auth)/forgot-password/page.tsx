"use client";

import * as React from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/layouts";
import { Button, Input, Label, Alert } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setIsSuccess(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <AuthLayout
        title="Check your email"
        description="We've sent you a password reset link"
      >
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-muted-foreground">
              We&apos;ve sent a password reset link to:
            </p>
            <p className="font-medium">{email}</p>
          </div>

          <Alert variant="info">
            Check your inbox and click the link to reset your password.
            The link will expire in 1 hour.
          </Alert>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setIsSuccess(false);
                setEmail("");
              }}
            >
              Try a different email
            </Button>

            <Button variant="ghost" className="w-full" asChild>
              <Link href="/login">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to sign in
              </Link>
            </Button>
          </div>

          <p className="text-sm text-center text-muted-foreground">
            Didn&apos;t receive the email? Check your spam folder or{" "}
            <button
              onClick={handleSubmit}
              className="text-primary hover:underline"
              disabled={isLoading}
            >
              click here to resend
            </button>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot password?"
      description="Enter your email and we'll send you a reset link"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" required>Email address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            leftIcon={<Mail className="h-4 w-4" />}
            required
            autoComplete="email"
            disabled={isLoading}
          />
        </div>

        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          Send reset link
        </Button>

        <Button variant="ghost" className="w-full" asChild>
          <Link href="/login">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to sign in
          </Link>
        </Button>
      </form>
    </AuthLayout>
  );
}
