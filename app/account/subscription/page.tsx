"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  SUBSCRIPTION_PLAN_ORDER,
  SUBSCRIPTION_PLANS,
  type BillingCadence,
  type CanonicalSubscriptionPlanKey,
} from "@/lib/subscription-plans";

type SubscriptionStatus = {
  canAccess: boolean;
  plan: string;
  ownerType: string;
  daysRemaining: number | null;
  trialEndsAt: string | null;
  usageLimits?: {
    canAccessTeacherWorkspace: boolean;
    canUsePractice: boolean;
    canUseClassroomImport: boolean;
    canUseAssessmentBuilder: boolean;
    canUseReports: boolean;
    maxClassrooms: number | null;
    maxStudents: number | null;
    maxAssessmentsPerMonth: number | null;
  };
  school?: { id: string; name: string; stripeCustomerId: string | null } | null;
  subscription?: {
    id: string;
    status: string;
    stripeSubscriptionId: string | null;
    stripeCustomerId: string | null;
    customerType: string | null;
    billingCadence: string | null;
  } | null;
};

type CheckoutPlan = {
  plan: CanonicalSubscriptionPlanKey;
  cadence?: BillingCadence;
};

export default function SubscriptionPage() {
  const { status: sessionStatus } = useSession();
  const [billingStatus, setBillingStatus] = useState<SubscriptionStatus | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const currentPlan = (billingStatus?.subscription?.customerType ?? billingStatus?.plan ?? "FREE") as CanonicalSubscriptionPlanKey;

  useEffect(() => {
    async function loadStatus() {
      try {
        const response = await fetch("/api/subscription/status", {
          cache: "no-store",
        });
        const data = (await response.json()) as SubscriptionStatus & { error?: string };

        if (!response.ok) {
          throw new Error(data.error || "Unable to load billing status.");
        }

        setBillingStatus(data);
      } catch (statusError) {
        setError(statusError instanceof Error ? statusError.message : "Unable to load billing status.");
      } finally {
        setLoading(false);
      }
    }

    if (sessionStatus === "authenticated") {
      loadStatus();
    }
  }, [sessionStatus]);

  if (sessionStatus === "unauthenticated") {
    return (
      <main className="min-h-screen bg-slate-100 px-6 py-10 md:px-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-950">Sign in to manage billing</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Billing settings are only available after you sign in to your teacher account.
          </p>
          <Link
            href="/login?role=teacher"
            className="mt-6 inline-flex rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  async function startCheckout(plan: CheckoutPlan) {
    try {
      setCheckoutLoading(`${plan.plan}:${plan.cadence ?? "none"}`);
      setError(null);

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: plan.plan,
          cadence: plan.cadence,
          schoolName: SUBSCRIPTION_PLANS[plan.plan].billingOwner === "school" ? schoolName : undefined,
        }),
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to start checkout.");
      }

      if (data.url) {
        window.location.assign(data.url);
      }
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Unable to start checkout.");
    } finally {
      setCheckoutLoading(null);
    }
  }

  function renderCheckoutButton(planKey: CanonicalSubscriptionPlanKey, cadence?: BillingCadence) {
    const plan = SUBSCRIPTION_PLANS[planKey];
    const label =
      cadence === "year"
        ? "Annual billing"
        : cadence === "month"
          ? "Monthly billing"
          : plan.contactSales
            ? "Contact sales"
            : plan.key === "FREE_TRIAL"
              ? "Trial available"
              : "Continue";
    const loadingKey = `${planKey}:${cadence ?? "none"}`;

    if (plan.contactSales) {
      return (
        <a
          href="mailto:sales@oraliq.ai"
          className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-50"
        >
          Contact sales
        </a>
      );
    }

    if (plan.key === "FREE") {
      return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Free tier is available automatically for low-intensity use.
        </div>
      );
    }

    if (plan.key === "FREE_TRIAL") {
      return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Your trial starts when you sign in.
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => startCheckout({ plan: planKey, cadence })}
        disabled={checkoutLoading !== null || sessionStatus === "loading"}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {checkoutLoading === loadingKey ? `Opening ${label}...` : `Start ${label}`}
      </button>
    );
  }

  async function openPortal() {
    try {
      setPortalLoading(true);
      setError(null);

      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to open customer portal.");
      }

      if (data.url) {
        window.location.assign(data.url);
      }
    } catch (portalError) {
      setError(portalError instanceof Error ? portalError.message : "Unable to open customer portal.");
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 md:px-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-3xl bg-white p-8 shadow">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Billing and subscription
          </p>
          <h1 className="mt-3 text-4xl font-bold text-slate-950">Manage your plan</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Start a free trial, subscribe as an individual teacher, or move billing to a school account.
          </p>
          {billingStatus && (
            <div className="mt-6 rounded-2xl bg-slate-950 p-5 text-white">
              <p className="text-sm font-semibold">
                Current plan: {billingStatus.subscription?.customerType ?? billingStatus.plan}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {billingStatus.daysRemaining !== null
                  ? `${billingStatus.daysRemaining} day${billingStatus.daysRemaining === 1 ? "" : "s"} remaining`
                  : "Active access"}
              </p>
              {billingStatus.usageLimits && (
                <p className="mt-2 text-xs text-slate-400">
                  Teacher access: {billingStatus.usageLimits.canAccessTeacherWorkspace ? "enabled" : "disabled"}
                </p>
              )}
            </div>
          )}
        </section>

        {error && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
            {error}
          </section>
        )}

        <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {SUBSCRIPTION_PLAN_ORDER.map((planKey) => {
            const plan = SUBSCRIPTION_PLANS[planKey];
            const cadenceList = Object.keys(plan.priceEnvByCadence ?? {}) as BillingCadence[];

            return (
              <article key={plan.key} className={`rounded-3xl border p-6 shadow-sm ${plan.featured ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{plan.customerType.replaceAll("_", " ")}</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">{plan.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{plan.description}</p>

                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {plan.highlights.map((highlight) => (
                    <li key={highlight} className="flex gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-blue-600" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>

                {(plan.billingOwner === "school" || plan.contactSales) && plan.key !== "ENTERPRISE" && (
                  <label className="mt-5 block text-sm font-semibold text-slate-800">
                    School / organization name
                    <input
                      value={schoolName}
                      onChange={(event) => setSchoolName(event.target.value)}
                      placeholder="North Ridge High School"
                      className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none ring-0 focus:border-blue-500"
                    />
                  </label>
                )}

                <div className="mt-6 space-y-3">
                  {plan.key === "FREE" || plan.key === "FREE_TRIAL" || plan.contactSales
                    ? renderCheckoutButton(plan.key)
                    : cadenceList.length > 1
                      ? cadenceList.map((cadence) => (
                          <div key={cadence}>
                            {renderCheckoutButton(plan.key, cadence)}
                          </div>
                        ))
                      : renderCheckoutButton(plan.key, cadenceList[0])}
                </div>
              </article>
            );
          })}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Customer portal</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use the Stripe portal to update payment details, invoices, and cancelation settings.
          </p>
          <button
            type="button"
            onClick={openPortal}
            disabled={portalLoading || loading}
            className="mt-5 rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {portalLoading ? "Opening portal..." : "Open customer portal"}
          </button>
          <div className="mt-4">
            <Link href="/pricing" className="text-sm font-semibold text-blue-900 underline underline-offset-4">
              Review pricing again
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
