"use client";

import * as React from "react";
import Link from "next/link";
import { Alert, Button, Badge, Modal, ModalFooter } from "@/components/ui";
import { Zap, CheckCircle, ArrowRight } from "lucide-react";

interface LimitReachedAlertProps {
  type: "instructor" | "student" | "course";
  current: number;
  limit: number;
  tier: string;
  isAdmin?: boolean;
}

/**
 * Alert banner shown when approaching a limit (80%+)
 */
export function LimitWarningBanner({
  type,
  current,
  limit,
}: {
  type: "instructor" | "student" | "course";
  current: number;
  limit: number;
}) {
  const typeLabel =
    type === "instructor" ? "instructors" : type === "student" ? "students" : "courses";
  const remaining = limit - current;
  const percentage = Math.round((current / limit) * 100);

  return (
    <Alert variant="warning" title={`Approaching ${typeLabel} limit`}>
      You&apos;re using {current} of {limit} {typeLabel} ({percentage}%). Only{" "}
      {remaining} remaining.{" "}
      <Link href="/admin/billing" className="font-medium underline">
        Upgrade for more
      </Link>
    </Alert>
  );
}

/**
 * Alert shown when a limit has been reached
 */
export function LimitReachedAlert({
  type,
  current,
  limit,
  tier,
  isAdmin = false,
}: LimitReachedAlertProps) {
  const typeLabel =
    type === "instructor" ? "instructors" : type === "student" ? "students" : "courses";

  const upgradeMessage: Record<string, string> = {
    free: "Upgrade to Professional",
    pro: "Upgrade to Institution",
    professional: "Upgrade to Institution",
    institution: "Contact sales for Enterprise",
    enterprise: "Contact support",
    "agency-starter": "Upgrade to Agency Pro",
    "agency-pro": "Upgrade to Agency Enterprise",
    "agency-enterprise": "Contact support",
  };
  const message = upgradeMessage[tier] || "Upgrade your plan";

  return (
    <Alert
      variant="error"
      title={`${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} limit reached`}
    >
      <div className="space-y-2">
        <span>
          Your {tier} plan allows {limit} {typeLabel}. You currently have {current}.
        </span>
        {isAdmin ? (
          <div>
            <Link href="/admin/billing">
              <Button size="sm" variant="outline" className="mt-2">
                <Zap className="h-3 w-3 mr-1" />
                {message}
              </Button>
            </Link>
          </div>
        ) : (
          <p className="text-sm">
            Contact your administrator to upgrade the subscription.
          </p>
        )}
      </div>
    </Alert>
  );
}

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "instructor" | "student" | "course";
  currentTier: string;
}

/**
 * Modal dialog prompting upgrade when trying to exceed limits
 */
export function UpgradeModal({
  open,
  onOpenChange,
  type,
  currentTier,
}: UpgradeModalProps) {
  const typeLabel =
    type === "instructor" ? "instructors" : type === "student" ? "students" : "courses";

  const nextTierMap: Record<string, { name: string; price: string }> = {
    free: { name: "Professional", price: "$149/month" },
    pro: { name: "Institution", price: "$399/month" },
    professional: { name: "Institution", price: "$399/month" },
    institution: { name: "Enterprise", price: "Custom" },
    enterprise: { name: "Enterprise", price: "Custom" },
    "agency-starter": { name: "Agency Pro", price: "$249/month" },
    "agency-pro": { name: "Agency Enterprise", price: "$499/month" },
    "agency-enterprise": { name: "Agency Enterprise", price: "Custom" },
  };
  const nextTier = nextTierMap[currentTier] || { name: "Professional", price: "$149/month" };

  const benefitsMap: Record<string, string[]> = {
    free: [
      "5 instructors (vs 1)",
      "25 students (vs limited)",
      "Unlimited courses (vs 2)",
      "Custom subdomain",
      "Remove MedicForge branding",
    ],
    pro: [
      "Unlimited instructors (vs 5)",
      "100 students (vs 25)",
      "Custom domain support",
      "API access",
      "Priority support",
    ],
    professional: [
      "Unlimited instructors (vs 5)",
      "100 students (vs 25)",
      "Custom domain support",
      "API access",
      "Priority support",
    ],
    institution: [
      "Unlimited students",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantees",
      "On-premise option",
    ],
    enterprise: [],
    "agency-starter": [
      "5 instructors (vs 2)",
      "150 employees (vs 50)",
      "Priority support",
    ],
    "agency-pro": [
      "Unlimited instructors",
      "Unlimited employees",
      "Dedicated support",
    ],
    "agency-enterprise": [],
  };
  const benefits = benefitsMap[currentTier] || [];

  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={`Unlock More ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}`}
      description={`You've reached your ${currentTier} plan limit. Upgrade to ${nextTier.name} to add more ${typeLabel}.`}
    >
      <div className="text-center mb-4">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Zap className="h-6 w-6 text-primary" />
        </div>
      </div>

      {benefits.length > 0 && (
        <div className="bg-muted rounded-lg p-4 mb-4">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Badge variant="default">{nextTier.name}</Badge>
            <span className="text-muted-foreground text-sm">{nextTier.price}</span>
          </h4>
          <ul className="space-y-2">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ModalFooter className="flex-col gap-2 sm:flex-col">
        <Button asChild className="w-full">
          <Link href="/admin/billing">
            Upgrade Now
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => onOpenChange(false)}
        >
          Maybe Later
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * Small inline badge showing current usage
 */
export function UsageBadge({
  current,
  limit,
  label,
}: {
  current: number;
  limit: number;
  label: string;
}) {
  const percentage = (current / limit) * 100;
  const variant =
    percentage >= 100 ? "destructive" : percentage >= 80 ? "warning" : "secondary";

  return (
    <Badge variant={variant as "destructive" | "secondary"} className="text-xs">
      {current}/{limit} {label}
    </Badge>
  );
}

/**
 * Subscription status pill for headers/navigation
 */
/* eslint-disable react-hooks/purity -- Date.now() for display */
export function SubscriptionStatusBadge({
  tier,
  status,
  trialEndsAt,
}: {
  tier: string;
  status: string;
  trialEndsAt?: string | null;
}) {
  if (status === "trialing" && trialEndsAt) {
    const daysLeft = Math.ceil(
      (new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft <= 3 && daysLeft > 0) {
      return (
        <Badge variant="warning" className="text-xs">
          Trial: {daysLeft}d left
        </Badge>
      );
    }
  }

  if (status === "past_due") {
    return (
      <Badge variant="destructive" className="text-xs">
        Payment Failed
      </Badge>
    );
  }

  const tierLabels: Record<string, string> = {
    free: "Free",
    pro: "Pro",
    professional: "Professional",
    institution: "Institution",
    enterprise: "Enterprise",
    "agency-starter": "Agency Starter",
    "agency-pro": "Agency Pro",
    "agency-enterprise": "Agency Enterprise",
  };

  return (
    <Badge variant="secondary" className="text-xs">
      {tierLabels[tier] || tier}
    </Badge>
  );
}
