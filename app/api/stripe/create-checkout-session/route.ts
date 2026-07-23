import { NextResponse } from "next/server";
import { requireSubscriptionAccess, resolveBillingOwner } from "@/lib/subscription-access";
import { getAppBaseUrl, getStripeClient, getStripePriceId } from "@/lib/stripe";
import {
  getPlanConfig,
  isSubscriptionPlanKey,
  normalizeSubscriptionPlanKey,
  type BillingCadence,
  type SubscriptionPlanKey,
} from "@/lib/subscription-plans";

type CheckoutRequestBody = {
  plan?: string;
  cadence?: BillingCadence;
  schoolName?: string;
};

export async function POST(request: Request) {
  try {
    const context = await requireSubscriptionAccess();

    if (!context) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await request.json()) as CheckoutRequestBody;
    const plan = body.plan?.trim();
    const cadence = body.cadence;

    if (!plan || !isSubscriptionPlanKey(plan)) {
      return NextResponse.json({ error: "A valid subscription plan is required." }, { status: 400 });
    }

    const planKey = normalizeSubscriptionPlanKey(plan) ?? (plan as SubscriptionPlanKey);
    const planConfig = getPlanConfig(planKey);

    if (planKey === "FREE" || planKey === "FREE_TRIAL") {
      return NextResponse.json({ error: "This plan does not use Stripe checkout." }, { status: 400 });
    }

    if (planConfig.contactSales) {
      return NextResponse.json({ error: "Enterprise plans are activated through sales." }, { status: 400 });
    }

    const selectedCadence = cadence ?? Object.keys(planConfig.priceEnvByCadence ?? {})[0];

    if (!selectedCadence || (selectedCadence !== "month" && selectedCadence !== "year")) {
      return NextResponse.json({ error: "Select a billing cadence for this plan." }, { status: 400 });
    }

    const owner = await resolveBillingOwner(context.user.id, planConfig.billingOwner, {
      schoolName: body.schoolName,
      billingEmail: context.user.email,
    });

    const priceId = getStripePriceId(planKey, selectedCadence);

    if (!priceId) {
      throw new Error(`No Stripe price is configured for ${planKey} (${selectedCadence}).`);
    }

    const stripe = getStripeClient();
    const baseUrl = getAppBaseUrl(request);

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: owner.ownerType === "school" ? context.school?.stripeCustomerId ?? undefined : undefined,
      customer_email: owner.ownerType === "user" ? context.user.email : undefined,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/account/subscription?canceled=1`,
      metadata: {
        plan: planKey,
        cadence: selectedCadence,
        customerType: planConfig.customerType,
        ownerType: owner.ownerType,
        ownerId: owner.ownerId,
        userId: owner.userId,
        schoolId: owner.schoolId ?? "",
      },
      subscription_data: {
        trial_period_days: planConfig.trialDays,
        metadata: {
          plan: planKey,
          cadence: selectedCadence,
          customerType: planConfig.customerType,
          ownerType: owner.ownerType,
          ownerId: owner.ownerId,
          userId: owner.userId,
          schoolId: owner.schoolId ?? "",
        },
      },
    });

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error("[CreateCheckoutSession] Error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create checkout session",
      },
      { status: 500 }
    );
  }
}
