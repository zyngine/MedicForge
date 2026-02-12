"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/layouts";
import { Button, Input, Label, Checkbox, Alert, Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/student/dashboard";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // signInWithPassword automatically replaces any existing session
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      // Get user profile to determine redirect
      if (data.user) {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", data.user.id)
          .single();

        let role = profile?.role;

        // If no profile exists, call setup-user to create one
        // This handles users who verified email but callback failed
        if (!profile) {
          console.log("[Login] No profile found, calling setup-user...");
          try {
            const setupResponse = await fetch("/api/auth/setup-user", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: data.user.id,
                email: data.user.email,
                metadata: data.user.user_metadata,
              }),
            });
            const setupResult = await setupResponse.json();
            console.log("[Login] Setup result:", setupResult);
            if (setupResponse.ok && setupResult.role) {
              role = setupResult.role;
            }
          } catch (setupError) {
            console.error("[Login] Setup error:", setupError);
          }
        }

        // Redirect based on user role - use hard redirect for clean state
        if (role === "student") {
          window.location.href = "/student/dashboard";
        } else if (role === "admin") {
          window.location.href = "/admin/dashboard";
        } else {
          window.location.href = "/instructor/dashboard";
        }
      } else {
        window.location.href = redirect;
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" required>Password</Label>
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          leftIcon={<Lock className="h-4 w-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="focus:outline-none"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          }
          required
          autoComplete="current-password"
          disabled={isLoading}
        />
      </div>

      <Checkbox
        id="remember"
        label="Remember me"
        checked={rememberMe}
        onChange={setRememberMe}
        disabled={isLoading}
      />

      <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
        Sign in
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-background px-2 text-muted-foreground">
            New to MedicForge?
          </span>
        </div>
      </div>

      <Button variant="outline" className="w-full" size="lg" asChild>
        <Link href="/register">Create an account</Link>
      </Button>
    </form>
  );
}

function LoginFormFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <Spinner size="lg" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to your MedicForge account"
    >
      <React.Suspense fallback={<LoginFormFallback />}>
        <LoginFormContent />
      </React.Suspense>
    </AuthLayout>
  );
}
