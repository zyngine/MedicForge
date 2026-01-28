"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/layouts";
import { Button, Input, Label, Alert } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, Eye, EyeOff, Shield } from "lucide-react";

export default function PlatformAdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Sign in
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (!data.user) {
        setError("Authentication failed");
        return;
      }

      // Check if user is a platform admin using RPC function (bypasses RLS)
      const { data: isAdmin, error: adminError } = await supabase
        .rpc("is_platform_admin");

      if (adminError || !isAdmin) {
        // Sign out if not an admin
        await supabase.auth.signOut();
        setError("Access denied. This login is for platform administrators only.");
        return;
      }

      // Redirect to admin dashboard using hard redirect for clean state
      window.location.href = "/platform-admin/dashboard";
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Platform Admin"
      description="Sign in to the MedicForge admin portal"
    >
      <div className="mb-6 p-4 bg-muted rounded-lg flex items-center gap-3">
        <Shield className="h-5 w-5 text-primary" />
        <span className="text-sm text-muted-foreground">
          This area is restricted to MedicForge administrators
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" required>
            Admin Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@medicforge.com"
            leftIcon={<Mail className="h-4 w-4" />}
            required
            autoComplete="email"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" required>
            Password
          </Label>
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

        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          <Shield className="h-4 w-4 mr-2" />
          Sign in as Admin
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Regular users should{" "}
          <a href="/login" className="text-primary hover:underline">
            sign in here
          </a>
        </p>
      </form>
    </AuthLayout>
  );
}
