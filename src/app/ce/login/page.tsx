"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Input } from "@/components/ui";
import { Button } from "@/components/ui";
import { Alert } from "@/components/ui";
import { Spinner } from "@/components/ui";
import { BookOpen, Eye, EyeOff } from "lucide-react";

export default function CELoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/ce/my-training";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("Invalid email or password. Please try again.");
        return;
      }

      if (!authData.user) {
        setError("Login failed. Please try again.");
        return;
      }

      // Check for CE user profile
      const { data: ceUser } = await supabase
        .from("ce_users")
        .select("id, role, terms_accepted_at")
        .eq("id", authData.user.id)
        .single();

      if (!ceUser) {
        await supabase.auth.signOut();
        setError(
          "No CE account found for this email. Please register for a CE account."
        );
        return;
      }

      // Enforce terms acceptance
      if (!ceUser.terms_accepted_at) {
        router.push(`/ce/terms?redirect=${encodeURIComponent(redirectTo)}`);
        return;
      }

      // Role-based redirect
      if (ceUser.role === "admin") {
        router.push("/ce/admin");
      } else if (ceUser.role === "agency_admin") {
        router.push("/ce/agency");
      } else {
        router.push(redirectTo);
      }
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
            <CardTitle className="text-center">Sign in to your CE account</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="error" className="mb-4">
                {error}
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Password</label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-red-700 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have a CE account?{" "}
              <Link href="/ce/register" className="text-red-700 hover:underline font-medium">
                Register
              </Link>
            </div>

            <div className="mt-2 text-center text-xs text-muted-foreground">
              <Link href="/ce" className="hover:underline">
                ← Back to CE Home
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          This is a separate login from the MedicForge LMS.{" "}
          <Link href="/login" className="hover:underline">
            LMS Login →
          </Link>
        </p>
      </div>
    </div>
  );
}
