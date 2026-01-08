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

// Price IDs for each tier - these should match your Stripe dashboard
export const PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_PRO || "price_pro_monthly",
  institution: process.env.STRIPE_PRICE_INSTITUTION || "price_institution_monthly",
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || "price_enterprise_monthly",
} as const;

export type PriceTier = keyof typeof PRICE_IDS;

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
