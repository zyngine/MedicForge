"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/layouts";
import { Button, Input, Label, Alert, Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [isValidSession, setIsValidSession] = React.useState(false);

  // Listen for PASSWORD_RECOVERY event and verify session on mount
  React.useEffect(() => {
    const supabase = createClient();

    // Listen for PASSWORD_RECOVERY event fired when user clicks recovery link
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsValidSession(true);
        setIsVerifying(false);
      }
    });

    // Fallback: check if session already exists (event may have fired before listener attached)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsValidSession(true);
      } else {
        setError("Invalid or expired reset link. Please request a new one.");
      }
      setIsVerifying(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/[A-Z]/.test(pwd)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(pwd)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(pwd)) {
      return "Password must contain at least one number";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setIsSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"];

  if (isVerifying) {
    return (
      <AuthLayout
        title="Verifying..."
        description="Please wait while we verify your reset link"
      >
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Spinner size="lg" />
          <p className="text-muted-foreground">Verifying reset link...</p>
        </div>
      </AuthLayout>
    );
  }

  if (!isValidSession && !isSuccess) {
    return (
      <AuthLayout
        title="Link expired"
        description="This password reset link is no longer valid"
      >
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-error" />
            </div>
          </div>

          <Alert variant="error">
            {error || "This password reset link has expired or is invalid."}
          </Alert>

          <Button className="w-full" asChild>
            <Link href="/forgot-password">Request a new reset link</Link>
          </Button>

          <Button variant="ghost" className="w-full" asChild>
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (isSuccess) {
    return (
      <AuthLayout
        title="Password updated!"
        description="Your password has been successfully reset"
      >
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </div>

          <Alert variant="success">
            Your password has been updated successfully. You will be redirected to the login page shortly.
          </Alert>

          <Button className="w-full" asChild>
            <Link href="/login">Sign in now</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter your new password below"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="password" required>New password</Label>
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your new password"
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
            autoComplete="new-password"
            disabled={isLoading}
          />

          {/* Password strength indicator */}
          {password && (
            <div className="space-y-2">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < passwordStrength ? strengthColors[passwordStrength - 1] : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Password strength: {strengthLabels[passwordStrength - 1] || "Very Weak"}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" required>Confirm password</Label>
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your new password"
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
          Reset password
        </Button>

        <Button variant="ghost" className="w-full" asChild>
          <Link href="/login">Back to sign in</Link>
        </Button>
      </form>
    </AuthLayout>
  );
}
