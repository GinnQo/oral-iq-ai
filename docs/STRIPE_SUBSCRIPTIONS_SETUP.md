# Stripe Subscription Setup

## Required environment variables

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STUDENT_LEARNER_MONTHLY`
- `STRIPE_PRICE_STUDENT_LEARNER_ANNUAL`
- `STRIPE_PRICE_INDIVIDUAL_TEACHER_MONTHLY`
- `STRIPE_PRICE_INDIVIDUAL_TEACHER_ANNUAL`
- `STRIPE_PRICE_TUTOR_SMALL_ACADEMY_MONTHLY`
- `STRIPE_PRICE_TUTOR_SMALL_ACADEMY_ANNUAL`
- `STRIPE_PRICE_SCHOOL_STARTER_MONTHLY`
- `STRIPE_PRICE_SCHOOL_STARTER_ANNUAL`
- `STRIPE_PRICE_SCHOOL_PROFESSIONAL_MONTHLY`
- `STRIPE_PRICE_SCHOOL_PROFESSIONAL_ANNUAL`
- `STRIPE_PRICE_SCHOOL_PREMIUM_MONTHLY`
- `STRIPE_PRICE_SCHOOL_PREMIUM_ANNUAL`

## Stripe products and prices

Create recurring prices in Stripe and map each one to the matching env var. The app uses the price IDs to identify the purchased plan in checkout and webhook processing.

## Webhook endpoint

Configure the Stripe webhook endpoint to point at:

- `/api/stripe/webhook`

Subscribe to these events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

## Billing flow

1. A user opens `/account/subscription` or `/pricing`.
2. Checkout creates a Stripe subscription for the selected customer type and billing cadence.
3. The webhook stores the subscription in Prisma.
4. The proxy and subscription gate unlock the appropriate workspace based on access rules.
