"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Alert,
} from "@/components/ui";
import {
  AlertTriangle,
  Clock,
  CreditCard,
  Lock,
  Zap,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useTenant } from "@/lib/hooks/use-tenant";
import { useUser } from "@/lib/hooks/use-user";

interface SubscriptionGateProps {
  children: React.ReactNode;
}

// Grace period in days after trial expires
const GRACE_PERIOD_DAYS = 3;

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const { user, isLoading: userLoading } = useUser();

  // Show loading while fetching tenant/user
  if (tenantLoading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // No tenant = main site, allow access
  if (!tenant) {
    return <>{children}</>;
  }

  const subscriptionStatus = tenant.subscription_status;
  const trialEndsAt = tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : null;
  const now = new Date();

  // Calculate trial/subscription state
  const isTrialing = subscriptionStatus === "trialing";
  const isActive = subscriptionStatus === "active";
  const isCanceled = subscriptionStatus === "canceled";
  const isPastDue = subscriptionStatus === "past_due";

  // Check if trial has expired
  const trialExpired = isTrialing && trialEndsAt && now > trialEndsAt;

  // Calculate grace period end
  const gracePeriodEnd = trialEndsAt
    ? new Date(trialEndsAt.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)
    : null;
  const inGracePeriod = trialExpired && gracePeriodEnd && now <= gracePeriodEnd;
  const gracePeriodExpired = trialExpired && gracePeriodEnd && now > gracePeriodEnd;

  // Calculate days remaining
  const daysUntilTrialEnds = trialEndsAt
    ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const daysUntilGraceEnds = gracePeriodEnd
    ? Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Determine if we should block access
  const shouldBlock = gracePeriodExpired || isCanceled;

  // Show trial expiring warning (last 3 days)
  const showTrialWarning = isTrialing && daysUntilTrialEnds !== null && daysUntilTrialEnds <= 3 && daysUntilTrialEnds > 0;

  // Show grace period warning
  const showGracePeriodWarning = inGracePeriod;

  // Show past due warning
  const showPastDueWarning = isPastDue;

  // Block access - show upgrade screen
  if (shouldBlock) {
    return (
      <SubscriptionBlockedScreen
        reason={isCanceled ? "canceled" : "expired"}
        tenant={tenant}
        userRole={user?.role}
      />
    );
  }

  // Show warnings but allow access
  return (
    <>
      {showTrialWarning && (
        <TrialExpiringBanner
          daysRemaining={daysUntilTrialEnds!}
          isAdmin={user?.role === "admin"}
        />
      )}
      {showGracePeriodWarning && (
        <GracePeriodBanner
          daysRemaining={daysUntilGraceEnds!}
          isAdmin={user?.role === "admin"}
        />
      )}
      {showPastDueWarning && (
        <PastDueBanner isAdmin={user?.role === "admin"} />
      )}
      {children}
    </>
  );
}

// Blocked screen when subscription is invalid
function SubscriptionBlockedScreen({
  reason,
  tenant,
  userRole,
}: {
  reason: "expired" | "canceled";
  tenant: { name: string; subscription_tier: string };
  userRole?: string | null;
}) {
  const isAdmin = userRole === "admin";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-error" />
          </div>
          <CardTitle className="text-2xl">
            {reason === "expired" ? "Trial Period Ended" : "Subscription Canceled"}
          </CardTitle>
          <CardDescription>
            {reason === "expired"
              ? "Your 14-day free trial has ended. Upgrade to continue using MedicForge."
              : "Your subscription has been canceled. Reactivate to regain access."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isAdmin ? (
            <>
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <h3 className="font-semibold">Choose a plan to continue:</h3>
                <div className="grid gap-3">
                  <PlanOption
                    name="Professional"
                    price="$149/month"
                    features={["5 instructors", "100 students", "Unlimited courses"]}
                    recommended
                  />
                  <PlanOption
                    name="Institution"
                    price="$399/month"
                    features={["Unlimited instructors", "500 students", "Custom domain"]}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button size="lg" className="w-full" asChild>
                  <Link href="/admin/billing">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Upgrade Now
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="w-full" asChild>
                  <Link href="mailto:support@medicforge.net">
                    Contact Sales
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center space-y-4">
              <Alert variant="warning">
                <AlertTriangle className="h-4 w-4" />
                <p>Please contact your organization administrator to upgrade the subscription.</p>
              </Alert>
              <p className="text-sm text-muted-foreground">
                Organization: <strong>{tenant.name}</strong>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Plan option card
function PlanOption({
  name,
  price,
  features,
  recommended,
}: {
  name: string;
  price: string;
  features: string[];
  recommended?: boolean;
}) {
  return (
    <div
      className={`border rounded-lg p-3 ${
        recommended ? "border-primary bg-primary/5" : "border-muted"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">{name}</span>
        <div className="flex items-center gap-2">
          {recommended && (
            <Badge variant="default" className="text-xs">
              Recommended
            </Badge>
          )}
          <span className="font-bold">{price}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {features.map((feature) => (
          <span key={feature} className="text-xs text-muted-foreground">
            {feature}
          </span>
        ))}
      </div>
    </div>
  );
}

// Trial expiring banner
function TrialExpiringBanner({
  daysRemaining,
  isAdmin,
}: {
  daysRemaining: number;
  isAdmin: boolean;
}) {
  return (
    <div className="bg-warning/10 border-b border-warning/20 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-warning" />
          <span className="text-sm">
            <strong>Trial ending soon:</strong>{" "}
            {daysRemaining === 1 ? "1 day" : `${daysRemaining} days`} remaining
          </span>
        </div>
        {isAdmin && (
          <Button size="sm" variant="warning" asChild>
            <Link href="/admin/billing">
              <Zap className="h-3 w-3 mr-1" />
              Upgrade Now
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

// Grace period banner
function GracePeriodBanner({
  daysRemaining,
  isAdmin,
}: {
  daysRemaining: number;
  isAdmin: boolean;
}) {
  return (
    <div className="bg-error/10 border-b border-error/20 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-error" />
          <span className="text-sm">
            <strong>Trial expired!</strong> Grace period ends in{" "}
            {daysRemaining === 1 ? "1 day" : `${daysRemaining} days`}. Upgrade to avoid losing access.
          </span>
        </div>
        {isAdmin && (
          <Button size="sm" variant="destructive" asChild>
            <Link href="/admin/billing">
              <CreditCard className="h-3 w-3 mr-1" />
              Upgrade Now
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

// Past due banner
function PastDueBanner({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="bg-error/10 border-b border-error/20 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-error" />
          <span className="text-sm">
            <strong>Payment failed!</strong> Please update your payment method to continue.
          </span>
        </div>
        {isAdmin && (
          <Button size="sm" variant="destructive" asChild>
            <Link href="/admin/billing">
              <CreditCard className="h-3 w-3 mr-1" />
              Update Payment
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

// Export individual components for flexible use
export {
  SubscriptionBlockedScreen,
  TrialExpiringBanner,
  GracePeriodBanner,
  PastDueBanner,
};
