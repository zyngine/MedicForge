"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Button,
  Badge,
  Alert,
  Spinner,
} from "@/components/ui";
import {
  CreditCard,
  CheckCircle,
  Zap,
  Building2,
  Crown,
  ExternalLink,
  Calendar,
  Users,
  Shield,
} from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  subscription_tier: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

const LMS_TIERS = [
  {
    id: "free",
    name: "Starter",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "For small programs getting started",
    features: [
      "1 instructor",
      "Up to 25 students",
      "2 active courses",
      "Basic assignment types",
      "1GB storage",
    ],
    icon: <Zap className="h-6 w-6" />,
  },
  {
    id: "professional",
    name: "Professional",
    monthlyPrice: 149,
    yearlyPrice: 1490, // ~$124/month - 2 months free
    description: "For growing training programs",
    features: [
      "Up to 5 instructors",
      "Up to 100 students",
      "Unlimited courses",
      "All assignment types",
      "Full NREMT tracking",
      "25GB storage",
      "Email support",
    ],
    icon: <Building2 className="h-6 w-6" />,
    popular: true,
  },
  {
    id: "institution",
    name: "Institution",
    monthlyPrice: 399,
    yearlyPrice: 3990, // ~$332/month - 2 months free
    description: "For colleges and large academies",
    features: [
      "Unlimited instructors",
      "Up to 500 students",
      "Everything in Professional",
      "100GB storage",
      "Custom domain",
      "API access",
      "Priority support",
    ],
    icon: <Crown className="h-6 w-6" />,
  },
];

const AGENCY_TIERS = [
  {
    id: "agency-starter",
    name: "Agency Starter",
    monthlyPrice: 99,
    yearlyPrice: 990,
    description: "For small EMS agencies",
    features: [
      "Up to 25 employees",
      "PA state competency library",
      "Annual verification cycles",
      "Employee certification tracking",
      "Expiration alerts",
      "Basic reporting",
    ],
    icon: <Users className="h-6 w-6" />,
  },
  {
    id: "agency-pro",
    name: "Agency Pro",
    monthlyPrice: 249,
    yearlyPrice: 2490,
    description: "Full agency compliance management",
    features: [
      "Up to 100 employees",
      "Everything in Agency Starter",
      "Medical director portal",
      "Digital signature verification",
      "Custom skill library",
      "Advanced analytics",
    ],
    icon: <Shield className="h-6 w-6" />,
    popular: true,
  },
  {
    id: "agency-enterprise",
    name: "Agency Enterprise",
    monthlyPrice: 499,
    yearlyPrice: 4990,
    description: "For large agencies and systems",
    features: [
      "Unlimited employees",
      "Everything in Agency Pro",
      "Multiple locations",
      "API access",
      "SSO integration",
      "Dedicated account manager",
    ],
    icon: <Crown className="h-6 w-6" />,
  },
];

// Map URL plan params to tier IDs
const PLAN_MAPPING: Record<string, string> = {
  "professional": "professional",
  "institution": "institution",
  "agency-starter": "agency-starter",
  "agency-pro": "agency-pro",
  "agency-enterprise": "agency-enterprise",
};

type BillingInterval = "monthly" | "yearly";
type PlanCategory = "lms" | "agency";

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    }>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const searchParams = useSearchParams();
  const planFromUrl = searchParams.get("plan");
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("yearly");
  const [planCategory, setPlanCategory] = useState<PlanCategory>("lms");
  const hasTriggeredCheckout = useRef(false);

  useEffect(() => {
    // Check for success/cancel from Stripe redirect
    if (searchParams.get("success")) {
      setSuccess("Subscription activated successfully!");
    } else if (searchParams.get("canceled")) {
      setError("Checkout was canceled.");
    }

    // If plan from URL is an agency plan, switch to agency category
    if (planFromUrl && planFromUrl.startsWith("agency-")) {
      setPlanCategory("agency");
    }

    fetchTenant();
  }, [searchParams, planFromUrl]);

  const fetchTenant = async () => {
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Get user's tenant
      const { data: profile } = await supabase
        .from("users")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.tenant_id) return;

      const { data: tenantData } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", profile.tenant_id)
        .single();

      setTenant(tenantData);

      // Auto-trigger checkout if plan parameter is present and valid
      if (planFromUrl && PLAN_MAPPING[planFromUrl] && !hasTriggeredCheckout.current && tenantData) {
        hasTriggeredCheckout.current = true;
        // Small delay to ensure UI is rendered
        setTimeout(() => {
          handleSubscribe(PLAN_MAPPING[planFromUrl]);
        }, 500);
      }
    } catch (err) {
      console.error("Error fetching tenant:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async (tier: string) => {
    if (!tenant) return;

    setIsProcessing(tier);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, tenantId: tenant.id, interval: billingInterval }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleManageBilling = async () => {
    if (!tenant) return;

    setIsProcessing("portal");
    setError(null);

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenant.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to open billing portal");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsProcessing(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No organization found</p>
      </div>
    );
  }

  const currentTier = tenant.subscription_tier || "free";
  const isTrialing = tenant.subscription_status === "trialing";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and billing settings
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold capitalize">
                    {currentTier} Plan
                  </h3>
                  {isTrialing && (
                    <Badge variant="warning">Trial</Badge>
                  )}
                  {tenant.subscription_status === "active" && (
                    <Badge variant="success">Active</Badge>
                  )}
                  {tenant.subscription_status === "past_due" && (
                    <Badge variant="destructive">Past Due</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {tenant.name}
                </p>
                {isTrialing && tenant.trial_ends_at && (
                  <p className="text-sm text-warning mt-1">
                    Trial ends{" "}
                    {new Date(tenant.trial_ends_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {tenant.stripe_subscription_id && (
              <Button
                variant="outline"
                onClick={handleManageBilling}
                isLoading={isProcessing === "portal"}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage Billing
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Tiers */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold">
            {currentTier === "free" ? "Choose Your Plan" : "Available Plans"}
          </h2>

          <div className="flex flex-wrap items-center gap-4">
            {/* Plan Category Toggle */}
            <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
              <button
                onClick={() => setPlanCategory("lms")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  planCategory === "lms"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Training Programs
              </button>
              <button
                onClick={() => setPlanCategory("agency")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  planCategory === "agency"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                EMS Agencies
              </button>
            </div>

            {/* Billing Interval Toggle */}
            <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
              <button
                onClick={() => setBillingInterval("monthly")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingInterval === "monthly"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval("yearly")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  billingInterval === "yearly"
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Yearly
                <Badge variant="success" className="text-xs">Save 17%</Badge>
              </button>
            </div>
          </div>
        </div>

        {billingInterval === "yearly" && (
          <Alert variant="info" className="mb-6">
            <Calendar className="h-4 w-4" />
            <span>
              <strong>Annual billing</strong> - Pay once per year and save 2 months. Perfect for academic institutions with annual budgets.
            </span>
          </Alert>
        )}

        {planFromUrl && PLAN_MAPPING[planFromUrl] && (
          <Alert variant="info" className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <span>
              Redirecting you to checkout for the <strong>{planFromUrl.replace("-", " ")}</strong> plan...
            </span>
          </Alert>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {(planCategory === "lms" ? LMS_TIERS : AGENCY_TIERS).map((tier) => {
            const isCurrent = tier.id === currentTier;
            const canUpgrade = tier.id !== "free" && tier.id !== currentTier;

            return (
              <Card
                key={tier.id}
                className={`relative ${
                  tier.popular ? "border-primary shadow-lg" : ""
                } ${isCurrent ? "bg-muted/50" : ""}`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Most Popular</Badge>
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`p-2 rounded-lg ${
                        tier.popular
                          ? "bg-primary text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {tier.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold">{tier.name}</h3>
                      {billingInterval === "monthly" ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold">
                            ${tier.monthlyPrice}
                          </span>
                          {tier.monthlyPrice > 0 && (
                            <span className="text-muted-foreground">/month</span>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold">
                              ${tier.yearlyPrice.toLocaleString()}
                            </span>
                            {tier.yearlyPrice > 0 && (
                              <span className="text-muted-foreground">/year</span>
                            )}
                          </div>
                          {tier.yearlyPrice > 0 && (
                            <p className="text-xs text-muted-foreground">
                              ${Math.round(tier.yearlyPrice / 12)}/month equivalent
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4">
                    {tier.description}
                  </p>

                  <ul className="space-y-2 mb-6">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-success shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <Button className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : tier.id === "free" ? (
                    <Button className="w-full" variant="outline" disabled>
                      Free Tier
                    </Button>
                  ) : canUpgrade ? (
                    <Button
                      className="w-full"
                      variant={tier.popular ? "default" : "outline"}
                      onClick={() => handleSubscribe(tier.id)}
                      isLoading={isProcessing === tier.id}
                    >
                      {currentTier === "free" ? "Subscribe Now" : "Upgrade"}
                    </Button>
                  ) : (
                    <Button className="w-full" variant="outline" disabled>
                      Contact Sales
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Enterprise */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">Need Enterprise Features?</h3>
              <p className="text-muted-foreground mt-1">
                Unlimited users, custom integrations, dedicated support, and more.
              </p>
            </div>
            <Button variant="outline">Contact Sales</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
