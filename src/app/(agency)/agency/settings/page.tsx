"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Select,
  Alert,
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui";
import {
  Building2,
  Bell,
  Shield,
  Save,
  MapPin,
} from "lucide-react";
import { useAgencyRole } from "@/lib/hooks/use-agency-role";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useAgencySettings } from "@/lib/hooks/use-agency-data";

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

export default function SettingsPage() {
  const { isAgencyAdmin } = useAgencyRole();
  const { tenant } = useTenant();
  const { settings, isLoading, saveSettings } = useAgencySettings();

  const [isSaving, setIsSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const [agencySettings, setAgencySettings] = React.useState({
    name: "",
    stateCode: "PA",
    address: "",
    phone: "",
    email: "",
    verificationReminderDays: "30",
    expirationWarningDays: "60",
  });

  // Populate form from loaded settings
  React.useEffect(() => {
    if (settings) {
      setAgencySettings({
        name: (settings.agency_name as string) || tenant?.name || "",
        stateCode: (settings.state_code as string) || "PA",
        address: (settings.address as string) || "",
        phone: (settings.phone as string) || "",
        email: (settings.contact_email as string) || "",
        verificationReminderDays: String(settings.verification_reminder_days ?? 30),
        expirationWarningDays: String(settings.expiration_warning_days ?? 60),
      });
    } else if (tenant) {
      setAgencySettings((prev) => ({ ...prev, name: tenant.name || "" }));
    }
  }, [settings, tenant]);

  const handleSave = async () => {
    setIsSaving(true);
    setSuccess(false);
    setSaveError(null);
    try {
      await saveSettings({
        agency_name: agencySettings.name,
        state_code: agencySettings.stateCode,
        address: agencySettings.address,
        phone: agencySettings.phone,
        contact_email: agencySettings.email,
        verification_reminder_days: parseInt(agencySettings.verificationReminderDays, 10),
        expiration_warning_days: parseInt(agencySettings.expirationWarningDays, 10),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAgencyAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">Access Denied</p>
            <p className="text-sm text-muted-foreground">
              Only administrators can access settings
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Agency Settings</h1>
          <p className="text-muted-foreground">
            Manage your agency configuration
          </p>
        </div>
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

      {success && (
        <Alert variant="success" onClose={() => setSuccess(false)}>
          Settings saved successfully
        </Alert>
      )}
      {saveError && (
        <Alert variant="error" onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      )}

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">
            <Building2 className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-6">
          {/* Agency Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Agency Information
              </CardTitle>
              <CardDescription>
                Basic agency details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Agency Name</Label>
                <Input
                  id="name"
                  value={agencySettings.name}
                  onChange={(e) =>
                    setAgencySettings((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Metro Fire Rescue"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="stateCode">State</Label>
                  <Select
                    id="stateCode"
                    value={agencySettings.stateCode}
                    onChange={(value) =>
                      setAgencySettings((prev) => ({ ...prev, stateCode: value }))
                    }
                    options={US_STATES}
                  />
                  <p className="text-xs text-muted-foreground">
                    Determines skill requirements
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={agencySettings.phone}
                    onChange={(e) =>
                      setAgencySettings((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={agencySettings.address}
                  onChange={(e) =>
                    setAgencySettings((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="123 Main St, City, State 12345"
                  leftIcon={<MapPin className="h-4 w-4" />}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={agencySettings.email}
                  onChange={(e) =>
                    setAgencySettings((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="admin@agency.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Agency Code */}
          <Card>
            <CardHeader>
              <CardTitle>Agency Code</CardTitle>
              <CardDescription>
                Share this code with employees for self-registration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <code className="text-2xl font-mono font-bold tracking-wider bg-muted px-4 py-2 rounded-lg">
                  {tenant?.id?.slice(0, 6).toUpperCase() || "------"}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const code = tenant?.id?.slice(0, 6).toUpperCase() || "";
                    navigator.clipboard.writeText(code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure reminder and alert timing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reminderDays">
                    Verification Reminder (days before due)
                  </Label>
                  <Input
                    id="reminderDays"
                    type="number"
                    value={agencySettings.verificationReminderDays}
                    onChange={(e) =>
                      setAgencySettings((prev) => ({
                        ...prev,
                        verificationReminderDays: e.target.value,
                      }))
                    }
                    min="1"
                    max="90"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warningDays">
                    Expiration Warning (days before expiry)
                  </Label>
                  <Input
                    id="warningDays"
                    type="number"
                    value={agencySettings.expirationWarningDays}
                    onChange={(e) =>
                      setAgencySettings((prev) => ({
                        ...prev,
                        expirationWarningDays: e.target.value,
                      }))
                    }
                    min="1"
                    max="180"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
