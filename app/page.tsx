import Link from "next/link";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import {
  SUBSCRIPTION_PLAN_ORDER,
  SUBSCRIPTION_PLANS,
  type CanonicalSubscriptionPlanKey,
} from "@/lib/subscription-plans";

const headlineFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-headline",
});

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const productTypes = [
  {
    icon: "🎓",
    title: "Student",
    description:
      "Practice speaking, reading, writing, and grammar with personalized AI coaching.",
    actions: [
      { label: "Learn More", href: "#products" },
      { label: "Try Free", href: "/login?role=student" },
      { label: "Buy Plan", href: "/pricing" },
      { label: "Sign In", href: "/login?role=student" },
    ],
    accent: "from-cyan-100 to-sky-100",
  },
  {
    icon: "👩‍🏫",
    title: "Teacher",
    description:
      "Assess spoken presentations, reading fluency, writing, and grammar while saving hours every week.",
    actions: [
      { label: "Learn More", href: "#products" },
      { label: "Start Free Trial", href: "/login?role=teacher" },
      { label: "Buy Plan", href: "/pricing" },
      { label: "Sign In", href: "/login?role=teacher" },
    ],
    accent: "from-indigo-100 to-blue-100",
  },
  {
    icon: "🏫",
    title: "School",
    description:
      "Manage teachers, students, subscriptions, analytics, and district-wide reporting from one platform.",
    actions: [
      { label: "Learn More", href: "#why" },
      { label: "Request Demo", href: "#final-cta" },
      { label: "Contact Sales", href: "/pricing" },
      { label: "Sign In", href: "/login?role=teacher" },
    ],
    accent: "from-emerald-100 to-lime-100",
  },
] as const;

const productCards = [
  {
    name: "OralIQ AI",
    description: "Evaluate speaking presentations with AI-assisted scoring and rubrics.",
    features: ["Speech insights", "Presentation scoring", "Feedback workflows"],
  },
  {
    name: "ReadingIQ AI",
    description: "Track reading fluency progress with confidence and consistent benchmarks.",
    features: ["Fluency snapshots", "Growth signals", "Teacher review tools"],
  },
  {
    name: "GrammarGrader AI",
    description: "Analyze grammar mastery quickly with instructional recommendations.",
    features: ["Grammar diagnostics", "Error trends", "Skill-level guidance"],
  },
  {
    name: "WritingIQ AI",
    description: "Support better writing outcomes with AI coaching and rubric alignment.",
    features: ["Writing feedback", "Rubric alignment", "Revision guidance"],
  },
] as const;

const platformBenefits = [
  "AI Assessment",
  "Google Classroom Integration",
  "Automatic Reports",
  "Student Progress Tracking",
  "Personalized AI Coaching",
  "Cloud-Based Platform",
  "Teacher Dashboard",
  "School Analytics",
] as const;

const timelineSteps = [
  "Choose a Product",
  "Create Your Account",
  "Start Your Free Trial",
  "Teach, Learn, and Grow",
] as const;

const testimonials = [
  {
    role: "Elementary Teacher",
    quote:
      "Grammar Galaxy helps me spend less time preparing and more time coaching students where they need it most.",
  },
  {
    role: "Middle School Principal",
    quote:
      "The platform gives our staff one place to monitor growth, collaborate, and keep instruction consistent.",
  },
  {
    role: "High School Student",
    quote:
      "I can practice independently, see clear feedback, and feel more confident before class presentations.",
  },
] as const;

const faqs = [
  {
    question: "How does the free trial work?",
    answer:
      "You can sign in and begin with trial-enabled features right away. When the trial ends, choose the plan that fits your role.",
  },
  {
    question: "Can I use Google Classroom?",
    answer:
      "Yes. Teacher workflows include Google Classroom connection options for importing class context and student rosters.",
  },
  {
    question: "Can students practice at home?",
    answer:
      "Yes. Students can practice from any supported device and receive AI guidance between class sessions.",
  },
  {
    question: "Can schools purchase licenses?",
    answer:
      "Yes. School plans are designed for centralized billing, staff coverage, and district-ready reporting workflows.",
  },
  {
    question: "What devices are supported?",
    answer:
      "Grammar Galaxy runs in modern web browsers on desktops, laptops, tablets, and most mobile devices.",
  },
] as const;

function planBadge(planKey: CanonicalSubscriptionPlanKey) {
  if (planKey === "FREE") {
    return "Explore";
  }

  if (planKey === "FREE_TRIAL") {
    return "Starter";
  }

  if (planKey === "INDIVIDUAL_TEACHER") {
    return "Most Popular";
  }

  if (planKey === "SCHOOL_STARTER") {
    return "Recommended for Schools";
  }

  return "Growth";
}

function planSummary(planKey: CanonicalSubscriptionPlanKey) {
  const plan = SUBSCRIPTION_PLANS[planKey];
  const billingMode = plan.contactSales
    ? "Custom contract"
    : plan.priceEnvByCadence
      ? "Monthly and annual billing"
      : plan.key === "FREE"
        ? "No payment required"
        : `${plan.trialDays ?? 0}-day trial`;

  return {
    plan,
    billingMode,
    badge: planBadge(planKey),
  };
}

export default function HomePage() {
  return (
    <main
      className={`${headlineFont.variable} ${bodyFont.variable} bg-[radial-gradient(circle_at_0%_0%,#c7d2fe_0%,transparent_35%),radial-gradient(circle_at_100%_0%,#a7f3d0_0%,transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_55%,#ffffff_100%)] text-slate-900`}
    >
      <div className="mx-auto max-w-7xl px-6 py-8 md:px-10 lg:px-14">
        <header className="sticky top-4 z-20 rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-lg shadow-slate-900/5 backdrop-blur md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 via-indigo-600 to-cyan-500 text-lg font-bold text-white">
                GG
              </div>
              <div>
                <p className="font-[var(--font-headline)] text-xl font-bold leading-none">Grammar Galaxy</p>
                <p className="text-xs text-slate-600">AI Learning Platform</p>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700 md:gap-5">
              <a href="#products" className="rounded-lg px-2 py-1 transition hover:bg-slate-100 hover:text-slate-950">Products</a>
              <a href="#pricing" className="rounded-lg px-2 py-1 transition hover:bg-slate-100 hover:text-slate-950">Pricing</a>
              <a href="#schools" className="rounded-lg px-2 py-1 transition hover:bg-slate-100 hover:text-slate-950">Schools</a>
              <a href="#resources" className="rounded-lg px-2 py-1 transition hover:bg-slate-100 hover:text-slate-950">Resources</a>
              <a href="#about" className="rounded-lg px-2 py-1 transition hover:bg-slate-100 hover:text-slate-950">About</a>
              <Link
                href="/login?role=teacher"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Sign In
              </Link>
            </nav>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[2.25rem] border border-white/90 bg-white/80 px-7 py-16 shadow-2xl shadow-indigo-900/10 backdrop-blur md:px-14 md:py-24">
          <div className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-cyan-300/30 blur-2xl" />
          <div className="absolute -bottom-16 -left-8 h-44 w-44 rounded-full bg-indigo-300/30 blur-2xl" />

          <div className="relative mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-6 inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
              <span className="text-sm">⭐</span>
              Trusted by teachers, schools, and independent learners
            </div>

            <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-700 via-indigo-600 to-cyan-500 text-2xl font-black text-white shadow-lg shadow-indigo-800/30 md:h-24 md:w-24 md:text-3xl">
              GG
            </div>

            <h1 className="font-[var(--font-headline)] text-balance text-4xl font-bold leading-tight text-slate-950 md:text-6xl">
              The AI Learning Platform for Schools, Teachers, and Students.
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-pretty text-lg leading-8 text-slate-700 md:text-xl">
              Powerful AI tools that help teachers assess faster, students improve confidently, and schools manage learning at scale.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/login?role=teacher"
                className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Start Free Trial
              </Link>
              <a
                href="#how-it-works"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50"
              >
                Watch Demo
              </a>
            </div>
          </div>
        </section>

        <section id="products" className="mt-18 scroll-mt-24 md:mt-24">
          <h2 className="font-[var(--font-headline)] text-center text-3xl font-bold text-slate-950 md:text-5xl">
            Choose the Product That&apos;s Right for You
          </h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {productTypes.map((product) => (
              <article
                key={product.title}
                className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-lg shadow-slate-900/5 transition duration-300 hover:-translate-y-1.5 hover:shadow-xl"
              >
                <div className={`inline-flex rounded-2xl bg-gradient-to-br ${product.accent} p-3 text-3xl`}>
                  {product.icon}
                </div>
                <h3 className="mt-5 font-[var(--font-headline)] text-3xl font-bold text-slate-950">
                  {product.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-700">{product.description}</p>

                <div className="mt-6 grid grid-cols-2 gap-2">
                  {product.actions.map((action) => (
                    <Link
                      key={action.label}
                      href={action.href}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-100"
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-18 md:mt-24">
          <h2 className="font-[var(--font-headline)] text-center text-3xl font-bold text-slate-950 md:text-5xl">
            Products Built for Real Classrooms
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {productCards.map((card) => (
              <article
                key={card.name}
                className="rounded-3xl border border-slate-200 bg-white p-7 shadow-md shadow-slate-900/5 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <h3 className="font-[var(--font-headline)] text-2xl font-bold text-slate-950">{card.name}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-700">{card.description}</p>
                <ul className="mt-5 space-y-2 text-sm text-slate-700">
                  {card.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-cyan-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/pricing"
                  className="mt-6 inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Learn More
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section id="why" className="mt-18 scroll-mt-24 md:mt-24">
          <h2 className="font-[var(--font-headline)] text-center text-3xl font-bold text-slate-950 md:text-5xl">
            Why Grammar Galaxy
          </h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {platformBenefits.map((benefit) => (
              <article
                key={benefit}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {benefit}
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mt-18 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-8 shadow-md shadow-slate-900/5 md:mt-24 md:p-12">
          <h2 className="font-[var(--font-headline)] text-center text-3xl font-bold text-slate-950 md:text-5xl">
            How It Works
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-4">
            {timelineSteps.map((step, index) => (
              <div key={step} className="relative rounded-2xl bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Step {index + 1}
                </p>
                <p className="mt-2 font-semibold text-slate-900">{step}</p>
                {index < timelineSteps.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="mt-3 block text-xl text-slate-400 md:absolute md:-right-3 md:top-1/2 md:mt-0 md:-translate-y-1/2"
                  >
                    ↓
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="mt-18 scroll-mt-24 md:mt-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-[var(--font-headline)] text-3xl font-bold text-slate-950 md:text-5xl">
                Pricing
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">
                Flexible subscriptions for students, teachers, and schools. Billing and checkout use your existing Stripe plan configuration.
              </p>
            </div>
            <Link
              href="/pricing"
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              View Full Pricing
            </Link>
          </div>

          <div className="mt-9 grid gap-5 lg:grid-cols-3">
            {SUBSCRIPTION_PLAN_ORDER.map((planKey) => {
              const { plan, badge, billingMode } = planSummary(planKey);

              return (
                <article
                  key={plan.key}
                  className={`rounded-3xl border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${plan.featured ? "border-cyan-300 bg-cyan-50/70" : "border-slate-200 bg-white"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                      {plan.customerType.replaceAll("_", " ")}
                    </p>
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                      {badge}
                    </span>
                  </div>
                  <h3 className="mt-4 font-[var(--font-headline)] text-2xl font-bold text-slate-950">
                    {plan.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{plan.description}</p>
                  <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-800">
                    {billingMode}
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-700">
                    {plan.highlights.map((highlight) => (
                      <li key={highlight} className="flex items-center gap-2">
                        <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <Link
                      href="/login?role=teacher"
                      className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-slate-800"
                    >
                      Start Free Trial
                    </Link>
                    <Link
                      href="/account/subscription"
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-900 transition hover:bg-slate-100"
                    >
                      Buy Plan
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="schools" className="mt-18 scroll-mt-24 md:mt-24">
          <h2 className="font-[var(--font-headline)] text-center text-3xl font-bold text-slate-950 md:text-5xl">
            Testimonials
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {testimonials.map((item) => (
              <blockquote
                key={item.role}
                className="rounded-3xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700 shadow-sm"
              >
                <p>&ldquo;{item.quote}&rdquo;</p>
                <footer className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                  {item.role}
                </footer>
              </blockquote>
            ))}
          </div>
        </section>

        <section id="resources" className="mt-18 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:mt-24 md:p-12">
          <h2 className="font-[var(--font-headline)] text-3xl font-bold text-slate-950 md:text-5xl">
            FAQ
          </h2>
          <div className="mt-8 space-y-4">
            {faqs.map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4"
              >
                <summary className="cursor-pointer list-none text-base font-semibold text-slate-900">
                  {item.question}
                  <span className="ml-2 text-slate-500 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-slate-700">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="final-cta" className="mt-18 rounded-[2.25rem] bg-slate-950 px-8 py-14 text-center text-white shadow-2xl shadow-slate-900/25 md:mt-24 md:px-12">
          <h2 className="font-[var(--font-headline)] text-3xl font-bold md:text-5xl">
            Ready to Transform Learning?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
            Start with a free trial today, then scale into the plan that fits your class, school, or district.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/login?role=teacher"
              className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Start Free Trial
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              View Pricing
            </Link>
          </div>
        </section>

        <footer id="about" className="mt-12 grid gap-8 rounded-3xl border border-slate-200 bg-white px-8 py-10 text-sm text-slate-700 shadow-sm md:grid-cols-3">
          <div>
            <p className="font-[var(--font-headline)] text-xl font-bold text-slate-950">Grammar Galaxy</p>
            <p className="mt-2 leading-7">
              Premium AI learning tools for classrooms, independent learners, and school leadership teams.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link href="#products" className="transition hover:text-slate-950">Products</Link>
            <Link href="/pricing" className="transition hover:text-slate-950">Pricing</Link>
            <Link href="#schools" className="transition hover:text-slate-950">Schools</Link>
            <Link href="#resources" className="transition hover:text-slate-950">Resources</Link>
            <Link href="#resources" className="transition hover:text-slate-950">Support</Link>
            <Link href="/" className="transition hover:text-slate-950">Privacy Policy</Link>
            <Link href="/" className="transition hover:text-slate-950">Terms of Service</Link>
            <Link href="#final-cta" className="transition hover:text-slate-950">Contact</Link>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Social</p>
            <div className="flex flex-wrap gap-2">
              <a href="#" className="rounded-lg border border-slate-200 px-3 py-2 transition hover:bg-slate-100">X</a>
              <a href="#" className="rounded-lg border border-slate-200 px-3 py-2 transition hover:bg-slate-100">LinkedIn</a>
              <a href="#" className="rounded-lg border border-slate-200 px-3 py-2 transition hover:bg-slate-100">YouTube</a>
            </div>
            <p className="text-xs text-slate-500">© {new Date().getFullYear()} Grammar Galaxy. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </main>
  );
}
