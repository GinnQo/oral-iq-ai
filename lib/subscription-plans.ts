export const SUBSCRIPTION_TRIAL_DAYS = 14;

export type BillingOwnerType = "user" | "school";

export type BillingCadence = "month" | "year";

export type CustomerType =
  | "FREE"
  | "FREE_TRIAL"
  | "STUDENT_LEARNER"
  | "INDIVIDUAL_TEACHER"
  | "TUTOR_SMALL_ACADEMY"
  | "SCHOOL_STARTER"
  | "SCHOOL_PROFESSIONAL"
  | "SCHOOL_PREMIUM"
  | "SCHOOL"
  | "ENTERPRISE";

export type CanonicalSubscriptionPlanKey =
  | "FREE"
  | "FREE_TRIAL"
  | "STUDENT_LEARNER"
  | "INDIVIDUAL_TEACHER"
  | "TUTOR_SMALL_ACADEMY"
  | "SCHOOL_STARTER"
  | "SCHOOL_PROFESSIONAL"
  | "SCHOOL_PREMIUM"
  | "ENTERPRISE";

export type LegacySubscriptionPlanKey =
  | "SCHOOL"
  | "TEACHER_MONTHLY"
  | "TEACHER_ANNUAL"
  | "SCHOOL_MONTHLY"
  | "SCHOOL_ANNUAL";

export type SubscriptionPlanKey = CanonicalSubscriptionPlanKey | LegacySubscriptionPlanKey;

export type PlanUsageLimits = {
  canAccessTeacherWorkspace: boolean;
  canUsePractice: boolean;
  canUseClassroomImport: boolean;
  canUseAssessmentBuilder: boolean;
  canUseReports: boolean;
  maxClassrooms: number | null;
  maxStudents: number | null;
  maxAssessmentsPerMonth: number | null;
};

export type SubscriptionPlanConfig = {
  key: CanonicalSubscriptionPlanKey;
  title: string;
  description: string;
  billingOwner: BillingOwnerType;
  customerType: CustomerType;
  featured?: boolean;
  trialDays?: number;
  contactSales?: boolean;
  priceEnvByCadence?: Partial<Record<BillingCadence, string>>;
  usageLimits: PlanUsageLimits;
  highlights: string[];
};

export const SUBSCRIPTION_PLAN_ALIASES: Record<LegacySubscriptionPlanKey, CanonicalSubscriptionPlanKey> = {
  SCHOOL: "SCHOOL_STARTER",
  TEACHER_MONTHLY: "INDIVIDUAL_TEACHER",
  TEACHER_ANNUAL: "INDIVIDUAL_TEACHER",
  SCHOOL_MONTHLY: "SCHOOL_STARTER",
  SCHOOL_ANNUAL: "SCHOOL_STARTER",
};

export const SUBSCRIPTION_PLANS: Record<CanonicalSubscriptionPlanKey, SubscriptionPlanConfig> = {
  FREE: {
    key: "FREE",
    title: "Free",
    description: "Lightweight access for exploring OralIQ AI with practice-only tools and strict limits.",
    billingOwner: "user",
    customerType: "FREE",
    usageLimits: {
      canAccessTeacherWorkspace: false,
      canUsePractice: true,
      canUseClassroomImport: false,
      canUseAssessmentBuilder: false,
      canUseReports: false,
      maxClassrooms: 0,
      maxStudents: 0,
      maxAssessmentsPerMonth: 0,
    },
    highlights: ["Practice-only access", "Upgrade whenever you are ready"],
  },
  FREE_TRIAL: {
    key: "FREE_TRIAL",
    title: "Free Trial",
    description: "Try the full teacher workflow before choosing a paid plan.",
    billingOwner: "user",
    customerType: "FREE_TRIAL",
    trialDays: SUBSCRIPTION_TRIAL_DAYS,
    usageLimits: {
      canAccessTeacherWorkspace: true,
      canUsePractice: true,
      canUseClassroomImport: true,
      canUseAssessmentBuilder: true,
      canUseReports: true,
      maxClassrooms: 1,
      maxStudents: 25,
      maxAssessmentsPerMonth: 10,
    },
    highlights: ["Full teacher access", `${SUBSCRIPTION_TRIAL_DAYS}-day trial`],
  },
  STUDENT_LEARNER: {
    key: "STUDENT_LEARNER",
    title: "Student / Independent Learner",
    description: "For learners who want guided speaking feedback without teacher-admin tools.",
    billingOwner: "user",
    customerType: "STUDENT_LEARNER",
    priceEnvByCadence: {
      month: "STRIPE_PRICE_STUDENT_LEARNER_MONTHLY",
      year: "STRIPE_PRICE_STUDENT_LEARNER_ANNUAL",
    },
    usageLimits: {
      canAccessTeacherWorkspace: false,
      canUsePractice: true,
      canUseClassroomImport: false,
      canUseAssessmentBuilder: false,
      canUseReports: false,
      maxClassrooms: 0,
      maxStudents: 0,
      maxAssessmentsPerMonth: 0,
    },
    highlights: ["Practice feedback", "Self-directed growth", "Personal speaking history"],
  },
  INDIVIDUAL_TEACHER: {
    key: "INDIVIDUAL_TEACHER",
    title: "Individual Teacher",
    description: "For solo teachers who need grading, reports, and classroom workflows.",
    billingOwner: "user",
    customerType: "INDIVIDUAL_TEACHER",
    featured: true,
    priceEnvByCadence: {
      month: "STRIPE_PRICE_INDIVIDUAL_TEACHER_MONTHLY",
      year: "STRIPE_PRICE_INDIVIDUAL_TEACHER_ANNUAL",
    },
    usageLimits: {
      canAccessTeacherWorkspace: true,
      canUsePractice: true,
      canUseClassroomImport: true,
      canUseAssessmentBuilder: true,
      canUseReports: true,
      maxClassrooms: 3,
      maxStudents: 75,
      maxAssessmentsPerMonth: 100,
    },
    highlights: ["Teacher dashboard", "AI feedback and grading", "Google Classroom import"],
  },
  TUTOR_SMALL_ACADEMY: {
    key: "TUTOR_SMALL_ACADEMY",
    title: "Tutor / Small Academy",
    description: "Built for tutors, small centers, and after-school programs with multiple rosters.",
    billingOwner: "school",
    customerType: "TUTOR_SMALL_ACADEMY",
    priceEnvByCadence: {
      month: "STRIPE_PRICE_TUTOR_SMALL_ACADEMY_MONTHLY",
      year: "STRIPE_PRICE_TUTOR_SMALL_ACADEMY_ANNUAL",
    },
    usageLimits: {
      canAccessTeacherWorkspace: true,
      canUsePractice: true,
      canUseClassroomImport: true,
      canUseAssessmentBuilder: true,
      canUseReports: true,
      maxClassrooms: 8,
      maxStudents: 250,
      maxAssessmentsPerMonth: 500,
    },
    highlights: ["Multi-room tutoring", "Shared academy billing", "Expanded usage limits"],
  },
  SCHOOL_STARTER: {
    key: "SCHOOL_STARTER",
    title: "School Starter",
    description: "Centralized billing for schools and departments with shared administrative control.",
    billingOwner: "school",
    customerType: "SCHOOL_STARTER",
    featured: true,
    priceEnvByCadence: {
      month: "STRIPE_PRICE_SCHOOL_STARTER_MONTHLY",
      year: "STRIPE_PRICE_SCHOOL_STARTER_ANNUAL",
    },
    usageLimits: {
      canAccessTeacherWorkspace: true,
      canUsePractice: true,
      canUseClassroomImport: true,
      canUseAssessmentBuilder: true,
      canUseReports: true,
      maxClassrooms: 25,
      maxStudents: 1000,
      maxAssessmentsPerMonth: 2500,
    },
    highlights: ["School-wide billing", "Department-ready controls", "Higher seat limits"],
  },
  SCHOOL_PROFESSIONAL: {
    key: "SCHOOL_PROFESSIONAL",
    title: "School Professional",
    description: "For larger schools that need broader staff coverage and more monthly grading capacity.",
    billingOwner: "school",
    customerType: "SCHOOL_PROFESSIONAL",
    priceEnvByCadence: {
      month: "STRIPE_PRICE_SCHOOL_PROFESSIONAL_MONTHLY",
      year: "STRIPE_PRICE_SCHOOL_PROFESSIONAL_ANNUAL",
    },
    usageLimits: {
      canAccessTeacherWorkspace: true,
      canUsePractice: true,
      canUseClassroomImport: true,
      canUseAssessmentBuilder: true,
      canUseReports: true,
      maxClassrooms: 60,
      maxStudents: 3000,
      maxAssessmentsPerMonth: 6000,
    },
    highlights: ["Expanded teacher coverage", "Higher reporting throughput", "Multi-team administration"],
  },
  SCHOOL_PREMIUM: {
    key: "SCHOOL_PREMIUM",
    title: "School Premium",
    description: "For campus-wide deployments that need the highest limits before enterprise contracting.",
    billingOwner: "school",
    customerType: "SCHOOL_PREMIUM",
    priceEnvByCadence: {
      month: "STRIPE_PRICE_SCHOOL_PREMIUM_MONTHLY",
      year: "STRIPE_PRICE_SCHOOL_PREMIUM_ANNUAL",
    },
    usageLimits: {
      canAccessTeacherWorkspace: true,
      canUsePractice: true,
      canUseClassroomImport: true,
      canUseAssessmentBuilder: true,
      canUseReports: true,
      maxClassrooms: 120,
      maxStudents: 10000,
      maxAssessmentsPerMonth: 15000,
    },
    highlights: ["District-scale limits", "High-volume analytics", "Premium onboarding readiness"],
  },
  ENTERPRISE: {
    key: "ENTERPRISE",
    title: "Enterprise / District",
    description: "Custom deployments with procurement support, higher limits, and onboarding help.",
    billingOwner: "school",
    customerType: "ENTERPRISE",
    contactSales: true,
    usageLimits: {
      canAccessTeacherWorkspace: true,
      canUsePractice: true,
      canUseClassroomImport: true,
      canUseAssessmentBuilder: true,
      canUseReports: true,
      maxClassrooms: null,
      maxStudents: null,
      maxAssessmentsPerMonth: null,
    },
    highlights: ["Custom pricing", "District onboarding", "Unlimited growth path"],
  },
};

export const SUBSCRIPTION_PLAN_ORDER: CanonicalSubscriptionPlanKey[] = [
  "FREE",
  "FREE_TRIAL",
  "STUDENT_LEARNER",
  "INDIVIDUAL_TEACHER",
  "TUTOR_SMALL_ACADEMY",
  "SCHOOL_STARTER",
  "SCHOOL_PROFESSIONAL",
  "SCHOOL_PREMIUM",
  "ENTERPRISE",
];

export function normalizeSubscriptionPlanKey(value: string): CanonicalSubscriptionPlanKey | null {
  if (value in SUBSCRIPTION_PLANS) {
    return value as CanonicalSubscriptionPlanKey;
  }

  if (value in SUBSCRIPTION_PLAN_ALIASES) {
    return SUBSCRIPTION_PLAN_ALIASES[value as LegacySubscriptionPlanKey];
  }

  return null;
}

export function isSubscriptionPlanKey(value: string): value is SubscriptionPlanKey {
  return normalizeSubscriptionPlanKey(value) !== null;
}

export function getPlanConfig(plan: SubscriptionPlanKey): SubscriptionPlanConfig {
  const normalizedPlan = normalizeSubscriptionPlanKey(plan);

  if (!normalizedPlan) {
    throw new Error(`Unknown subscription plan: ${plan}`);
  }

  return SUBSCRIPTION_PLANS[normalizedPlan];
}

export function getPlanUsageLimits(plan: SubscriptionPlanKey): PlanUsageLimits {
  return getPlanConfig(plan).usageLimits;
}
