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
  Badge,
} from "@/components/ui";
import {
  Shield,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  Copy,
  ExternalLink,
  Settings,
  TestTube,
} from "lucide-react";
import { useSSOConfig, SSOConfig, SSOProvider } from "@/lib/hooks/use-sso";
import { useTenant } from "@/lib/hooks/use-tenant";
import { toast } from "sonner";

export default function SSOSettingsPage() {
  const { tenant } = useTenant();
  const {
    configs,
    isLoading,
    createConfig,
    updateConfig,
    deleteConfig,
    enableConfig,
    disableConfig,
    setAsDefault,
    testConnection,
    getSPMetadata,
  } = useSSOConfig();

  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SSOConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [showMetadata, setShowMetadata] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<SSOConfig>>({
    provider: "saml",
    name: "",
    saml_entity_id: "",
    saml_sso_url: "",
    saml_slo_url: "",
    saml_certificate: "",
    oidc_issuer: "",
    oidc_client_id: "",
    oidc_client_secret: "",
    oidc_discovery_url: "",
    auto_provision_users: true,
    default_role: "student",
    allowed_domains: [],
  });

  const canUseSSO =
    tenant?.subscription_tier === "institution" ||
    tenant?.subscription_tier === "enterprise";

  const resetForm = () => {
    setFormData({
      provider: "saml",
      name: "",
      saml_entity_id: "",
      saml_sso_url: "",
      saml_slo_url: "",
      saml_certificate: "",
      oidc_issuer: "",
      oidc_client_id: "",
      oidc_client_secret: "",
      oidc_discovery_url: "",
      auto_provision_users: true,
      default_role: "student",
      allowed_domains: [],
    });
    setEditingConfig(null);
    setShowForm(false);
  };

  const handleEdit = (config: SSOConfig) => {
    setFormData({ ...config });
    setEditingConfig(config);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("Please provide a name for this configuration");
      return;
    }

    setIsSaving(true);
    try {
      if (editingConfig) {
        await updateConfig(editingConfig.id, formData);
      } else {
        await createConfig(formData);
      }
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this SSO configuration?")) {
      return;
    }
    await deleteConfig(id);
  };

  const handleTest = async (id: string) => {
    setIsTesting(id);
    const result = await testConnection(id);
    setIsTesting(null);

    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const copyMetadata = (configId: string) => {
    const metadata = getSPMetadata(configId);
    navigator.clipboard.writeText(metadata);
    toast.success("SP Metadata copied to clipboard");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!canUseSSO) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold">Single Sign-On (SSO)</h1>
          <p className="text-muted-foreground">
            Configure enterprise authentication for your organization
          </p>
        </div>

        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                SSO is available on Institution and Enterprise plans
              </h3>
              <p className="text-muted-foreground mb-4">
                Upgrade your subscription to enable SAML, OIDC, and social login
                integrations.
              </p>
              <Button asChild>
                <a href="/admin/billing">Upgrade Plan</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Single Sign-On (SSO)</h1>
          <p className="text-muted-foreground">
            Configure enterprise authentication for your organization
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Provider
          </Button>
        )}
      </div>

      {/* Configuration Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingConfig ? "Edit SSO Provider" : "Add SSO Provider"}
            </CardTitle>
            <CardDescription>
              Configure a new SSO provider for your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Provider Type Selection */}
            <div className="space-y-2">
              <Label>Provider Type</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {(["saml", "oidc", "google", "microsoft", "okta"] as SSOProvider[]).map(
                  (provider) => (
                    <button
                      key={provider}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, provider })
                      }
                      className={`p-3 border rounded-lg text-center transition-colors ${
                        formData.provider === provider
                          ? "border-primary bg-primary/5"
                          : "hover:border-muted-foreground/50"
                      }`}
                    >
                      <div className="font-medium capitalize">{provider}</div>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Company Okta, Azure AD"
              />
            </div>

            {/* SAML Configuration */}
            {formData.provider === "saml" && (
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-medium">SAML Configuration</h4>

                <div className="space-y-2">
                  <Label htmlFor="saml_entity_id">Identity Provider Entity ID</Label>
                  <Input
                    id="saml_entity_id"
                    value={formData.saml_entity_id || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, saml_entity_id: e.target.value })
                    }
                    placeholder="https://idp.example.com/entity"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="saml_sso_url">SSO URL</Label>
                  <Input
                    id="saml_sso_url"
                    value={formData.saml_sso_url || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, saml_sso_url: e.target.value })
                    }
                    placeholder="https://idp.example.com/sso"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="saml_slo_url">Single Logout URL (optional)</Label>
                  <Input
                    id="saml_slo_url"
                    value={formData.saml_slo_url || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, saml_slo_url: e.target.value })
                    }
                    placeholder="https://idp.example.com/slo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="saml_certificate">X.509 Certificate</Label>
                  <textarea
                    id="saml_certificate"
                    className="w-full h-32 px-3 py-2 border rounded-md font-mono text-sm"
                    value={formData.saml_certificate || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, saml_certificate: e.target.value })
                    }
                    placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                  />
                </div>
              </div>
            )}

            {/* OIDC Configuration */}
            {formData.provider === "oidc" && (
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-medium">OIDC Configuration</h4>

                <div className="space-y-2">
                  <Label htmlFor="oidc_issuer">Issuer URL</Label>
                  <Input
                    id="oidc_issuer"
                    value={formData.oidc_issuer || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, oidc_issuer: e.target.value })
                    }
                    placeholder="https://accounts.google.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="oidc_client_id">Client ID</Label>
                  <Input
                    id="oidc_client_id"
                    value={formData.oidc_client_id || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, oidc_client_id: e.target.value })
                    }
                    placeholder="your-client-id"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="oidc_client_secret">Client Secret</Label>
                  <Input
                    id="oidc_client_secret"
                    type="password"
                    value={formData.oidc_client_secret || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        oidc_client_secret: e.target.value,
                      })
                    }
                    placeholder="your-client-secret"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="oidc_discovery_url">
                    Discovery URL (optional)
                  </Label>
                  <Input
                    id="oidc_discovery_url"
                    value={formData.oidc_discovery_url || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        oidc_discovery_url: e.target.value,
                      })
                    }
                    placeholder="https://issuer/.well-known/openid-configuration"
                  />
                </div>
              </div>
            )}

            {/* Social providers info */}
            {(formData.provider === "google" ||
              formData.provider === "microsoft" ||
              formData.provider === "okta") && (
              <Alert>
                <Shield className="h-4 w-4" />
                <div>
                  {formData.provider === "google" && (
                    <p>
                      Google Sign-In is pre-configured. Users will be able to
                      sign in with their Google accounts.
                    </p>
                  )}
                  {formData.provider === "microsoft" && (
                    <p>
                      Microsoft (Azure AD) Sign-In is pre-configured. Users will
                      be able to sign in with their Microsoft accounts.
                    </p>
                  )}
                  {formData.provider === "okta" && (
                    <p>
                      Okta integration uses OIDC. Please provide your Okta
                      domain and application credentials below.
                    </p>
                  )}
                </div>
              </Alert>
            )}

            {/* Common Options */}
            <div className="space-y-4 p-4 border rounded-lg">
              <h4 className="font-medium">User Provisioning</h4>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-provision users</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create accounts for new SSO users
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.auto_provision_users}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        auto_provision_users: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_role">Default Role</Label>
                <select
                  id="default_role"
                  value={formData.default_role || "student"}
                  onChange={(e) =>
                    setFormData({ ...formData, default_role: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="allowed_domains">
                  Allowed Email Domains (optional)
                </Label>
                <Input
                  id="allowed_domains"
                  value={(formData.allowed_domains || []).join(", ")}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      allowed_domains: e.target.value
                        .split(",")
                        .map((d) => d.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="example.com, company.org"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to allow all domains. Separate multiple domains
                  with commas.
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : editingConfig ? (
                  "Update Configuration"
                ) : (
                  "Create Configuration"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Configurations */}
      {configs.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No SSO Providers</h3>
              <p className="text-muted-foreground mb-4">
                Add an SSO provider to enable enterprise authentication.
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Provider
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {configs.map((config) => (
            <Card key={config.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2 rounded-lg ${config.is_enabled ? "bg-success/10" : "bg-muted"}`}
                    >
                      <Shield
                        className={`h-5 w-5 ${config.is_enabled ? "text-success" : "text-muted-foreground"}`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{config.name}</h3>
                        <Badge variant="secondary" className="capitalize">
                          {config.provider}
                        </Badge>
                        {config.is_default && (
                          <Badge variant="default">Default</Badge>
                        )}
                        {config.is_enabled ? (
                          <Badge variant="success">Enabled</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {config.provider === "saml" &&
                          `Entity ID: ${config.saml_entity_id || "Not configured"}`}
                        {config.provider === "oidc" &&
                          `Issuer: ${config.oidc_issuer || "Not configured"}`}
                        {(config.provider === "google" ||
                          config.provider === "microsoft") &&
                          "Pre-configured social login"}
                      </p>
                      {config.auto_provision_users && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Auto-provisioning enabled • Default role:{" "}
                          {config.default_role}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {config.provider === "saml" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setShowMetadata(
                            showMetadata === config.id ? null : config.id
                          )
                        }
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        SP Metadata
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTest(config.id)}
                      disabled={isTesting === config.id}
                    >
                      {isTesting === config.id ? (
                        <Spinner size="sm" />
                      ) : (
                        <TestTube className="h-4 w-4 mr-1" />
                      )}
                      Test
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(config)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {config.is_enabled ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => disableConfig(config.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => enableConfig(config.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    {!config.is_default && config.is_enabled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAsDefault(config.id)}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(config.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* SP Metadata Panel */}
                {showMetadata === config.id && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Label>Service Provider Metadata (XML)</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyMetadata(config.id)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <pre className="text-xs overflow-x-auto p-2 bg-background rounded border">
                      {getSPMetadata(config.id)}
                    </pre>
                    <p className="text-xs text-muted-foreground mt-2">
                      Provide this metadata to your Identity Provider to
                      configure the SAML integration.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle>SSO Integration Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>SAML 2.0:</strong> For enterprise identity providers like
            Okta, Azure AD, OneLogin, or PingFederate.
          </p>
          <p>
            <strong>OIDC:</strong> For OpenID Connect compatible providers.
          </p>
          <p>
            <strong>Google/Microsoft:</strong> Pre-configured social logins for
            quick setup.
          </p>
          <p className="pt-2">
            Need help setting up SSO?{" "}
            <a
              href="/support"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Contact Support
              <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
