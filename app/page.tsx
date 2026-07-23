import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">OralIQ AI</h1>
            <p className="mt-1 text-sm text-blue-200">
              Speaking Intelligence Platform
            </p>
          </div>

          <p className="hidden text-sm text-slate-300 md:block">
            Powered by Grammar Galaxy
          </p>
        </header>

        <section className="mx-auto mt-20 max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">
            Choose your portal
          </p>

          <h2 className="mt-5 text-5xl font-bold tracking-tight md:text-6xl">
            Speak. Practice. Improve.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Teachers assess presentations and manage student progress.
            Students practice privately and receive temporary AI coaching.
          </p>
        </section>

        <section className="mx-auto mt-14 grid max-w-5xl gap-8 md:grid-cols-2">
          <Link
            href="/login?role=teacher"
            className="group rounded-3xl border border-blue-400/30 bg-white/10 p-8 shadow-2xl backdrop-blur transition hover:-translate-y-1 hover:bg-white/15"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-3xl">
              👩‍🏫
            </div>

            <h3 className="mt-6 text-3xl font-bold">
              Teacher Login
            </h3>

            <p className="mt-4 leading-7 text-slate-300">
              Select classes, manage students, upload rubrics, record
              presentations, grade speakers, and review reports.
            </p>

            <div className="mt-8 inline-flex items-center gap-2 font-semibold text-blue-300">
              Enter Teacher Workspace
              <span className="transition group-hover:translate-x-1">
                →
              </span>
            </div>
          </Link>

          <Link
            href="/login?role=student"
            className="group rounded-3xl border border-emerald-400/30 bg-white/10 p-8 shadow-2xl backdrop-blur transition hover:-translate-y-1 hover:bg-white/15"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-3xl">
              🎧
            </div>

            <h3 className="mt-6 text-3xl font-bold">
              Student Login
            </h3>

            <p className="mt-4 leading-7 text-slate-300">
              Practice speaking from home, record attempts, receive
              temporary feedback, and improve without affecting an
              official grade.
            </p>

            <div className="mt-8 inline-flex items-center gap-2 font-semibold text-emerald-300">
              Enter Student Practice
              <span className="transition group-hover:translate-x-1">
                →
              </span>
            </div>
          </Link>
        </section>
      </div>
    </main>
  );
}
