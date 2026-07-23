import Stripe from "stripe";
import {
  SUBSCRIPTION_PLANS,
  normalizeSubscriptionPlanKey,
  type BillingCadence,
  type SubscriptionPlanKey,
} from "@/lib/subscription-plans";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (stripeClient) {
    return stripeClient;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  stripeClient = new Stripe(secretKey);

  return stripeClient;
}

export function getStripePriceId(plan: SubscriptionPlanKey, cadence?: BillingCadence) {
  const normalizedPlan = normalizeSubscriptionPlanKey(plan);

  if (!normalizedPlan) {
    throw new Error(`Unknown subscription plan: ${plan}`);
  }

  const envName = cadence ? SUBSCRIPTION_PLANS[normalizedPlan].priceEnvByCadence?.[cadence] : undefined;

  if (!envName) {
    return null;
  }

  const priceId = process.env[envName];

  if (!priceId) {
    throw new Error(`${envName} is not configured.`);
  }

  return priceId;
}

export function getStripePriceIdsForPlan(plan: SubscriptionPlanKey) {
  const normalizedPlan = normalizeSubscriptionPlanKey(plan);

  if (!normalizedPlan) {
    throw new Error(`Unknown subscription plan: ${plan}`);
  }

  return SUBSCRIPTION_PLANS[normalizedPlan].priceEnvByCadence ?? {};
}

export function getAppBaseUrl(request?: Request) {
  const headerOrigin = request?.headers.get("origin") ?? request?.headers.get("referer");

  if (headerOrigin) {
    try {
      return new URL(headerOrigin).origin;
    } catch {
      // fall through to env-based resolution
    }
  }

  const configuredUrl = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL ?? "http://localhost:3000";

  return configuredUrl.startsWith("http")
    ? configuredUrl.replace(/\/$/, "")
    : `https://${configuredUrl}`;
}

export function getStripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }

  return secret;
}
