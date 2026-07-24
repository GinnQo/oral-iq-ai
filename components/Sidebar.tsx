"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const menuItems = [
  { name: "Dashboard", href: "/teacher", icon: "🏠" },
  { name: "Assessments", href: "/assessments", icon: "🧩" },
  { name: "Classes", href: "/classes", icon: "🏫" },
  { name: "Classroom Assignments", href: "/classroom-assignments", icon: "📝" },
  { name: "Presentation Grader", href: "/presentation-grader", icon: "🎤" },
  { name: "Students", href: "/students", icon: "👩‍🎓" },
  { name: "Reports", href: "/reports", icon: "📊" },
  { name: "AI Feedback", href: "/feedback", icon: "🤖" },
  { name: "Settings", href: "/settings", icon: "⚙️" },
  { name: "Billing", href: "/account/subscription", icon: "💳" },
  { name: "Pricing", href: "/pricing", icon: "💼" },
] as const;

function isActivePath(currentPath: string, href: string) {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMobileOpen((open) => !open)}
        className="fixed left-4 top-4 z-40 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-lg md:hidden"
        aria-expanded={isMobileOpen}
        aria-controls="teacher-sidebar"
      >
        Menu
      </button>

      {isMobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/50 md:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close navigation"
        />
      ) : null}

      <aside
        id="teacher-sidebar"
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 text-white shadow-xl transition-transform duration-200 md:sticky md:top-0 md:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-slate-700 p-8">
          <h1 className="text-3xl font-bold">OralIQ AI</h1>
          <p className="mt-2 text-sm text-slate-400">Powered by Grammar Galaxy</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          {menuItems.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`mb-2 flex items-center justify-between rounded-xl px-4 py-3 transition ${
                  active
                    ? "bg-blue-700 text-white"
                    : "text-slate-100 hover:bg-blue-700/70"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className="font-medium">{item.name}</span>
                <span className="text-xl">{item.icon}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-700 p-6 text-center text-sm text-slate-400">
          Version 1.0
        </div>
      </aside>
    </>
  );
}