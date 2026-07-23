import Link from "next/link";
import { SUBSCRIPTION_PLAN_ORDER, SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white md:px-10">
      <div className="mx-auto max-w-6xl space-y-10">
        <section className="rounded-[2rem] bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-10 shadow-2xl shadow-blue-950/30">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-200">
            OralIQ AI Billing
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight md:text-6xl">
            Pricing that matches how schools actually buy software.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-200">
            Start with free access, move into a trial, then choose the customer type and billing cadence that fits a learner, teacher, academy, school, or enterprise rollout.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login?role=teacher" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-blue-100">
              Start Trial
            </Link>
            <Link href="/account/subscription" className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Manage Subscription
            </Link>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {SUBSCRIPTION_PLAN_ORDER.map((planKey) => {
            const plan = SUBSCRIPTION_PLANS[planKey];
            const cadences = Object.keys(plan.priceEnvByCadence ?? {});

            return (
              <article
                key={plan.key}
                className={`rounded-3xl border p-6 ${plan.featured ? "border-cyan-300 bg-white text-slate-950 shadow-xl" : "border-white/10 bg-white/5 text-white"}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">{plan.customerType.replaceAll("_", " ")}</p>
                <h2 className="mt-3 text-2xl font-bold">{plan.title}</h2>
                <p className="mt-3 text-sm leading-6 text-current/80">{plan.description}</p>
                <div className="mt-6 rounded-2xl bg-slate-900/5 p-4">
                  <p className="text-sm font-semibold">
                    {plan.contactSales
                      ? "Custom contract pricing"
                      : plan.key === "FREE"
                        ? "Free tier"
                        : plan.key === "FREE_TRIAL"
                          ? `${plan.trialDays ?? 0}-day trial`
                          : cadences.length > 1
                            ? "Monthly and annual billing"
                            : "Stripe checkout available"}
                  </p>
                  <p className="mt-1 text-sm text-current/75">
                    {plan.highlights.join(" • ")}
                  </p>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
