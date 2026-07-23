import Link from "next/link";

const menuItems = [
  { name: "Dashboard", href: "/teacher", icon: "🏠" },
  { name: "Billing", href: "/account/subscription", icon: "💳" },
  { name: "Presentation Grader", href: "/presentation-grader", icon: "🎤" },
  { name: "Student Practice", href: "/practice", icon: "🎧" },
  { name: "Students", href: "/students", icon: "👩‍🎓" },
  { name: "Classes", href: "/classes", icon: "🏫" },
  { name: "Assessments", href: "/assessments", icon: "🎤" },
  { name: "Reports", href: "/reports", icon: "📊" },
  { name: "AI Feedback", href: "/feedback", icon: "🤖" },
  { name: "Settings", href: "/settings", icon: "⚙️" },
];

export default function Sidebar() {
  return (
    <aside className="w-72 min-h-screen bg-slate-900 text-white flex flex-col shadow-xl">

      <div className="p-8 border-b border-slate-700">
        <h1 className="text-3xl font-bold">OralIQ AI</h1>

        <p className="text-slate-400 mt-2 text-sm">
          Powered by Grammar Galaxy
        </p>
      </div>

      <nav className="flex-1 p-4">

        {menuItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center gap-3 rounded-xl px-4 py-3 mb-2 hover:bg-blue-700 transition"
          >
            <span className="font-medium">
              {item.name}
            </span>

            <span className="text-xl">{item.icon}</span>
          </Link>
        ))}

      </nav>

      <div className="p-6 border-t border-slate-700 text-center text-sm text-slate-400">
        Version 1.0
      </div>

    </aside>
  );
}