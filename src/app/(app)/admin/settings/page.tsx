"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  Button,
  Alert,
  Spinner,
} from "@/components/ui";
import {
  Globe,
  Building2,
  Bell,
  Shield,
  Palette,
  ChevronRight,
  Key,
  Copy,
  RefreshCw,
  Check,
  HardDrive,
  KeyRound,
} from "lucide-react";
import { useTenant } from "@/lib/hooks/use-tenant";
import { createClient } from "@/lib/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const settingsItems = [
  {
    title: "Custom Domain",
    description: "Configure a custom domain for your organization",
    href: "/admin/settings/domains",
    icon: Globe,
  },
  {
    title: "Organization Profile",
    description: "Update your organization name, logo, and branding",
    href: "/admin/settings/profile",
    icon: Building2,
  },
  {
    title: "Notifications",
    description: "Configure email notifications and alerts",
    href: "/admin/settings/notifications",
    icon: Bell,
  },
  {
    title: "Security",
    description: "Manage authentication and security settings",
    href: "/admin/settings/security",
    icon: Shield,
  },
  {
    title: "Appearance",
    description: "Customize colors and branding for your portal",
    href: "/admin/settings/appearance",
    icon: Palette,
  },
  {
    title: "Storage",
    description: "Monitor storage usage and manage quota",
    href: "/admin/settings/storage",
    icon: HardDrive,
  },
  {
    title: "Single Sign-On",
    description: "Configure SAML, OIDC, and social login providers",
    href: "/admin/settings/sso",
    icon: KeyRound,
  },
];

// Generate a unique 8-character agency code
function generateAgencyCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function SettingsPage() {
  const { tenant, isLoading: tenantLoading, refetch: refetchTenant } = useTenant();
  const queryClient = useQueryClient();
  const [copied, setCopied] = React.useState<"code" | "link" | false>(false);
  const [error, setError] = React.useState<string | null>(null);

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("No tenant");
      
      const supabase = createClient();
      const newCode = generateAgencyCode();
      
      const { error } = await (supabase as any)
        .from("tenants")
        .update({ agency_code: newCode })
        .eq("id", tenant.id);
      
      if (error) throw error;
      return newCode;
    },
    onSuccess: () => {
      refetchTenant();
      queryClient.invalidateQueries({ queryKey: ["tenant"] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to regenerate code");
    },
  });

  const handleCopyCode = async () => {
    if (tenant?.agency_code) {
      await navigator.clipboard.writeText(tenant.agency_code);
      setCopied("code");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    if (tenant?.agency_code) {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://medicforge.com";
      const inviteLink = `${baseUrl}/register?type=instructor&agency_code=${tenant.agency_code}`;
      await navigator.clipboard.writeText(inviteLink);
      setCopied("link");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization settings
        </p>
      </div>

      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Agency Code Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Instructor Agency Code
          </CardTitle>
          <CardDescription>
            Share this code with instructors to allow them to join your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tenantLoading ? (
            <div className="flex items-center justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : tenant?.agency_code ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="font-mono text-2xl tracking-wider bg-muted px-4 py-3 rounded-lg text-center">
                    {tenant.agency_code}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCode}
                    disabled={!!copied}
                  >
                    {copied === "code" ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Code
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => regenerateMutation.mutate()}
                    disabled={regenerateMutation.isPending}
                  >
                    {regenerateMutation.isPending ? (
                      <Spinner size="sm" />
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Invite Link */}
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Instructor Invite Link</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Share this link with instructors - they can register with one click
                    </p>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleCopyLink}
                    disabled={!!copied}
                  >
                    {copied === "link" ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Invite Link
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-center py-4">
              No agency code available. Please contact support.
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-3">
            Instructors can either enter the code manually during registration, or use the invite link which pre-fills everything.
            Regenerating the code will invalidate the old one and any existing invite links.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {settingsItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
