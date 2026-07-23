"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useClassroom } from "@/components/ClassroomProvider";

type DashboardCard = {
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: string;
  theme: string;
};

const cards: DashboardCard[] = [
  {
    title: "Google Classroom",
    description:
      "Load courses and import students for grading workflows.",
    href: "/classes",
    cta: "Open Classes",
    icon: "🏫",
    theme: "border-blue-200 bg-blue-50",
  },
  {
    title: "Presentation Grader",
    description:
      "Record presentations, map speakers, and generate AI + teacher scores.",
    href: "/presentation-grader",
    cta: "Open Grader",
    icon: "🎤",
    theme: "border-indigo-200 bg-indigo-50",
  },
  {
    title: "Student Practice",
    description:
      "Review the student practice experience and run end-to-end checks.",
    href: "/practice",
    cta: "Open Practice",
    icon: "🎧",
    theme: "border-emerald-200 bg-emerald-50",
  },
  {
    title: "Reports",
    description:
      "Review communication growth, rubric trends, and teacher notes.",
    href: "/reports",
    cta: "Open Reports",
    icon: "📊",
    theme: "border-cyan-200 bg-cyan-50",
  },
  {
    title: "Students",
    description:
      "Browse imported students and monitor roster assignments.",
    href: "/students",
    cta: "Open Students",
    icon: "👩‍🎓",
    theme: "border-purple-200 bg-purple-50",
  },
  {
    title: "Assessments",
    description:
      "Create, save, and launch speaking assessments.",
    href: "/assessments",
    cta: "Open Assessments",
    icon: "🧩",
    theme: "border-amber-200 bg-amber-50",
  },
];

export default function TeacherDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const { courses, students, selectedCourse } = useClassroom();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login?role=teacher");
    }
  }, [router, status]);

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-8 shadow">
          <p className="font-semibold text-slate-700">Loading teacher dashboard...</p>
        </div>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const teacherName =
    session?.user?.name ||
    session?.user?.email?.split("@")[0] ||
    "Teacher";

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl bg-gradient-to-r from-blue-900 to-indigo-900 p-8 text-white shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">
                Teacher Workspace
              </p>
              <h1 className="mt-2 text-4xl font-bold">Welcome, {teacherName}</h1>
              <p className="mt-3 max-w-3xl text-blue-100">
                Manage Google Classroom imports, run presentation grading, track student growth,
                and maintain assessment workflows.
              </p>
            </div>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-xl border border-blue-300/50 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Sign Out
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Loaded Courses</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{courses.length}</p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Imported Students</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{students.length}</p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Selected Course</p>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {selectedCourse?.name || "No course selected"}
            </p>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <article
              key={card.href}
              className={`rounded-2xl border p-6 shadow-sm ${card.theme}`}
            >
              <div className="text-3xl">{card.icon}</div>
              <h2 className="mt-4 text-xl font-bold text-slate-900">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">{card.description}</p>
              <Link
                href={card.href}
                className="mt-5 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {card.cta}
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
