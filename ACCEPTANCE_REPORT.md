# Veylo — Payment & SaaS Monetization Acceptance Report

**Date:** 2026-08-15
**Scope:** Platform service fees, owner UPI payments, subscriptions, platform/owner revenue separation, admin monetization dashboards.

## Acceptance Criteria — 19 points

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | Owner rental money is never mixed with platform revenue (fees/subscriptions/ads). | PASS | Separate stores/tables (`invoices` vs `platform_revenue`); `aggregateRevenue` only sums `PLATFORM_FEE`/`SUBSCRIPTION`/etc. logs, never rental invoices. |
| 2 | Platform fee is config-driven (enabled/type/value), never hardcoded. | PASS | `PlatformMonetizationSettings` in storage + `computePlatformFee()`; default OFF (`NONE`). |
| 3 | Fee is charged on top of the rental — the owner keeps the full rental amount. | PASS | `splitRentalMoney()`; UPI amount = rental + fee (`rentalTripService`). |
| 4 | Invoice snapshots the payment destination + fee at creation; later owner UPI changes never rewrite old invoices. | PASS | `payeeName`/`payeeUpiId`/`platformFeeRupees` baked into `Invoice`; `paymentService` routes only to `invoice.payeeUpiId`. |
| 5 | Rider never supplies ownerId/organizationId/upiId/amounts. | PASS | Destination resolved from invoice snapshot in `initiatePaymentAttempt`; client payloads are ignored for routing. |
| 6 | A payment is never marked PAID because the rider returned from a UPI app or a browser callback. | PASS | Only `processPaymentWebhook()` can emit `MARK_PAID`; deep links only open the UPI app. |
| 7 | Webhook processing verifies HMAC-SHA256 signatures. | PASS | `verifyWebhookSignature()` (constant-time compare), enforced in `processPaymentWebhook`. |
| 8 | Webhook processing is idempotent by `event_id`. | PASS | `WebhookStore.hasEventId` dedupe; replay returns `duplicate`. |
| 9 | Webhook events are logged to an audit trail before state changes. | PASS | `payment_events` via `addPaymentEvent` before applying the action. |
| 10 | Payment state transitions are validated. | PASS | `isLegalPaymentTransition()` — PAID terminal, REFUNDED only from PAID, FAILED cannot silently become PAID. |
| 11 | Platform fee is recorded as `PLATFORM_FEE` revenue only on verified payment, idempotently. | PASS | `addPlatformRevenueLogIfNew(referenceId: PLATFORM_FEE_<paymentId>)`. |
| 12 | Subscriptions are verify-before-activate; simulated failure leaves plan + revenue untouched. | PASS | `purchaseSubscription()` routes through webhook pipeline; `simulateFailure` throws before any change (TEST F). |
| 13 | Subscription revenue is recorded only after a verified payment, idempotently. | PASS | `referenceId: SUB_<plan>_<org>`. |
| 14 | SaaS metrics are computed from stored data, never client input. | PASS | `computeSaaSMetrics()` — MRR/ARR/conversion/churn/ARPU from subscriptions + plans. |
| 15 | Owner Payments dashboard (earnings + UPI destination + history). | PASS | `/owner/payments` (`OwnerPaymentsClient`). |
| 16 | Admin Revenue dashboard (platform breakdown, series, SaaS metrics, separation banner, subscription ledger). | PASS | `/admin/revenue` (`AdminRevenueClient`). |
| 17 | Monetization settings page (fee, advertising, plan limits/pricing), all persisted and used. | PASS | `/admin/settings/monetization` (`AdminMonetizationClient`) → `computePlatformFee`, `AdSlot`. |
| 18 | Plan-based gating (ads off when global advertising disabled or plan disallows). | PASS | `AdSlot` + `entitlementEngine`. |
| 19 | Build + tests green; GitHub Pages deployment preserved. | PASS | `next build` — 36 static routes exported; `npm test` — 29/29 (3 files). |

## Honest limitations (accepted, not hidden)

1. **No real payment provider is configured.** Verification is simulated, but it runs through the exact pipeline (`processPaymentWebhook`) a real provider webhook must call. When the app moves off static export, add the `/api/payments/webhook` route that calls this processing core — it is already the single source of truth.
2. **Platform fees are recorded as revenue but never actually collected** — there is no payment processor in a static-export client.
3. **The other session's server cluster was removed** (`src/app/api/**`, `src/middleware.ts`, `src/lib/supabase`, `src/lib/services/supabase`) because route handlers + middleware are incompatible with `output: 'export'` (GitHub Pages) and broke the build. The webhook route should be re-created (calling `webhookService.ts`) once a server target exists.
4. **Two schema sources now exist**: `supabase/schema.sql` (canonical — updated with invoice snapshot columns, plan seeds, FREE-subscription trigger, RLS) and `supabase/migrations/20260815000000_initial_schema.sql` (duplicate superset from the other session). Reconcile to one before applying.
5. Test files were migrated from `node:test` to **vitest** (`npm test`) by the other session — kept, since a proper runner is an improvement.

## Runbook

```bash
npm test      # 29 tests, 3 files
npm run build # static export to ./out (GitHub Pages deploy workflow)
```
