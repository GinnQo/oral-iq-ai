import { getServerSession, type Session } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { hasTeacherSubscriptionBypass } from "@/lib/auth/platform-access";
import {
  SUBSCRIPTION_TRIAL_DAYS,
  getPlanConfig,
  getPlanUsageLimits,
  normalizeSubscriptionPlanKey,
  type BillingOwnerType,
  type PlanUsageLimits,
  type SubscriptionPlanKey,
} from "@/lib/subscription-plans";

type SessionUser = Session["user"] & {
  id?: string;
  googleAccountId?: string;
};

export type ResolvedSubscriptionContext = {
  user: {
    id: string;
    email: string;
    name: string | null;
    schoolId: string | null;
  };
  school: {
    id: string;
    name: string;
    stripeCustomerId: string | null;
  } | null;
  subscription: {
    id: string;
    plan: SubscriptionPlanKey;
    status: string;
    customerType: string | null;
    billingCadence: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    currentPeriodEnd: Date | null;
    trialEndsAt: Date | null;
    cancelAtPeriodEnd: boolean;
    ownerType: BillingOwnerType;
  } | null;
  canAccess: boolean;
  plan: SubscriptionPlanKey;
  usageLimits: PlanUsageLimits;
  ownerType: BillingOwnerType;
  trialEndsAt: Date | null;
  daysRemaining: number | null;
};

async function upsertUser(sessionUser: SessionUser) {
  const email = sessionUser.email?.trim().toLowerCase();
  const id = sessionUser.id?.trim();

  if (!email) {
    throw new Error("Signed-in session is missing an email address.");
  }

  if (id) {
    try {
      return await prisma.user.update({
        where: { id },
        data: {
          email,
          name: sessionUser.name?.trim() || undefined,
          image: sessionUser.image || undefined,
        },
      });
    } catch {
      // Fall through to email-based upsert for legacy sessions.
    }
  }

  return prisma.user.upsert({
    where: { email },
    update: {
      name: sessionUser.name?.trim() || undefined,
      image: sessionUser.image || undefined,
    },
    create: {
      email,
      name: sessionUser.name?.trim() || undefined,
      image: sessionUser.image || undefined,
    },
  });
}

async function ensureTrialSubscription(userId: string) {
  return prisma.subscription.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      plan: "FREE_TRIAL",
      status: "TRIALING",
      customerType: "FREE_TRIAL",
      billingCadence: "NONE",
      trialEndsAt: new Date(Date.now() + SUBSCRIPTION_TRIAL_DAYS * 24 * 60 * 60 * 1000),
    },
  });
}

function subscriptionOwnerType(subscription: { userId: string | null; schoolId: string | null }): BillingOwnerType {
  return subscription.schoolId ? "school" : "user";
}

function toDaysRemaining(endDate: Date | null) {
  if (!endDate) {
    return null;
  }

  const diff = endDate.getTime() - Date.now();

  if (diff <= 0) {
    return 0;
  }

  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

function isSubscriptionActiveLike(status: string, endDate: Date | null) {
  if (status === "ACTIVE" || status === "TRIALING") {
    return true;
  }

  if ((status === "PAST_DUE" || status === "INCOMPLETE") && endDate) {
    return endDate.getTime() > Date.now();
  }

  return false;
}

function resolvePlanKey(plan: string): SubscriptionPlanKey {
  return normalizeSubscriptionPlanKey(plan) ?? "FREE";
}

export async function getSessionUserWithBilling() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  const user = await upsertUser(session.user as SessionUser);

  const school = user.schoolId
    ? await prisma.school.findUnique({
        where: { id: user.schoolId },
        select: {
          id: true,
          name: true,
          stripeCustomerId: true,
          subscription: {
            select: {
              id: true,
              plan: true,
              status: true,
              customerType: true,
              billingCadence: true,
              stripeCustomerId: true,
              stripeSubscriptionId: true,
              currentPeriodEnd: true,
              trialEndsAt: true,
              cancelAtPeriodEnd: true,
              userId: true,
              schoolId: true,
            },
          },
        },
      })
    : null;

  const userSubscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      plan: true,
      status: true,
          customerType: true,
          billingCadence: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      currentPeriodEnd: true,
      trialEndsAt: true,
      cancelAtPeriodEnd: true,
      userId: true,
      schoolId: true,
    },
  });

  const subscription = school?.subscription ?? userSubscription ?? (await ensureTrialSubscription(user.id));
  const ownerType = subscriptionOwnerType(subscription);
  const active = isSubscriptionActiveLike(subscription.status, subscription.currentPeriodEnd ?? subscription.trialEndsAt);
  const bypassAccess = hasTeacherSubscriptionBypass(user.email);
  const plan = resolvePlanKey(subscription.plan);
  const usageLimits = getPlanUsageLimits(plan);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      schoolId: user.schoolId,
    },
    school: school
      ? {
          id: school.id,
          name: school.name,
          stripeCustomerId: school.stripeCustomerId,
        }
      : null,
    subscription: {
      id: subscription.id,
      plan,
      status: subscription.status,
      customerType: subscription.customerType,
      billingCadence: subscription.billingCadence,
      stripeCustomerId: subscription.stripeCustomerId,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialEndsAt: subscription.trialEndsAt,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      ownerType,
    },
    canAccess: active || bypassAccess,
    plan,
    usageLimits,
    ownerType,
    trialEndsAt: subscription.trialEndsAt,
    daysRemaining: toDaysRemaining(subscription.currentPeriodEnd ?? subscription.trialEndsAt),
  } satisfies ResolvedSubscriptionContext;
}

export async function requireSubscriptionAccess() {
  return getSessionUserWithBilling();
}

export function getBillingOwnerFromPlan(plan: SubscriptionPlanKey): BillingOwnerType {
  const normalizedPlan = resolvePlanKey(plan);
  return getPlanConfig(normalizedPlan).billingOwner;
}

export async function createSchoolIfNeeded(
  userId: string,
  schoolName?: string | null,
  billingEmail?: string | null
) {
  const trimmedSchoolName = schoolName?.trim();

  if (!trimmedSchoolName) {
    throw new Error("A school name is required for school billing.");
  }

  const school = await prisma.school.create({
    data: {
      name: trimmedSchoolName,
      billingEmail: billingEmail ?? undefined,
      createdByUserId: userId,
      members: {
        connect: {
          id: userId,
        },
      },
    },
    select: {
      id: true,
      name: true,
      stripeCustomerId: true,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { schoolId: school.id },
  });

  return school;
}

export async function resolveBillingOwner(
  userId: string,
  ownerType: BillingOwnerType,
  options?: {
    schoolName?: string | null;
    billingEmail?: string | null;
  }
) {
  if (ownerType === "school") {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, schoolId: true },
    });

    if (!existingUser) {
      throw new Error("User not found.");
    }

    let schoolId = existingUser.schoolId;

    if (!schoolId) {
      const school = await createSchoolIfNeeded(userId, options?.schoolName, options?.billingEmail);
      schoolId = school.id;
    }

    return {
      ownerType: "school" as const,
      ownerId: schoolId,
      userId,
      schoolId,
    };
  }

  return {
    ownerType: "user" as const,
    ownerId: userId,
    userId,
    schoolId: null,
  };
}
