import Stripe from "stripe";

// Stripe client - will be null if not configured
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    })
  : null;

export function getStripeClient(): Stripe {
  if (!stripe) {
    throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY.");
  }
  return stripe;
}

// Billing intervals
export type BillingInterval = "monthly" | "yearly";

// Price IDs for each tier - these should match your Stripe dashboard
// You need to create both monthly and yearly prices in Stripe for each tier
export const PRICE_IDS = {
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || "price_pro_monthly",
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY || "price_pro_yearly",
  },
  institution: {
    monthly: process.env.STRIPE_PRICE_INSTITUTION_MONTHLY || "price_institution_monthly",
    yearly: process.env.STRIPE_PRICE_INSTITUTION_YEARLY || "price_institution_yearly",
  },
  enterprise: {
    monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || "price_enterprise_monthly",
    yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || "price_enterprise_yearly",
  },
} as const;

export type PriceTier = keyof typeof PRICE_IDS;

// Helper to get price ID
export function getPriceId(tier: PriceTier, interval: BillingInterval): string {
  return PRICE_IDS[tier][interval];
}

// Pricing for display (monthly prices, yearly gets discount)
export const PRICING = {
  pro: {
    monthly: 149,
    yearly: 1490, // ~$124/month - 2 months free
  },
  institution: {
    monthly: 399,
    yearly: 3990, // ~$332/month - 2 months free
  },
  enterprise: {
    monthly: 0, // Custom pricing
    yearly: 0,
  },
} as const;

// Tier limits
export const TIER_LIMITS = {
  free: {
    instructors: 1,
    students: 25,
    courses: 2,
    storage: 1, // GB
  },
  pro: {
    instructors: 5,
    students: 100,
    courses: -1, // unlimited
    storage: 25,
  },
  institution: {
    instructors: -1,
    students: 500,
    courses: -1,
    storage: 100,
  },
  enterprise: {
    instructors: -1,
    students: -1,
    courses: -1,
    storage: -1,
  },
} as const;
