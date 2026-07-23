import Link from "next/link";

export default function SubscriptionSuccessPage({
  searchParams,
}: {
  searchParams?: { session_id?: string };
}) {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-14 md:px-10">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">
          Payment confirmed
        </p>
        <h1 className="mt-3 text-4xl font-bold text-slate-950">Your subscription is active</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Stripe completed the checkout flow. If you just upgraded, your teacher workspace should unlock within a few seconds.
        </p>
        {searchParams?.session_id && (
          <p className="mt-4 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-mono text-slate-200">
            Checkout session: {searchParams.session_id}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/teacher" className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-semibold text-white">
            Back to dashboard
          </Link>
          <Link href="/account/subscription" className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-900">
            Manage billing
          </Link>
        </div>
      </div>
    </main>
  );
}
