"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/layouts";
import { Button, Input, Label, Checkbox, Alert, Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, Eye, EyeOff, GraduationCap, Stethoscope } from "lucide-react";

const DEMO_ACCOUNTS = {
  instructor: {
    email: "demo.instructor@medicforge.com",
    password: "DemoPass123!",
  },
  student: {
    email: "demo.student@medicforge.com",
    password: "DemoPass123!",
  },
};

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/student/dashboard";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [demoLoading, setDemoLoading] = React.useState<"instructor" | "student" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleDemoLogin = async (role: "instructor" | "student") => {
    setDemoLoading(role);
    setError(null);

    try {
      const supabase = createClient();

      // Sign out any existing session first
      await supabase.auth.signOut({ scope: 'local' });

      const account = DEMO_ACCOUNTS[role];

      const { error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      // Use hard redirect to ensure clean state
      if (role === "instructor") {
        window.location.href = "/instructor/dashboard";
      } else {
        window.location.href = "/student/dashboard";
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setDemoLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Sign out any existing session first to prevent stale session issues
      await supabase.auth.signOut({ scope: 'local' });

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

        // Redirect based on user role - use hard redirect for clean state
        if (profile?.role === "student") {
          window.location.href = "/student/dashboard";
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

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-background px-2 text-muted-foreground">
            Or try a demo
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex items-center justify-center gap-2"
          onClick={() => handleDemoLogin("instructor")}
          isLoading={demoLoading === "instructor"}
          disabled={isLoading || demoLoading !== null}
        >
          <GraduationCap className="h-4 w-4 text-blue-600" />
          <span>Instructor</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex items-center justify-center gap-2"
          onClick={() => handleDemoLogin("student")}
          isLoading={demoLoading === "student"}
          disabled={isLoading || demoLoading !== null}
        >
          <Stethoscope className="h-4 w-4 text-green-600" />
          <span>Student</span>
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Demo accounts are reset periodically
      </p>
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
