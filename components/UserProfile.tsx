"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export default function UserProfile() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <p className="text-gray-500">Loading account...</p>;
  }

  if (!session) {
    return (
      <div>
        <p className="text-gray-500 mb-4">
          Sign in to connect Google Classroom.
        </p>

        <button
          type="button"
          onClick={() => signIn("google")}
          className="bg-blue-900 text-white px-5 py-2 rounded-lg"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-bold text-slate-800">
        Welcome, {session.user?.name}
      </h3>

      <p className="text-gray-500 mt-2">
        {session.user?.email}
      </p>

      <p className="text-green-600 font-semibold mt-3">
        Google Classroom Connected
      </p>

      <button
        type="button"
        onClick={() => signOut()}
        className="mt-4 bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg"
      >
        Sign Out
      </button>
    </div>
  );
}