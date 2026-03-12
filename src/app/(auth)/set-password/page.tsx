"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/layouts";
import { Button, Input, Label, Alert, Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

/**
 * Set-password page for newly invited users.
 *
 * When an admin invites a user, they follow a magic link that establishes
 * their Supabase session via /auth/accept-invite. They are then sent here
 * to choose a permanent password before accessing their dashboard.
 */
export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [isValidSession, setIsValidSession] = React.useState(false);
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [userRole, setUserRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    const verify = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsValidSession(true);
          setUserEmail(session.user.email ?? null);
          setUserRole(session.user.user_metadata?.role ?? null);
        } else {
          setError("Session not found. Please use the invitation link from your email.");
        }
      } catch {
        setError("Unable to verify session. Please use the invitation link from your email.");
      } finally {
        setIsVerifying(false);
      }
    };
    verify();
  }, []);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return "Password must be at least 8 characters long";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(pwd)) return "Password must contain at least one lowercase letter";
    if (!/[0-9]/.test(pwd)) return "Password must contain at least one number";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      // Ensure user profile exists (idempotent)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetch("/api/auth/setup-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: session.user.id,
            email: session.user.email,
            metadata: session.user.user_metadata,
          }),
        });
      }
      setIsSuccess(true);
      setTimeout(() => {
        if (userRole === "admin") router.push("/admin/dashboard");
        else if (userRole === "student") router.push("/student/dashboard");
        else router.push("/instructor/dashboard");
      }, 2000);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (pwd: string) => {
    let s = 0;
    if (pwd.length >= 8) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[a-z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    if (/[^A-Za-z0-9]/.test(pwd)) s++;
    return s;
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-blue-500",
    "bg-green-500",
  ];

  if (isVerifying) {
    return (
      <AuthLayout title="Verifying..." description="Please wait a moment">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Spinner size="lg" />
          <p className="text-muted-foreground">Verifying your invitation…</p>
        </div>
      </AuthLayout>
    );
  }

  if (!isValidSession) {
    return (
      <AuthLayout
        title="Invitation expired"
        description="This invitation link is no longer valid"
      >
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-error" />
            </div>
          </div>
          <Alert variant="error">
            {error ??
              "This invitation link has expired or is invalid. Please contact your administrator for a new one."}
          </Alert>
          <Button variant="ghost" className="w-full" asChild>
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (isSuccess) {
    return (
      <AuthLayout title="Password set!" description="Your account is ready">
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </div>
          <Alert variant="success">
            Your password has been set. Taking you to your dashboard…
          </Alert>
        </div>
      </AuthLayout>
    );
  }

  const inviteDesc = userEmail
    ? "You have been invited as " + userEmail + ". Set a password to complete your registration."
    : "You have been invited. Set a password to complete your registration.";

  return (
    <AuthLayout title="Welcome to MedicForge!" description={inviteDesc}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="password" required>
            Password
          </Label>
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a strong password"
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            required
            autoFocus
            autoComplete="new-password"
            disabled={isLoading}
          />
          {password && (
            <div className="space-y-2">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={
                      "h-1 flex-1 rounded-full transition-colors " +
                      (i < passwordStrength ? strengthColors[passwordStrength - 1] : "bg-muted")
                    }
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Password strength: {strengthLabels[passwordStrength - 1] ?? "Very Weak"}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" required>
            Confirm password
          </Label>
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            leftIcon={<Lock className="h-4 w-4" />}
            required
            autoComplete="new-password"
            disabled={isLoading}
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="text-xs text-error">Passwords do not match</p>
          )}
          {confirmPassword && password === confirmPassword && (
            <p className="text-xs text-success flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Passwords match
            </p>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>Password requirements:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li className={password.length >= 8 ? "text-success" : ""}>
              At least 8 characters
            </li>
            <li className={/[A-Z]/.test(password) ? "text-success" : ""}>
              One uppercase letter
            </li>
            <li className={/[a-z]/.test(password) ? "text-success" : ""}>
              One lowercase letter
            </li>
            <li className={/[0-9]/.test(password) ? "text-success" : ""}>
              One number
            </li>
          </ul>
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          isLoading={isLoading}
          disabled={!password || !confirmPassword || password !== confirmPassword}
        >
          Set password and continue
        </Button>
      </form>
    </AuthLayout>
  );
}
