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
import { Building2, Save, Upload } from "lucide-react";
import { useTenant } from "@/lib/hooks/use-tenant";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function OrganizationPage() {
  const { tenant, isLoading: tenantLoading, error: tenantError, refetch } = useTenant();

  // Debug logging
  console.log("[Organization] tenant:", tenant?.id, tenant?.name);
  console.log("[Organization] tenantLoading:", tenantLoading);
  console.log("[Organization] tenantError:", tenantError);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [website, setWebsite] = useState("");

  // Initialize form with tenant data
  useEffect(() => {
    if (tenant) {
      setName(tenant.name || "");
      setSlug(tenant.slug || "");
      const settings = (tenant.settings || {}) as Record<string, string>;
      setContactEmail(settings.contact_email || "");
      setContactPhone(settings.contact_phone || "");
      setAddress(settings.address || "");
      setCity(settings.city || "");
      setState(settings.state || "");
      setZipCode(settings.zip_code || "");
      setWebsite(settings.website || "");
    }
  }, [tenant]);

  const handleSave = async () => {
    if (!tenant) {
      setError("Unable to load organization. Please try refreshing the page or contact support.");
      return;
    }
    if (!name.trim()) {
      setError("Organization name is required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      const updatedSettings = {
        ...(tenant.settings || {}),
        contact_email: contactEmail,
        contact_phone: contactPhone,
        address,
        city,
        state,
        zip_code: zipCode,
        website,
      };

      const { error: updateError } = await (supabase as any)
        .from("tenants")
        .update({
          name: name.trim(),
          settings: updatedSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", tenant.id);

      if (updateError) throw updateError;

      toast.success("Organization details saved");
      refetch();
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save organization details");
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

  if (!tenant) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold">Organization</h1>
          <p className="text-muted-foreground">
            Manage your organization&apos;s profile and contact information
          </p>
        </div>
        <Alert variant="error">
          Unable to load organization data. This may happen if your account setup is incomplete.
          Please try logging out and back in, or contact support at admin@medicforge.net.
          {tenantError && <div className="mt-2 text-xs">Error: {tenantError.message}</div>}
        </Alert>
        <Button onClick={() => refetch()}>
          Retry Loading
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Organization</h1>
        <p className="text-muted-foreground">
          Manage your organization&apos;s profile and contact information
        </p>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Basic Information
          </CardTitle>
          <CardDescription>
            Your organization&apos;s name and identifier
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Organization Name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Organization Slug</Label>
            <Input
              id="slug"
              value={slug}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Your portal URL: {slug}.medicforge.net (contact support to change)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website (optional)</Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://www.yourorganization.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>
            How students and instructors can reach your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@yourorganization.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
          <CardDescription>
            Your organization&apos;s physical location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main Street"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input
                id="zipCode"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="12345"
              />
            </div>
          </div>
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
