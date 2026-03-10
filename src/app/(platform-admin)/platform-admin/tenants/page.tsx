"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Badge,
  Button,
  Input,
  Spinner,
  Select,
  Alert,
} from "@/components/ui";
import {
  Building2,
  Search,
  MoreVertical,
  ExternalLink,
  Users,
  BookOpen,
  Calendar,
  X,
  CreditCard,
  FileText,
} from "lucide-react";
import { format } from "date-fns";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  payment_method?: string | null;
  subscription_notes?: string | null;
  created_at: string | null;
  _count?: {
    users: number;
    courses: number;
  };
}

const SUBSCRIPTION_TIERS = [
  { value: "free", label: "Free (Starter)" },
  { value: "pro", label: "Professional - $149/mo" },
  { value: "institution", label: "Institution - $399/mo" },
  { value: "enterprise", label: "Enterprise - Custom" },
];

const SUBSCRIPTION_STATUSES = [
  { value: "active", label: "Active" },
  { value: "trialing", label: "Trialing" },
  { value: "past_due", label: "Past Due" },
  { value: "canceled", label: "Canceled" },
];

const PAYMENT_METHODS = [
  { value: "stripe", label: "Credit Card (Stripe)" },
  { value: "invoice", label: "Invoice / Check" },
  { value: "ach", label: "ACH Bank Transfer" },
  { value: "free", label: "Free Tier (No Payment)" },
];

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Edit form state
  const [editTier, setEditTier] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenants = async () => {
      const supabase = createClient();

      try {
        // Fetch tenants
        const { data: tenantsData, error } = await supabase
          .from("tenants")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Fetch counts for each tenant
        const tenantsWithCounts = await Promise.all(
          (tenantsData || []).map(async (tenant) => {
            const [usersCount, coursesCount] = await Promise.all([
              supabase
                .from("users")
                .select("id", { count: "exact", head: true })
                .eq("tenant_id", tenant.id),
              supabase
                .from("courses")
                .select("id", { count: "exact", head: true })
                .eq("tenant_id", tenant.id),
            ]);

            return {
              ...tenant,
              _count: {
                users: usersCount.count || 0,
                courses: coursesCount.count || 0,
              },
            };
          })
        );

        setTenants(tenantsWithCounts);
      } catch (error) {
        console.error("Error fetching tenants:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenants();
  }, []);

  const openEditModal = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditTier(tenant.subscription_tier || "free");
    setEditStatus(tenant.subscription_status || "active");
    setEditPaymentMethod(tenant.payment_method || "stripe");
    setEditNotes(tenant.subscription_notes || "");
    setEditSlug(tenant.slug || "");
    setSlugError(null);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const closeEditModal = () => {
    setEditingTenant(null);
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSlugChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setEditSlug(cleaned);
    if (cleaned && !/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(cleaned)) {
      setSlugError("3–50 chars, lowercase letters/numbers/hyphens, no leading or trailing hyphens");
    } else {
      setSlugError(null);
    }
  };

  const handleSaveSubscription = async () => {
    if (!editingTenant) return;
    if (slugError) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Use the platform admin API which bypasses RLS
      const response = await fetch("/api/platform-admin/tenants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: editingTenant.id,
          subscription_tier: editTier,
          subscription_status: editStatus,
          payment_method: editPaymentMethod,
          subscription_notes: editNotes,
          // Only send slug if it changed
          ...(editSlug !== editingTenant.slug ? { slug: editSlug } : {}),
          // Clear trial_ends_at if activating a paid subscription
          trial_ends_at: editStatus === "active" && editTier !== "free" ? null : editingTenant.trial_ends_at,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update subscription");
      }

      // Update local state
      setTenants(tenants.map(t =>
        t.id === editingTenant.id
          ? {
              ...t,
              slug: editSlug,
              subscription_tier: editTier,
              subscription_status: editStatus,
              payment_method: editPaymentMethod,
              subscription_notes: editNotes,
            }
          : t
      ));

      setSaveSuccess(true);
      setTimeout(() => {
        closeEditModal();
      }, 1500);
    } catch (error: any) {
      console.error("Error updating subscription:", error);
      setSaveError(error.message || "Failed to update subscription. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTenants = tenants.filter(
    (tenant) =>
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case "enterprise":
        return "default";
      case "institution":
        return "secondary";
      case "pro":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "trialing":
        return "warning";
      case "canceled":
      case "past_due":
        return "destructive";
      default:
        return "outline";
    }
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Institutions</h1>
          <p className="text-muted-foreground mt-1">
            Manage all registered institutions
          </p>
        </div>
        <Button>
          <Building2 className="h-4 w-4 mr-2" />
          Add Institution
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search institutions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline">{filteredTenants.length} institutions</Badge>
      </div>

      {/* Tenants List */}
      <div className="space-y-4">
        {filteredTenants.map((tenant) => (
          <Card key={tenant.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{tenant.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {tenant.custom_domain || `${tenant.slug}.medicforge.net`}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {tenant._count?.users || 0} users
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        {tenant._count?.courses || 0} courses
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Joined {tenant.created_at ? format(new Date(tenant.created_at), "MMM d, yyyy") : "N/A"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={getTierBadgeVariant(tenant.subscription_tier || "free")}>
                      {tenant.subscription_tier === "pro" ? "Professional" : tenant.subscription_tier || "free"}
                    </Badge>
                    <Badge variant={getStatusBadgeVariant(tenant.subscription_status || "trialing")}>
                      {tenant.subscription_status || "trialing"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" title="View tenant">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(tenant)}
                    >
                      Edit Subscription
                    </Button>
                  </div>
                </div>
              </div>

              {tenant.subscription_status === "trialing" && tenant.trial_ends_at && (
                <div className="mt-4 p-3 bg-warning/10 rounded-lg text-sm">
                  Trial ends {format(new Date(tenant.trial_ends_at), "MMM d, yyyy")}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredTenants.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No institutions found</h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Try a different search term"
                  : "No institutions have registered yet"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Subscription Modal */}
      {editingTenant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Edit Subscription</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {editingTenant.name}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={closeEditModal}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {saveError && (
                <Alert variant="error">{saveError}</Alert>
              )}
              {saveSuccess && (
                <Alert variant="success">Subscription updated successfully!</Alert>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Subdomain URL</label>
                <div className="flex items-center gap-1">
                  <Input
                    value={editSlug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="mfrd"
                    className="font-mono"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">.medicforge.net</span>
                </div>
                {slugError ? (
                  <p className="text-xs text-destructive">{slugError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    URL: <span className="font-mono">{editSlug || "…"}.medicforge.net</span>
                    {editSlug !== editingTenant.slug && editSlug && (
                      <span className="text-warning ml-2">Changing this will break existing invite links</span>
                    )}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Subscription Tier</label>
                <Select
                  value={editTier}
                  onChange={(value) => setEditTier(value)}
                  options={SUBSCRIPTION_TIERS}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={editStatus}
                  onChange={(value) => setEditStatus(value)}
                  options={SUBSCRIPTION_STATUSES}
                />
                <p className="text-xs text-muted-foreground">
                  Set to "Active" to grant full access immediately
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <Select
                  value={editPaymentMethod}
                  onChange={(value) => setEditPaymentMethod(value)}
                  options={PAYMENT_METHODS}
                />
                <p className="text-xs text-muted-foreground">
                  Use "Invoice / Check" for customers not paying via Stripe
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (Internal)</label>
                <Input
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g., Invoice #1234, paid via check, annual prepay"
                />
              </div>

              <div className="bg-muted p-3 rounded-lg text-sm">
                <div className="flex items-center gap-2 mb-2">
                  {editPaymentMethod === "stripe" ? (
                    <CreditCard className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  <span className="font-medium">Summary</span>
                </div>
                <p>
                  Setting <strong>{editingTenant.name}</strong> to{" "}
                  <strong>{SUBSCRIPTION_TIERS.find(t => t.value === editTier)?.label}</strong>{" "}
                  with status <strong>{editStatus}</strong>.
                </p>
                {editPaymentMethod !== "stripe" && (
                  <p className="text-warning mt-1">
                    This customer is NOT on Stripe auto-billing. Remember to send invoices manually.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={closeEditModal}>
                  Cancel
                </Button>
                <Button onClick={handleSaveSubscription} disabled={isSaving || !!slugError}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
