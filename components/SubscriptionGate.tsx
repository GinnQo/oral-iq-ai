"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type SubscriptionStatusResponse = {
  canAccess: boolean;
  plan: string;
  ownerType: string;
  daysRemaining: number | null;
  trialEndsAt: string | null;
};

export default function SubscriptionGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState<SubscriptionStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (status === "unauthenticated") {
      router.replace("/login?role=teacher");
      return;
    }

    let cancelled = false;

    async function loadStatus() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/subscription/status", {
          cache: "no-store",
        });
        const data = (await response.json()) as SubscriptionStatusResponse & { error?: string };

        if (!response.ok) {
          throw new Error(data.error || "Unable to load subscription status.");
        }

        if (!cancelled) {
          setStatusData(data);
        }
      } catch (subscriptionError) {
        if (!cancelled) {
          setError(
            subscriptionError instanceof Error
              ? subscriptionError.message
              : "Unable to load subscription status."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, [router, status]);

  if (status === "loading" || loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-slate-700">Checking subscription access...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-950 shadow-sm">
        <h2 className="text-xl font-bold">Subscription check failed</h2>
        <p className="mt-2 text-sm leading-6">{error}</p>
        <Link
          href="/account/subscription"
          className="mt-5 inline-flex rounded-xl bg-amber-950 px-4 py-2 text-sm font-semibold text-white"
        >
          Open Billing
        </Link>
      </div>
    );
  }

  if (!statusData?.canAccess) {
    return (
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Subscription required
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          Your teacher workspace is paused
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Teacher tools are locked until a subscription is active. Start a trial or subscribe with an individual teacher plan or a school plan.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/pricing"
            className="rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white"
          >
            View Pricing
          </Link>
          <Link
            href="/account/subscription"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900"
          >
            Manage Billing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
        <span className="font-semibold">{statusData.plan}</span>
        <span className="ml-2">
          {statusData.daysRemaining !== null
            ? `${statusData.daysRemaining} day${statusData.daysRemaining === 1 ? "" : "s"} remaining`
            : "Active access"}
        </span>
      </div>
      {children}
    </>
  );
}
