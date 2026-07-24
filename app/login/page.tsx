"use client";

import { Suspense, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  const role =
    searchParams.get("role") === "student"
      ? "student"
      : "teacher";
  const isStudent = role === "student";
  const callbackUrl =
    searchParams.get("callbackUrl")?.trim() ||
    (isStudent ? "/practice" : "/teacher");

  useEffect(() => {
    if (status === "authenticated") {
      localStorage.setItem("oraliq_portal_role", role);

      router.replace(
        callbackUrl
      );
    }
  }, [status, role, router, callbackUrl]);

  async function handleGoogleSignIn() {
    localStorage.setItem("oraliq_portal_role", role);

    await signIn("google", {
      callbackUrl,
    });
  }

  return (
    <main
      className={`flex min-h-screen items-center justify-center px-6 py-12 ${
        isStudent
          ? "bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950"
          : "bg-gradient-to-br from-blue-950 via-slate-950 to-indigo-950"
      }`}
    >
      <div className="w-full max-w-lg rounded-3xl bg-white p-9 shadow-2xl">
        <Link
          href="/"
          className="text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          ← Back to portal selection
        </Link>

        <div
          className={`mt-8 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl text-white ${
            isStudent
              ? "bg-emerald-600"
              : "bg-blue-700"
          }`}
        >
          {isStudent ? "🎧" : "👩‍🏫"}
        </div>

        <p
          className={`mt-6 text-sm font-semibold uppercase tracking-wider ${
            isStudent
              ? "text-emerald-700"
              : "text-blue-700"
          }`}
        >
          {isStudent
            ? "Student Portal"
            : "Teacher Workspace"}
        </p>

        <h1 className="mt-2 text-4xl font-bold text-slate-950">
          {isStudent
            ? "Student Login"
            : "Teacher Login"}
        </h1>

        <p className="mt-4 leading-7 text-slate-600">
          {isStudent
            ? "Sign in with your Google account to enter your private speaking-practice area."
            : "Sign in with your Google account to manage classes, students, assessments, rubrics, and reports."}
        </p>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={status === "loading"}
          className={`mt-8 w-full rounded-2xl px-6 py-4 font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 ${
            isStudent
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-blue-700 hover:bg-blue-800"
          }`}
        >
          {status === "loading"
            ? "Checking account..."
            : "Continue with Google"}
        </button>

        <div className="mt-6 rounded-2xl bg-slate-100 p-4 text-sm leading-6 text-slate-600">
          {isStudent
            ? "Student practice scores are temporary and do not replace official teacher grades."
            : "Teacher accounts can access official assessments and student records."}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12">
          <div className="rounded-2xl bg-white px-8 py-6 text-sm font-semibold text-slate-700 shadow-lg">
            Loading login...
          </div>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
