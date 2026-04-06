"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useRef, useEffect } from "react";
import NextImage from "next/image";
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
import { Palette, Upload, X, Eye, Check } from "lucide-react";
import { useTenant } from "@/lib/hooks/use-tenant";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// Logo preview component with error handling
function LogoPreview({ url }: { url: string | null }) {
  const [hasError, setHasError] = useState(false);

  // Reset error when URL changes
  useEffect(() => {
    setHasError(false);
  }, [url]);

  if (!url) {
    return <span className="text-muted-foreground text-sm">No logo</span>;
  }

  if (hasError) {
    return (
      <div className="text-center">
        <span className="text-destructive text-xs">Failed to load</span>
        <p className="text-muted-foreground text-xs mt-1">Check bucket is public</p>
      </div>
    );
  }

  return (
    <NextImage
      src={url}
      alt="Organization logo"
      width={200}
      height={200}
      className="max-w-full max-h-full object-contain"
      unoptimized
      onError={() => setHasError(true)}
    />
  );
}

// Preset color options
const colorPresets = [
  { name: "Red", value: "#C53030" },
  { name: "Blue", value: "#1e40af" },
  { name: "Green", value: "#047857" },
  { name: "Purple", value: "#6b21a8" },
  { name: "Orange", value: "#c2410c" },
  { name: "Teal", value: "#0d9488" },
  { name: "Pink", value: "#be185d" },
  { name: "Indigo", value: "#4338ca" },
];

export default function AppearanceSettingsPage() {
  const { tenant, isLoading: tenantLoading, refetch } = useTenant();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [primaryColor, setPrimaryColor] = useState("#C53030");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [whiteLabel, setWhiteLabel] = useState(false);
  const [previewColor, setPreviewColor] = useState<string | null>(null);

  // Initialize form with tenant data
  useEffect(() => {
    if (tenant) {
      setPrimaryColor(tenant.primary_color || "#C53030");
      setLogoUrl(tenant.logo_url);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setWhiteLabel((tenant as any).white_label_enabled || false);
    }
  }, [tenant]);

  const canUseWhiteLabel =
    tenant?.subscription_tier === "institution" ||
    tenant?.subscription_tier === "enterprise";

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenant) {
      console.log("[Logo Upload] No file or tenant", { file: !!file, tenant: !!tenant });
      return;
    }

    console.log("[Logo Upload] Starting upload:", { fileName: file.name, fileSize: file.size, fileType: file.type });

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (PNG, JPG, SVG)");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo must be less than 2MB");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `${tenant.id}/logo.${fileExt}`;

      console.log("[Logo Upload] Uploading to:", fileName);

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("assets")
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type,
        });

      console.log("[Logo Upload] Upload result:", { data: uploadData, error: uploadError });

      if (uploadError) {
        // If bucket doesn't exist, try creating it or use a URL input fallback
        if (uploadError.message.includes("Bucket not found") || uploadError.message.includes("bucket")) {
          setError(
            "Storage bucket 'assets' not found. Please create it in Supabase Storage or enter a logo URL directly."
          );
          setIsUploading(false);
          return;
        }
        // Handle RLS/permission errors
        if (uploadError.message.includes("security") || uploadError.message.includes("policy") || uploadError.message.includes("permission")) {
          setError(
            `Storage permission error: ${uploadError.message}. Please check storage policies.`
          );
          setIsUploading(false);
          return;
        }
        throw uploadError;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("assets").getPublicUrl(fileName);

      console.log("[Logo Upload] Public URL:", publicUrl);

      setLogoUrl(publicUrl);
      toast.success("Logo uploaded successfully");
    } catch (err) {
      console.error("[Logo Upload] Error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to upload logo: ${errorMessage}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
  };

  const handleSave = async () => {
    if (!tenant) return;

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {
        primary_color: primaryColor,
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      };

      // Only set white_label if user has the tier for it
      if (canUseWhiteLabel) {
        updateData.white_label_enabled = whiteLabel;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from("tenants")
        .update(updateData)
        .eq("id", tenant.id);

      if (updateError) throw updateError;

      toast.success("Appearance settings saved");
      refetch();

      // Apply the new primary color immediately
      document.documentElement.style.setProperty("--primary", primaryColor);
    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreviewColor = (color: string) => {
    setPreviewColor(color);
    document.documentElement.style.setProperty("--primary", color);
  };

  const handleSelectColor = (color: string) => {
    setPrimaryColor(color);
    setPreviewColor(null);
    document.documentElement.style.setProperty("--primary", color);
  };

  const handleResetPreview = () => {
    if (previewColor) {
      document.documentElement.style.setProperty("--primary", primaryColor);
      setPreviewColor(null);
    }
  };

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Appearance</h1>
        <p className="text-muted-foreground">
          Customize your organization&apos;s branding and colors
        </p>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Logo Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Organization Logo
          </CardTitle>
          <CardDescription>
            Upload your organization&apos;s logo. Recommended size: 200x50px
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Logo Preview */}
          <div className="flex items-center gap-6">
            <div className="w-48 h-16 border rounded-lg flex items-center justify-center bg-muted/50 overflow-hidden">
              <LogoPreview url={logoUrl} />
            </div>

            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Spinner size="sm" className="mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {logoUrl ? "Change Logo" : "Upload Logo"}
              </Button>

              {logoUrl && (
                <Button
                  variant="ghost"
                  onClick={handleRemoveLogo}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              )}
            </div>
          </div>

          {/* Manual URL Input */}
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Or enter logo URL</Label>
            <Input
              id="logoUrl"
              type="url"
              value={logoUrl || ""}
              onChange={(e) => setLogoUrl(e.target.value || null)}
              placeholder="https://example.com/logo.png"
            />
          </div>

          {/* Troubleshooting tip */}
          <p className="text-xs text-muted-foreground">
            If your uploaded logo shows as broken, ensure the storage bucket is set to public in your Supabase dashboard.
          </p>
        </CardContent>
      </Card>

      {/* Color Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Primary Color
          </CardTitle>
          <CardDescription>
            Choose your organization&apos;s brand color for buttons, links, and
            accents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Color Presets */}
          <div>
            <Label className="mb-2 block">Quick Select</Label>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handleSelectColor(preset.value)}
                  onMouseEnter={() => handlePreviewColor(preset.value)}
                  onMouseLeave={handleResetPreview}
                  className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                    primaryColor === preset.value
                      ? "border-foreground ring-2 ring-offset-2"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: preset.value }}
                  title={preset.name}
                >
                  {primaryColor === preset.value && (
                    <Check className="h-5 w-5 text-white mx-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Color Input */}
          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="customColor">Custom Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => handleSelectColor(e.target.value)}
                  className="w-12 h-10 rounded border cursor-pointer"
                />
                <Input
                  id="customColor"
                  type="text"
                  value={primaryColor}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                      setPrimaryColor(val);
                      if (val.length === 7) {
                        document.documentElement.style.setProperty(
                          "--primary",
                          val
                        );
                      }
                    }
                  }}
                  placeholder="#C53030"
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="border rounded-lg p-4 space-y-3">
            <Label>Preview</Label>
            <div className="flex items-center gap-4">
              <Button size="sm">Primary Button</Button>
              <Button size="sm" variant="outline">
                Outline Button
              </Button>
              <a href="#" className="text-primary hover:underline text-sm">
                Sample Link
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* White Label Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            White Label
          </CardTitle>
          <CardDescription>
            Remove MedicForge branding from your portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canUseWhiteLabel ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Hide MedicForge Branding</p>
                <p className="text-sm text-muted-foreground">
                  Remove &quot;Powered by MedicForge&quot; from footer and login
                  pages
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={whiteLabel}
                  onChange={(e) => setWhiteLabel(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-dashed text-center">
              <p className="text-muted-foreground">
                White-label is available on Institution and Enterprise plans.
              </p>
              <Button variant="link" className="mt-2" asChild>
                <a href="/admin/billing">Upgrade your plan</a>
              </Button>
            </div>
          )}
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
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}
