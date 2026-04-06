"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Alert,
  Spinner,
} from "@/components/ui";
import { Shield, Key, Lock, Clock, Save, AlertTriangle } from "lucide-react";
import { useTenant } from "@/lib/hooks/use-tenant";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";

interface SecuritySettings {
  require_mfa: boolean;
  session_timeout_minutes: number;
  password_min_length: number;
  password_require_uppercase: boolean;
  password_require_number: boolean;
  password_require_special: boolean;
  max_login_attempts: number;
  lockout_duration_minutes: number;
}

const defaultSettings: SecuritySettings = {
  require_mfa: false,
  session_timeout_minutes: 480,
  password_min_length: 8,
  password_require_uppercase: true,
  password_require_number: true,
  password_require_special: false,
  max_login_attempts: 5,
  lockout_duration_minutes: 30,
};

export default function SecuritySettingsPage() {
  const { tenant, isLoading: tenantLoading, refetch } = useTenant();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SecuritySettings>(defaultSettings);

  const canUseSecurity =
    tenant?.subscription_tier === "institution" ||
    tenant?.subscription_tier === "enterprise";

  useEffect(() => {
    if (tenant?.settings) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tenantSettings = tenant.settings as Record<string, any>;
      const security = (tenantSettings.security || {}) as Partial<SecuritySettings>;
      setSettings({ ...defaultSettings, ...security });
    }
  }, [tenant]);

  const handleToggle = (key: keyof SecuritySettings) => {
    if (typeof settings[key] === "boolean") {
      setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const handleNumberChange = (key: keyof SecuritySettings, value: number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!tenant) return;

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const updatedSettings = {
        ...(tenant.settings || {}),
        security: settings,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from("tenants")
        .update({
          settings: updatedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tenant.id);

      if (updateError) throw updateError;

      toast.success("Security settings saved");
      refetch();
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save security settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const ToggleSwitch = ({
    checked,
    onChange,
    disabled,
  }: {
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
  }) => (
    <label className={`relative inline-flex items-center ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
    </label>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Security</h1>
        <p className="text-muted-foreground">
          Configure authentication and security settings for your organization
        </p>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* MFA Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Multi-Factor Authentication
          </CardTitle>
          <CardDescription>
            Require users to verify their identity with a second factor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canUseSecurity ? (
            <div className="flex items-center justify-between py-2">
              <div>
                <Label className="font-medium">Require MFA for all users</Label>
                <p className="text-sm text-muted-foreground">
                  Users will need to set up authenticator app or SMS verification
                </p>
              </div>
              <ToggleSwitch
                checked={settings.require_mfa}
                onChange={() => handleToggle("require_mfa")}
              />
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-dashed text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">
                MFA is available on Institution and Enterprise plans.
              </p>
              <Button variant="link" className="mt-2" asChild>
                <Link href="/admin/billing">Upgrade Plan</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Settings
          </CardTitle>
          <CardDescription>
            Configure how long users stay logged in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
            <Input
              id="sessionTimeout"
              type="number"
              min={15}
              max={1440}
              value={settings.session_timeout_minutes}
              onChange={(e) =>
                handleNumberChange("session_timeout_minutes", parseInt(e.target.value) || 480)
              }
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Users will be logged out after this period of inactivity (15-1440 minutes)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Password Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Password Policy
          </CardTitle>
          <CardDescription>
            Set requirements for user passwords
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="minLength">Minimum Password Length</Label>
            <Input
              id="minLength"
              type="number"
              min={6}
              max={32}
              value={settings.password_min_length}
              onChange={(e) =>
                handleNumberChange("password_min_length", parseInt(e.target.value) || 8)
              }
              className="w-32"
            />
          </div>

          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <Label className="font-medium">Require uppercase letter</Label>
              <p className="text-sm text-muted-foreground">
                Password must contain at least one uppercase letter (A-Z)
              </p>
            </div>
            <ToggleSwitch
              checked={settings.password_require_uppercase}
              onChange={() => handleToggle("password_require_uppercase")}
            />
          </div>

          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <Label className="font-medium">Require number</Label>
              <p className="text-sm text-muted-foreground">
                Password must contain at least one number (0-9)
              </p>
            </div>
            <ToggleSwitch
              checked={settings.password_require_number}
              onChange={() => handleToggle("password_require_number")}
            />
          </div>

          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <Label className="font-medium">Require special character</Label>
              <p className="text-sm text-muted-foreground">
                Password must contain at least one special character (!@#$%^&*)
              </p>
            </div>
            <ToggleSwitch
              checked={settings.password_require_special}
              onChange={() => handleToggle("password_require_special")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Login Protection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Login Protection
          </CardTitle>
          <CardDescription>
            Protect against brute force attacks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxAttempts">Max Login Attempts</Label>
              <Input
                id="maxAttempts"
                type="number"
                min={3}
                max={10}
                value={settings.max_login_attempts}
                onChange={(e) =>
                  handleNumberChange("max_login_attempts", parseInt(e.target.value) || 5)
                }
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                Account locked after this many failed attempts
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lockoutDuration">Lockout Duration (minutes)</Label>
              <Input
                id="lockoutDuration"
                type="number"
                min={5}
                max={1440}
                value={settings.lockout_duration_minutes}
                onChange={(e) =>
                  handleNumberChange("lockout_duration_minutes", parseInt(e.target.value) || 30)
                }
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                How long accounts stay locked
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SSO Link */}
      <Card>
        <CardHeader>
          <CardTitle>Single Sign-On (SSO)</CardTitle>
          <CardDescription>
            Configure enterprise authentication providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Set up SAML, OIDC, or social login providers for your organization.
          </p>
          <Button variant="outline" asChild>
            <Link href="/admin/settings/sso">
              Configure SSO
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
