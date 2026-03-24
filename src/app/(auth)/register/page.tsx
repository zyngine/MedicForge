"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/layouts";
import { Button, Input, Label, Select, Alert, Checkbox, Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, User, Building, Eye, EyeOff, Key, GraduationCap } from "lucide-react";

type RegistrationType = "organization" | "instructor" | "student";

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <AuthLayout title="Create your account" description="Loading...">
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      </AuthLayout>
    }>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeFromUrl = searchParams.get("type") as RegistrationType | null;
  const agencyCodeFromUrl = searchParams.get("agency_code");
  const enrollmentCodeFromUrl = searchParams.get("enrollment_code");

  const [registrationType, setRegistrationType] = React.useState<RegistrationType>(
    typeFromUrl && ["organization", "instructor", "student"].includes(typeFromUrl)
      ? typeFromUrl
      : "organization"
  );
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [organizationName, setOrganizationName] = React.useState("");
  const [agencyCode, setAgencyCode] = React.useState(agencyCodeFromUrl || "");
  const [enrollmentCode, setEnrollmentCode] = React.useState(enrollmentCodeFromUrl || "");
  const [showPassword, setShowPassword] = React.useState(false);
  const [acceptTerms, setAcceptTerms] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    if (!acceptTerms) {
      setError("You must accept the terms and conditions");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      const metadata = {
        full_name: fullName,
        registration_type: registrationType,
        organization_name: registrationType === "organization" ? organizationName : undefined,
        agency_code: registrationType === "instructor" ? agencyCode : undefined,
        enrollment_code: registrationType === "student" ? enrollmentCode : undefined,
      };

      // Sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Check if we have a session (email confirmation is disabled)
      if (data.session && data.user) {
        // User is logged in immediately - set up their profile
        // Pass metadata directly since user_metadata might not be immediately available
        try {
          const response = await fetch("/api/auth/setup-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: data.user.id,
              email: data.user.email,
              metadata: metadata, // Use our local metadata directly
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            setError(result.error || "Failed to set up account");
            return;
          }

          // Always redirect to dashboard after registration
          // Billing page handles upgrade flows for paid plans
          if (result.role === "student") {
            router.push("/student/dashboard");
          } else {
            router.push("/instructor/dashboard");
          }
        } catch {
          setError("Failed to connect to server. Please try again.");
        }
      } else {
        // Email confirmation is required - show success message
        setSuccess(true);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout
        title="Check your email"
        description="We've sent you a confirmation link"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
            <Mail className="h-8 w-8 text-success" />
          </div>
          <p className="text-muted-foreground">
            We&apos;ve sent a confirmation email to <strong>{email}</strong>.
            Click the link in the email to verify your account.
          </p>
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
            <p className="text-sm text-warning-foreground">
              <strong>Important:</strong> Please open the verification link on the same device/browser you used to register.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/login")}>
            Back to login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  // Determine description based on plan
  const getDescription = () => {
    return "Get started with MedicForge";
  };

  return (
    <AuthLayout
      title="Create your account"
      description={getDescription()}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Registration Type */}
        <div className="space-y-2">
          <Label>I want to</Label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setRegistrationType("organization")}
              className={`p-4 rounded-lg border text-center transition-colors ${
                registrationType === "organization"
                  ? "border-primary bg-primary/5"
                  : "border-input hover:border-primary/50"
              }`}
            >
              <Building className="h-6 w-6 mx-auto mb-2" />
              <div className="font-medium text-sm">Create Org</div>
              <div className="text-xs text-muted-foreground">New organization</div>
            </button>
            <button
              type="button"
              onClick={() => setRegistrationType("instructor")}
              className={`p-3 rounded-lg border text-center transition-colors ${registrationType === "instructor" ? "border-primary bg-primary/5" : "border-input hover:border-primary/50"}`}
            >
              <GraduationCap className="h-5 w-5 mx-auto mb-1" />
              <div className="font-medium text-sm">Instructor</div>
              <div className="text-xs text-muted-foreground">Agency code</div>
            </button>
            <button
              type="button"
              onClick={() => setRegistrationType("student")}
              className={`p-4 rounded-lg border text-center transition-colors ${
                registrationType === "student"
                  ? "border-primary bg-primary/5"
                  : "border-input hover:border-primary/50"
              }`}
            >
              <User className="h-6 w-6 mx-auto mb-2" />
              <div className="font-medium text-sm">Student</div>
              <div className="text-xs text-muted-foreground">Enrollment code</div>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullName" required>Full name</Label>
          <Input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            leftIcon={<User className="h-4 w-4" />}
            required
            autoComplete="name"
            disabled={isLoading}
          />
        </div>

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

        {registrationType === "organization" && (
          <div className="space-y-2">
            <Label htmlFor="organizationName" required>Organization name</Label>
            <Input
              id="organizationName"
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Metro EMS Academy"
              leftIcon={<Building className="h-4 w-4" />}
              required
              disabled={isLoading}
            />
          </div>
        )}

        {registrationType === "instructor" && (
          <div className="space-y-2">
            <Label htmlFor="agencyCode" required>Agency code</Label>
            <Input
              id="agencyCode"
              type="text"
              value={agencyCode}
              onChange={(e) => setAgencyCode(e.target.value.toUpperCase())}
              placeholder="ABCD1234"
              leftIcon={<Key className="h-4 w-4" />}
              required
              disabled={isLoading}
              maxLength={10}
              className="uppercase"
            />
            <p className="text-xs text-muted-foreground">
              Get this code from your organization administrator
            </p>
          </div>
        )}

        {registrationType === "student" && (
          <div className="space-y-2">
            <Label htmlFor="enrollmentCode" required>Enrollment code</Label>
            <Input
              id="enrollmentCode"
              type="text"
              value={enrollmentCode}
              onChange={(e) => setEnrollmentCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              leftIcon={<Key className="h-4 w-4" />}
              required
              disabled={isLoading}
              maxLength={10}
              className="uppercase"
            />
            <p className="text-xs text-muted-foreground">
              Get this code from your instructor
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="password" required>Password</Label>
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
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
          <p className="text-xs text-muted-foreground">
            Must be at least 8 characters
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" required>Confirm password</Label>
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
            error={confirmPassword && password !== confirmPassword ? "Passwords do not match" : undefined}
          />
        </div>

        <Checkbox
          id="terms"
          checked={acceptTerms}
          onChange={setAcceptTerms}
          disabled={isLoading}
          label={
            <>
              I agree to the{" "}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </>
          }
        />

        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          {registrationType === "organization" ? "Create organization" : registrationType === "instructor" ? "Join as instructor" : "Join course"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
