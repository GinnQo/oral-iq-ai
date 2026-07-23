import Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";
import {
  SUBSCRIPTION_PLANS,
  normalizeSubscriptionPlanKey,
  type BillingCadence,
  type SubscriptionPlanKey,
} from "@/lib/subscription-plans";

export const runtime = "nodejs";

function resolvePlanFromStripeSubscription(subscription: Stripe.Subscription) {
  const metadataPlan = subscription.metadata?.plan;

  if (metadataPlan) {
    const normalizedPlan = normalizeSubscriptionPlanKey(metadataPlan);

    if (normalizedPlan) {
      return normalizedPlan;
    }
  }

  const priceId = subscription.items.data[0]?.price?.id;

  for (const plan of Object.values(SUBSCRIPTION_PLANS)) {
    for (const envName of Object.values(plan.priceEnvByCadence ?? {})) {
      if (envName && process.env[envName] === priceId) {
        return plan.key;
      }
    }
  }

  return "FREE_TRIAL" as SubscriptionPlanKey;
}

async function upsertSubscriptionRecord(input: {
  plan: SubscriptionPlanKey;
  status: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripePriceId?: string | null;
  stripeProductId?: string | null;
  customerType?: string | null;
  billingCadence?: string | null;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  trialEndsAt?: Date | null;
  cancelAtPeriodEnd?: boolean;
  endedAt?: Date | null;
  billingEmail?: string | null;
  userId?: string | null;
  schoolId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const uniqueWhere = input.schoolId
    ? { schoolId: input.schoolId }
    : input.userId
      ? { userId: input.userId }
      : null;

  if (!uniqueWhere) {
    throw new Error("Subscription owner is missing.");
  }

  return prisma.subscription.upsert({
    where: uniqueWhere as never,
    update: {
      plan: input.plan as never,
      status: input.status as never,
      stripeCustomerId: input.stripeCustomerId ?? undefined,
      stripeSubscriptionId: input.stripeSubscriptionId ?? undefined,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? undefined,
      stripePriceId: input.stripePriceId ?? undefined,
      stripeProductId: input.stripeProductId ?? undefined,
      customerType: (input.customerType ?? undefined) as any,
      billingCadence: (input.billingCadence ?? undefined) as any,
      currentPeriodStart: input.currentPeriodStart ?? undefined,
      currentPeriodEnd: input.currentPeriodEnd ?? undefined,
      trialEndsAt: input.trialEndsAt ?? undefined,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? undefined,
      endedAt: input.endedAt ?? undefined,
      billingEmail: input.billingEmail ?? undefined,
      metadata: input.metadata
        ? (input.metadata as Prisma.InputJsonValue)
        : undefined,
    },
    create: {
      plan: input.plan as never,
      status: input.status as never,
      stripeCustomerId: input.stripeCustomerId ?? undefined,
      stripeSubscriptionId: input.stripeSubscriptionId ?? undefined,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? undefined,
      stripePriceId: input.stripePriceId ?? undefined,
      stripeProductId: input.stripeProductId ?? undefined,
      customerType: (input.customerType ?? undefined) as any,
      billingCadence: (input.billingCadence ?? undefined) as any,
      currentPeriodStart: input.currentPeriodStart ?? undefined,
      currentPeriodEnd: input.currentPeriodEnd ?? undefined,
      trialEndsAt: input.trialEndsAt ?? undefined,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      endedAt: input.endedAt ?? undefined,
      billingEmail: input.billingEmail ?? undefined,
      userId: input.userId ?? undefined,
      schoolId: input.schoolId ?? undefined,
      metadata: input.metadata
        ? (input.metadata as Prisma.InputJsonValue)
        : undefined,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headerStore = await headers();
    const signature = headerStore.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
    }

    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(body, signature, getStripeWebhookSecret());

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const normalizedPlan = normalizeSubscriptionPlanKey(session.metadata?.plan ?? "") ?? "FREE_TRIAL";
        const ownerType = session.metadata?.ownerType;
        const userId = session.metadata?.userId ?? null;
        const schoolId = session.metadata?.schoolId || null;
        const billingCadence = (session.metadata?.cadence as BillingCadence | undefined) ?? null;

        await upsertSubscriptionRecord({
          plan: normalizedPlan as any,
          status: "ACTIVE",
          stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
          stripeCheckoutSessionId: session.id,
          customerType: session.metadata?.customerType ?? normalizedPlan,
          billingCadence,
          billingEmail: session.customer_details?.email ?? session.customer_email ?? null,
          userId: ownerType === "school" ? null : userId,
          schoolId: ownerType === "school" ? schoolId : null,
          metadata: session.metadata ?? null,
        });

        if (ownerType === "school" && schoolId) {
          await prisma.school.update({
            where: { id: schoolId },
            data: {
              stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
            },
          });
        }

        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const plan = resolvePlanFromStripeSubscription(subscription);
        const ownerType = subscription.metadata?.ownerType;
        const userId = subscription.metadata?.userId ?? null;
        const schoolId = subscription.metadata?.schoolId || null;
        const subscriptionItem = subscription.items.data[0];
        const billingCadence = (subscription.metadata?.cadence as BillingCadence | undefined) ?? null;

        await upsertSubscriptionRecord({
          plan: plan as any,
          status: subscription.status.toUpperCase(),
          stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : null,
          stripeSubscriptionId: subscription.id,
          stripePriceId: subscriptionItem?.price?.id ?? null,
          stripeProductId: typeof subscriptionItem?.price?.product === "string" ? subscriptionItem.price.product : null,
          customerType: subscription.metadata?.customerType ?? plan,
          billingCadence,
          currentPeriodStart: subscriptionItem ? new Date(subscriptionItem.current_period_start * 1000) : null,
          currentPeriodEnd: subscriptionItem ? new Date(subscriptionItem.current_period_end * 1000) : null,
          trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          billingEmail: subscription.metadata?.billingEmail ?? null,
          userId: ownerType === "school" ? null : userId,
          schoolId: ownerType === "school" ? schoolId : null,
          metadata: subscription.metadata as Record<string, unknown>,
        });

        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: "CANCELED",
            endedAt: new Date(),
            cancelAtPeriodEnd: false,
          },
        });

        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };

        if (typeof invoice.subscription === "string") {
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: invoice.subscription },
            data: { status: "PAST_DUE" },
          });
        }

        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };

        if (typeof invoice.subscription === "string") {
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: invoice.subscription },
            data: { status: "ACTIVE" },
          });
        }

        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[StripeWebhook] Error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook handling failed",
      },
      { status: 400 }
    );
  }
}
