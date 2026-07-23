import { NextResponse } from "next/server";
import { requireSubscriptionAccess } from "@/lib/subscription-access";
import { getAppBaseUrl, getStripeClient } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const context = await requireSubscriptionAccess();

    if (!context) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const customerId = context.subscription?.stripeCustomerId ?? null;

    if (!customerId) {
      return NextResponse.json({ error: "No Stripe customer is available yet." }, { status: 404 });
    }

    const stripe = getStripeClient();
    const baseUrl = getAppBaseUrl(request);

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/account/subscription`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("[CreatePortalSession] Error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create portal session",
      },
      { status: 500 }
    );
  }
}
