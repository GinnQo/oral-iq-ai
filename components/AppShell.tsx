"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import SubscriptionGate from "@/components/SubscriptionGate";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const matchesPath = (basePath: string) =>
    pathname === basePath || pathname.startsWith(`${basePath}/`);

  const isPublicPage =
    pathname === "/" ||
    matchesPath("/login") ||
    matchesPath("/student") ||
    matchesPath("/pricing") ||
    matchesPath("/account/subscription") ||
    matchesPath("/subscription/success");

  const isStudentPortal =
    matchesPath("/practice") ||
    matchesPath("/student");

  if (isPublicPage || isStudentPortal) {
    return (
      <main className="min-h-screen bg-slate-100">
        {children}
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1 p-6 md:p-8">
        <SubscriptionGate>{children}</SubscriptionGate>
      </main>
    </div>
  );
}
