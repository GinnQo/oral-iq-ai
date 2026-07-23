import { NextResponse } from "next/server";
import { requireSubscriptionAccess } from "@/lib/subscription-access";

export async function GET() {
  try {
    const context = await requireSubscriptionAccess();

    if (!context) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({
      canAccess: context.canAccess,
      plan: context.plan,
      ownerType: context.ownerType,
      daysRemaining: context.daysRemaining,
      trialEndsAt: context.trialEndsAt?.toISOString() ?? null,
      usageLimits: context.usageLimits,
      school: context.school,
      subscription: context.subscription,
    });
  } catch (error) {
    console.error("[SubscriptionStatus] Error:", error);

    return NextResponse.json(
      { error: "Failed to load subscription status" },
      { status: 500 }
    );
  }
}
