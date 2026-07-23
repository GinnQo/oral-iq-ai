import Link from "next/link";

export default function SettingsPage() {
  return (
    <main className="p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl bg-white p-8 shadow">
          <h1 className="text-3xl font-bold text-blue-900">Settings</h1>
          <p className="mt-2 text-gray-600">
            Application settings, integrations, and subscription controls.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
            <h2 className="text-xl font-bold text-slate-900">Subscription</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Review your current plan, upgrade to teacher or school billing, and open the Stripe customer portal.
            </p>
            <Link
              href="/account/subscription"
              className="mt-5 inline-flex rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Manage Billing
            </Link>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-900">Integrations</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Continue managing Google Classroom, speech, and rubric integrations from the teacher workspace.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
