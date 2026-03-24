import Stripe from "stripe";

// Stripe client - will be null if not configured
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
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
  // LMS Tiers
  professional: {
    monthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || "price_professional_monthly",
    yearly: process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY || "price_professional_yearly",
  },
  institution: {
    monthly: process.env.STRIPE_PRICE_INSTITUTION_MONTHLY || "price_institution_monthly",
    yearly: process.env.STRIPE_PRICE_INSTITUTION_YEARLY || "price_institution_yearly",
  },
  // Agency Tiers
  "agency-starter": {
    monthly: process.env.STRIPE_PRICE_AGENCY_STARTER_MONTHLY || "price_agency_starter_monthly",
    yearly: process.env.STRIPE_PRICE_AGENCY_STARTER_YEARLY || "price_agency_starter_yearly",
  },
  "agency-pro": {
    monthly: process.env.STRIPE_PRICE_AGENCY_PRO_MONTHLY || "price_agency_pro_monthly",
    yearly: process.env.STRIPE_PRICE_AGENCY_PRO_YEARLY || "price_agency_pro_yearly",
  },
  "agency-enterprise": {
    monthly: process.env.STRIPE_PRICE_AGENCY_ENTERPRISE_MONTHLY || "price_agency_enterprise_monthly",
    yearly: process.env.STRIPE_PRICE_AGENCY_ENTERPRISE_YEARLY || "price_agency_enterprise_yearly",
  },
} as const;

export type PriceTier = keyof typeof PRICE_IDS;

// Helper to get price ID
export function getPriceId(tier: PriceTier, interval: BillingInterval): string {
  return PRICE_IDS[tier][interval];
}

// Pricing for display (monthly prices, yearly gets discount)
export const PRICING = {
  // LMS Tiers
  professional: {
    monthly: 149,
    yearly: 1490, // ~$124/month - 2 months free
  },
  institution: {
    monthly: 399,
    yearly: 3990, // ~$332/month - 2 months free
  },
  // Agency Tiers
  "agency-starter": {
    monthly: 99,
    yearly: 990,
  },
  "agency-pro": {
    monthly: 249,
    yearly: 2490,
  },
  "agency-enterprise": {
    monthly: 499,
    yearly: 4990,
  },
} as const;

// Tier limits
export const TIER_LIMITS = {
  // LMS Tiers
  free: {
    instructors: 1,
    students: 25,
    courses: 2,
    storage: 1, // GB
  },
  professional: {
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
  // Agency Tiers
  "agency-starter": {
    employees: 25,
    storage: 5,
  },
  "agency-pro": {
    employees: 100,
    storage: 25,
  },
  "agency-enterprise": {
    employees: -1, // unlimited
    storage: 100,
  },
} as const;
