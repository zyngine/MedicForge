"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Button,
  Badge,
  Spinner,
} from "@/components/ui";
import {
  CreditCard,
  CheckCircle,
  Zap,
  Building2,
  Crown,
  Users,
  Shield,
  Mail,
} from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  subscription_tier: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  payment_method: string | null;
}

const LMS_TIERS = [
  {
    id: "professional",
    name: "Professional",
    price: "$1,499/yr",
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
  },
  {
    id: "institution",
    name: "Institution",
    price: "$3,999/yr",
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
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    description: "For large institutions with custom needs",
    features: [
      "Unlimited students",
      "Custom integrations",
      "SSO integration",
      "Dedicated account manager",
    ],
    icon: <Zap className="h-6 w-6" />,
  },
];

const AGENCY_TIERS = [
  {
    id: "agency-starter",
    name: "Starter",
    price: "$1,000/yr",
    description: "Up to 25 employees",
    features: [
      "All employees — full access",
      "PA state competency library",
      "Verification cycles",
      "Certification tracking",
      "Medical director portal",
    ],
    icon: <Users className="h-6 w-6" />,
  },
  {
    id: "agency-team",
    name: "Team",
    price: "$2,000/yr",
    description: "Up to 75 employees",
    features: [
      "Everything in Starter",
      "Custom skill library",
      "Digital signatures",
      "Advanced analytics",
      "Priority support",
    ],
    icon: <Shield className="h-6 w-6" />,
    popular: true,
  },
  {
    id: "agency-department",
    name: "Department",
    price: "$4,000/yr",
    description: "Up to 200 employees",
    features: [
      "Everything in Team",
      "Multiple locations",
      "Dedicated onboarding",
      "API access",
    ],
    icon: <Building2 className="h-6 w-6" />,
  },
  {
    id: "agency-enterprise",
    name: "Enterprise",
    price: "$7,000/yr",
    description: "Unlimited employees",
    features: [
      "Everything in Department",
      "Custom integrations",
      "SSO integration",
      "Dedicated account manager",
    ],
    icon: <Crown className="h-6 w-6" />,
  },
];

type PlanCategory = "lms" | "agency";

export default function BillingPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [planCategory, setPlanCategory] = useState<PlanCategory>("lms");

  useEffect(() => {
    const fetchTenant = async () => {
      const supabase = createClient();
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("users")
          .select("tenant_id")
          .eq("id", user.id)
          .single();

        if (!profile?.tenant_id) return;

        const { data: tenantData } = await supabase
          .from("tenants")
          .select("id, name, subscription_tier, subscription_status, trial_ends_at, payment_method")
          .eq("id", profile.tenant_id)
          .single();

        setTenant(tenantData);
      } catch (err) {
        console.error("Error fetching tenant:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenant();
  }, []);

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
          View your current plan and available options
        </p>
      </div>

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
                  {isTrialing && <Badge variant="warning">Trial</Badge>}
                  {tenant.subscription_status === "active" && (
                    <Badge variant="success">Active</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{tenant.name}</p>
                {tenant.payment_method && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Payment: <span className="capitalize">{tenant.payment_method}</span>
                  </p>
                )}
                {isTrialing && tenant.trial_ends_at && (
                  <p className="text-sm text-warning mt-1">
                    Trial ends {new Date(tenant.trial_ends_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            <Button variant="outline" asChild>
              <Link href="/contact">
                <Mail className="h-4 w-4 mr-2" />
                Contact to Change Plan
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Plan Overview */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Available Plans</h2>

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
        </div>

        {planCategory === "agency" && (
          <p className="text-sm text-muted-foreground mb-6">
            Flat annual pricing — no per-seat fees. Every employee gets full access.
          </p>
        )}

        <div className={`grid gap-6 ${planCategory === "agency" ? "sm:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
          {(planCategory === "lms" ? LMS_TIERS : AGENCY_TIERS).map((tier) => {
            const isCurrent = tier.id === currentTier;

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
                      <span className="text-2xl font-bold">{tier.price}</span>
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
                  ) : (
                    <Button className="w-full" variant="outline" asChild>
                      <Link href="/contact">Contact Us</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Contact CTA */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">Ready to Upgrade?</h3>
              <p className="text-muted-foreground mt-1">
                Contact us to discuss your needs. We handle all billing via invoice — no credit card required to get started.
              </p>
            </div>
            <Button asChild>
              <Link href="/contact">Contact Sales</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
