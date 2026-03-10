"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Input } from "@/components/ui";
import { Button } from "@/components/ui";
import { Alert } from "@/components/ui";
import { Select } from "@/components/ui";
import { Spinner } from "@/components/ui";
import { BookOpen, Eye, EyeOff } from "lucide-react";

const CERTIFICATION_LEVELS = [
  { value: "EMR", label: "Emergency Medical Responder (EMR)" },
  { value: "EMT", label: "Emergency Medical Technician (EMT)" },
  { value: "AEMT", label: "Advanced EMT (AEMT)" },
  { value: "Paramedic", label: "Paramedic" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

type RegistrationType = "individual" | "agency_employee";

export default function CERegisterPage() {
  const router = useRouter();
  const [regType, setRegType] = useState<RegistrationType>("individual");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [certLevel, setCertLevel] = useState("");
  const [state, setState] = useState("");
  const [nremtId, setNremtId] = useState("");
  const [agencyCode, setAgencyCode] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      // Sign up with Supabase auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            ce_registration_type: regType,
            certification_level: certLevel,
            state,
            nremt_id: nremtId || null,
            agency_invite_code: regType === "agency_employee" ? agencyCode : null,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError("An account with this email already exists. Please sign in.");
        } else {
          setError(signUpError.message);
        }
        return;
      }

      if (!authData.user) {
        setError("Registration failed. Please try again.");
        return;
      }

      // If session created immediately (email confirm off), call setup API
      if (authData.session) {
        const setupRes = await fetch("/api/ce/auth/setup-ce-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: authData.user.id,
            email,
            firstName,
            lastName,
            certificationLevel: certLevel,
            state,
            nremtId: nremtId || null,
            registrationType: regType,
            agencyInviteCode: regType === "agency_employee" ? agencyCode : null,
          }),
        });

        const setupData = await setupRes.json();

        if (!setupRes.ok) {
          setError(setupData.error || "Account setup failed. Please contact support.");
          return;
        }

        // Redirect to terms (must accept before using the platform)
        router.push("/ce/terms?redirect=/ce/my-training");
      } else {
        // Email confirmation required
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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <BookOpen className="h-12 w-12 text-red-700 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Check your email</h2>
          <p className="text-gray-600 mb-6">
            We sent a confirmation link to <strong>{email}</strong>. Click the link
            to activate your CE account, then sign in.
          </p>
          <Link href="/ce/login">
            <Button className="w-full">Go to Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <BookOpen className="h-7 w-7 text-red-700" />
          <span className="text-xl font-bold">MedicForge CE</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Create your CE account</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="error" className="mb-4">
                {error}
              </Alert>
            )}

            {/* Registration Type */}
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => setRegType("individual")}
                className={`flex-1 py-2 px-3 text-sm rounded-md border transition-colors ${
                  regType === "individual"
                    ? "bg-red-700 text-white border-red-700"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Individual Provider
              </button>
              <button
                type="button"
                onClick={() => setRegType("agency_employee")}
                className={`flex-1 py-2 px-3 text-sm rounded-md border transition-colors ${
                  regType === "agency_employee"
                    ? "bg-red-700 text-white border-red-700"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Agency Employee
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name</label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Smith"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Certification Level</label>
                <Select
                  value={certLevel}
                  onChange={(value) => setCertLevel(value)}
                  options={CERTIFICATION_LEVELS}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">State</label>
                  <Select
                    value={state}
                    onChange={(value) => setState(value)}
                    options={US_STATES.map((s) => ({ value: s, label: s }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    NREMT ID{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <Input
                    value={nremtId}
                    onChange={(e) => setNremtId(e.target.value)}
                    placeholder="E-123456"
                    className="font-mono"
                  />
                </div>
              </div>

              {regType === "agency_employee" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Agency Invite Code</label>
                  <Input
                    value={agencyCode}
                    onChange={(e) => setAgencyCode(e.target.value.toUpperCase())}
                    placeholder="AGENCY-CODE"
                    className="font-mono"
                    required={regType === "agency_employee"}
                  />
                  <p className="text-xs text-muted-foreground">
                    Get this code from your agency administrator.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    autoComplete="new-password"
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm Password</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  autoComplete="new-password"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                By creating an account, you agree to our{" "}
                <Link href="/ce/terms" target="_blank" className="text-red-700 hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/ce/privacy" target="_blank" className="text-red-700 hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" />
                    Creating account...
                  </span>
                ) : (
                  "Create CE Account"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have a CE account?{" "}
              <Link href="/ce/login" className="text-red-700 hover:underline font-medium">
                Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
