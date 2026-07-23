-- Create enums for subscription billing
CREATE TYPE "SubscriptionPlan" AS ENUM (
  'FREE_TRIAL',
  'TEACHER_MONTHLY',
  'TEACHER_ANNUAL',
  'SCHOOL_MONTHLY',
  'SCHOOL_ANNUAL'
);

CREATE TYPE "SubscriptionStatus" AS ENUM (
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'CANCELED',
  'INCOMPLETE',
  'INCOMPLETE_EXPIRED',
  'PAUSED',
  'EXPIRED'
);

-- Extend users with school membership
ALTER TABLE "users"
  ADD COLUMN "schoolId" TEXT;

-- Schools hold centralized billing for org plans
CREATE TABLE "schools" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "billingEmail" TEXT,
  "createdByUserId" TEXT,
  "stripeCustomerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "schools_stripeCustomerId_key" ON "schools"("stripeCustomerId");
CREATE INDEX "schools_createdByUserId_idx" ON "schools"("createdByUserId");

-- Subscriptions can belong to either a user or a school
CREATE TABLE "subscriptions" (
  "id" TEXT NOT NULL,
  "plan" "SubscriptionPlan" NOT NULL,
  "status" "SubscriptionStatus" NOT NULL,
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT,
  "stripeCheckoutSessionId" TEXT,
  "stripePriceId" TEXT,
  "stripeProductId" TEXT,
  "billingEmail" TEXT,
  "currency" TEXT DEFAULT 'usd',
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "trialEndsAt" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "canceledAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "userId" TEXT,
  "schoolId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscriptions_stripeCustomerId_key" ON "subscriptions"("stripeCustomerId");
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");
CREATE UNIQUE INDEX "subscriptions_stripeCheckoutSessionId_key" ON "subscriptions"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");
CREATE UNIQUE INDEX "subscriptions_schoolId_key" ON "subscriptions"("schoolId");
CREATE INDEX "subscriptions_plan_idx" ON "subscriptions"("plan");
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");
CREATE INDEX "subscriptions_currentPeriodEnd_idx" ON "subscriptions"("currentPeriodEnd");

-- Foreign keys
ALTER TABLE "users"
  ADD CONSTRAINT "users_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "schools"
  ADD CONSTRAINT "schools_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
