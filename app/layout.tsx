import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import AuthProvider from "@/components/AuthProvider";
import { ClassroomProvider } from "@/components/ClassroomProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OralIQ AI",
  description:
    "AI-Powered Speaking & Communication Assessment Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>

        <AuthProvider>
          <ClassroomProvider>

            <div className="flex min-h-screen bg-gray-100">

            {/* Sidebar */}

            <aside className="w-64 bg-blue-900 text-white p-6">

              <h1 className="text-3xl font-bold mb-2">
                OralIQ AI
              </h1>

              <p className="text-blue-200 mb-8">
                Speaking Intelligence Platform
              </p>


              <nav className="space-y-4">

                <Link
                  href="/"
                  className="block hover:text-blue-300"
                >
                  🏠 Dashboard
                </Link>
                <Link href="/classes" className="block hover:text-blue-300">
  🎓 Google Classroom
</Link>
                <Link
                  href="/students"
                  className="block hover:text-blue-300"
                >
                  👩‍🎓 Students
                </Link>


                <Link
                  href="/classes"
                  className="block hover:text-blue-300"
                >
                  🏫 Classes
                </Link>


                <Link
                  href="/assessments"
                  className="block hover:text-blue-300"
                >
                  🎤 Assessments
                </Link>


                <Link
                  href="/reports"
                  className="block hover:text-blue-300"
                >
                  📊 Reports
                </Link>


                <Link
                  href="/feedback"
                  className="block hover:text-blue-300"
                >
                  🤖 AI Feedback
                </Link>


                <Link
                  href="/settings"
                  className="block hover:text-blue-300"
                >
                  ⚙️ Settings
                </Link>

              </nav>


              <div className="absolute bottom-6 text-sm text-blue-200">
                Powered by Grammar Galaxy
              </div>

            </aside>


            {/* Main Content */}

            <main className="flex-1 p-8">
              {children}
            </main>


          </div>

        </ClassroomProvider>
        </AuthProvider>

      </body>
    </html>
  );
}