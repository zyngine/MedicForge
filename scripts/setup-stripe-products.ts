/**
 * Stripe Products Setup Script
 *
 * This script creates all MedicForge products and prices in Stripe.
 * Run with: npx tsx scripts/setup-stripe-products.ts
 *
 * Prerequisites:
 * - STRIPE_SECRET_KEY environment variable set
 * - Stripe CLI installed (optional, for testing)
 */

import Stripe from "stripe";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

interface ProductConfig {
  name: string;
  description: string;
  monthlyPrice: number; // in cents
  yearlyPrice: number; // in cents
  metadata: Record<string, string>;
}

const PRODUCTS: Record<string, ProductConfig> = {
  // LMS Products
  professional: {
    name: "MedicForge Professional",
    description: "For growing EMS training programs. Up to 5 instructors, 100 students, unlimited courses.",
    monthlyPrice: 14900, // $149
    yearlyPrice: 149000, // $1,490 (2 months free)
    metadata: {
      tier: "professional",
      type: "lms",
    },
  },
  institution: {
    name: "MedicForge Institution",
    description: "For colleges and large academies. Unlimited instructors, 500 students, custom domain.",
    monthlyPrice: 39900, // $399
    yearlyPrice: 399000, // $3,990 (2 months free)
    metadata: {
      tier: "institution",
      type: "lms",
    },
  },
  // Agency Products
  "agency-starter": {
    name: "MedicForge Agency Starter",
    description: "For small EMS agencies. Up to 25 employees, PA state competency library.",
    monthlyPrice: 9900, // $99
    yearlyPrice: 99000, // $990 (2 months free)
    metadata: {
      tier: "agency-starter",
      type: "agency",
    },
  },
  "agency-pro": {
    name: "MedicForge Agency Pro",
    description: "Full agency compliance management. Up to 100 employees, medical director portal, digital signatures.",
    monthlyPrice: 24900, // $249
    yearlyPrice: 249000, // $2,490 (2 months free)
    metadata: {
      tier: "agency-pro",
      type: "agency",
    },
  },
  "agency-enterprise": {
    name: "MedicForge Agency Enterprise",
    description: "For large agencies and systems. Unlimited employees, multiple locations, API access.",
    monthlyPrice: 49900, // $499
    yearlyPrice: 499000, // $4,990 (2 months free)
    metadata: {
      tier: "agency-enterprise",
      type: "agency",
    },
  },
};

async function createProducts() {
  console.log("Setting up Stripe products for MedicForge...\n");

  const envVars: string[] = [];

  for (const [tierId, config] of Object.entries(PRODUCTS)) {
    console.log(`Creating product: ${config.name}`);

    // Check if product already exists
    const existingProducts = await stripe.products.search({
      query: `metadata["tier"]:"${tierId}"`,
    });

    let product: Stripe.Product;

    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0];
      console.log(`  Product already exists: ${product.id}`);
    } else {
      product = await stripe.products.create({
        name: config.name,
        description: config.description,
        metadata: config.metadata,
      });
      console.log(`  Created product: ${product.id}`);
    }

    // Create monthly price
    const existingMonthlyPrices = await stripe.prices.search({
      query: `product:"${product.id}" metadata["interval"]:"monthly"`,
    });

    let monthlyPrice: Stripe.Price;
    if (existingMonthlyPrices.data.length > 0) {
      monthlyPrice = existingMonthlyPrices.data[0];
      console.log(`  Monthly price exists: ${monthlyPrice.id}`);
    } else {
      monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: config.monthlyPrice,
        currency: "usd",
        recurring: {
          interval: "month",
        },
        metadata: {
          tier: tierId,
          interval: "monthly",
        },
      });
      console.log(`  Created monthly price: ${monthlyPrice.id}`);
    }

    // Create yearly price
    const existingYearlyPrices = await stripe.prices.search({
      query: `product:"${product.id}" metadata["interval"]:"yearly"`,
    });

    let yearlyPrice: Stripe.Price;
    if (existingYearlyPrices.data.length > 0) {
      yearlyPrice = existingYearlyPrices.data[0];
      console.log(`  Yearly price exists: ${yearlyPrice.id}`);
    } else {
      yearlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: config.yearlyPrice,
        currency: "usd",
        recurring: {
          interval: "year",
        },
        metadata: {
          tier: tierId,
          interval: "yearly",
        },
      });
      console.log(`  Created yearly price: ${yearlyPrice.id}`);
    }

    // Generate env var names
    const envPrefix = `STRIPE_PRICE_${tierId.toUpperCase().replace(/-/g, "_")}`;
    envVars.push(`${envPrefix}_MONTHLY=${monthlyPrice.id}`);
    envVars.push(`${envPrefix}_YEARLY=${yearlyPrice.id}`);

    console.log("");
  }

  console.log("=".repeat(60));
  console.log("SETUP COMPLETE!");
  console.log("=".repeat(60));
  console.log("\nAdd these to your .env.local file:\n");
  console.log(envVars.join("\n"));
  console.log("\n");
}

// Run the script
createProducts().catch(console.error);
