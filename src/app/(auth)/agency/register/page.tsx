"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/layouts";
import { Button, Input, Label, Alert, Spinner, Select } from "@/components/ui";
import { Building2, User, Mail, Lock, Eye, EyeOff, MapPin, Stethoscope } from "lucide-react";

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

function AgencyRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite");

  const [formData, setFormData] = React.useState({
    agencyName: "",
    adminName: "",
    email: "",
    password: "",
    confirmPassword: "",
    stateCode: "PA",
  });
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [inviteData, setInviteData] = React.useState<{
    md_name: string;
    email: string;
    tenant_id: string;
  } | null>(null);

  // Fetch invite data if invite code is present
  React.useEffect(() => {
    if (inviteCode) {
      fetchInviteData();
    }
  }, [inviteCode]);

  const fetchInviteData = async () => {
    try {
      const response = await fetch(`/api/agency/invite/${inviteCode}`);
      if (response.ok) {
        const data = await response.json();
        setInviteData(data);
        setFormData((prev) => ({
          ...prev,
          adminName: data.md_name,
          email: data.email,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch invite data:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    if (!inviteCode && !formData.agencyName.trim()) {
      setError("Agency name is required");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/setup-agency-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyName: formData.agencyName,
          adminName: formData.adminName,
          email: formData.email,
          password: formData.password,
          stateCode: formData.stateCode,
          inviteCode: inviteCode || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Registration failed");
        return;
      }

      // Redirect to agency dashboard
      if (result.tenantSlug) {
        // For subdomain-based routing
        const subdomain = result.tenantSlug;
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.medicforge.net";
        const baseHost = new URL(baseUrl).host;
        window.location.href = `https://${subdomain}.${baseHost}/agency/dashboard`;
      } else {
        router.push("/agency/dashboard");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isMDInvite = !!inviteCode;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {isMDInvite && (
        <Alert variant="info">
          <Stethoscope className="h-4 w-4" />
          <span>You have been invited to join as a Medical Director. Complete the form below to create your account.</span>
        </Alert>
      )}

      {/* Agency Name - only for new agency registration */}
      {!isMDInvite && (
        <div className="space-y-2">
          <Label htmlFor="agencyName" required>
            Agency Name
          </Label>
          <Input
            id="agencyName"
            type="text"
            placeholder="e.g., Metro Fire Rescue"
            value={formData.agencyName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, agencyName: e.target.value }))
            }
            leftIcon={<Building2 className="h-4 w-4" />}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Admin/MD Name */}
      <div className="space-y-2">
        <Label htmlFor="adminName" required>
          {isMDInvite ? "Your Name" : "Administrator Name"}
        </Label>
        <Input
          id="adminName"
          type="text"
          placeholder="John Smith"
          value={formData.adminName}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, adminName: e.target.value }))
          }
          leftIcon={<User className="h-4 w-4" />}
          disabled={isLoading || (isMDInvite && !!inviteData)}
        />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" required>
          Email Address
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="admin@agency.com"
          value={formData.email}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, email: e.target.value }))
          }
          leftIcon={<Mail className="h-4 w-4" />}
          disabled={isLoading || (isMDInvite && !!inviteData)}
        />
      </div>

      {/* State - only for new agency registration */}
      {!isMDInvite && (
        <div className="space-y-2">
          <Label htmlFor="stateCode" required>
            State
          </Label>
          <Select
            id="stateCode"
            value={formData.stateCode}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, stateCode: value }))
            }
            options={US_STATES}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">
            This determines the default skill requirements for your agency
          </p>
        </div>
      )}

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="password" required>
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a secure password"
            value={formData.password}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, password: e.target.value }))
            }
            leftIcon={<Lock className="h-4 w-4" />}
            disabled={isLoading}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" required>
          Confirm Password
        </Label>
        <Input
          id="confirmPassword"
          type={showPassword ? "text" : "password"}
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
          }
          leftIcon={<Lock className="h-4 w-4" />}
          disabled={isLoading}
        />
      </div>

      {/* Submit Button */}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Spinner size="sm" className="mr-2" />
            Creating Account...
          </>
        ) : isMDInvite ? (
          "Create Medical Director Account"
        ) : (
          "Create Agency Account"
        )}
      </Button>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </div>

      {!isMDInvite && (
        <div className="text-center text-sm text-muted-foreground">
          Looking for EMS education?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Register as a school
          </Link>
        </div>
      )}
    </form>
  );
}

export default function AgencyRegisterPage() {
  return (
    <AuthLayout
      title="Create Your Agency Account"
      description="Manage workforce competencies and medical director verifications"
    >
      <React.Suspense fallback={<Spinner size="lg" />}>
        <AgencyRegisterForm />
      </React.Suspense>
    </AuthLayout>
  );
}
