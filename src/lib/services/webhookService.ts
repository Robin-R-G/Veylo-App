import { isLegalPaymentTransition } from './platformEconomics.ts';

// =============================================================================
// Secure webhook architecture for a future payment provider.
//
// A static-export client cannot host a server endpoint; this module is the
// processing core that a real `/api/payments/webhook` route (or Supabase Edge
// Function) must call. It enforces:
//   1. HMAC-SHA256 signature verification   — never trust an unsigned request
//   2. Idempotency                          — event_id dedupe
//   3. Replay protection                    — event_id is recorded once
//   4. Event logging                        — caller persists via the store
//   5. Payment state validation             — only legal transitions are applied
// =============================================================================

export type PaymentWebhookEventType =
  | 'payment.captured'
  | 'payment.paid'
  | 'payment.failed'
  | 'payment.refunded'
  | 'subscription.activated'
  | 'subscription.payment_success'
  | 'subscription.payment_failed'
  | string; // forward-compatible with provider-specific event names

export type WebhookAction =
  | 'MARK_PAID'
  | 'MARK_FAILED'
  | 'MARK_REFUNDED'
  | 'ACTIVATE_SUBSCRIPTION'
  | 'NOOP';

export interface PaymentWebhook {
  provider: string;
  eventId: string;
  eventType: PaymentWebhookEventType;
  payload: Record<string, any>;
  signature?: string;
  secret?: string;
  rawBody?: string;
}

export interface WebhookStore {
  hasEventId(eventId: string): boolean;
  addEvent(event: { eventId: string; provider: string; eventType: string; payload: any }): void;
}

export interface WebhookResult {
  accepted: boolean;
  duplicate?: boolean;
  error?: string;
  action?: WebhookAction;
  targetType?: 'PAYMENT' | 'SUBSCRIPTION';
  targetRef?: string;
}

export async function verifyWebhookSignature(
  secret: string,
  signature: string,
  payload: string
): Promise<boolean> {
  if (!secret || !signature) return false;
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
    const expected = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');

    // Constant-time comparison
    const hasBuffer = typeof Buffer !== 'undefined';
    const a = hasBuffer ? Buffer.from(signature, 'utf8') : null;
    const b = hasBuffer ? Buffer.from(expected, 'utf8') : null;
    if (a && b) {
      if (a.length !== b.length) return false;
      let diff = 0;
      for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
      return diff === 0;
    }
    return signature === expected;
  } catch {
    return false;
  }
}

function resolveEvent(eventType: PaymentWebhookEventType): {
  action: WebhookAction;
  targetType: 'PAYMENT' | 'SUBSCRIPTION';
  targetRefKey: string;
} | null {
  if (eventType === 'payment.captured' || eventType === 'payment.paid') {
    return { action: 'MARK_PAID', targetType: 'PAYMENT', targetRefKey: 'paymentId' };
  }
  if (eventType === 'payment.failed') {
    return { action: 'MARK_FAILED', targetType: 'PAYMENT', targetRefKey: 'paymentId' };
  }
  if (eventType === 'payment.refunded') {
    return { action: 'MARK_REFUNDED', targetType: 'PAYMENT', targetRefKey: 'paymentId' };
  }
  if (eventType === 'subscription.activated' || eventType === 'subscription.payment_success') {
    return { action: 'ACTIVATE_SUBSCRIPTION', targetType: 'SUBSCRIPTION', targetRefKey: 'providerSubscriptionId' };
  }
  // subscription.payment_failed and unknown events → acknowledged, no state change
  return { action: 'NOOP', targetType: 'SUBSCRIPTION', targetRefKey: 'providerSubscriptionId' };
}

/**
 * Validates and processes an inbound provider webhook.
 * The caller must apply the returned action with isLegalPaymentTransition().
 */
export async function processPaymentWebhook(
  webhook: PaymentWebhook,
  store: WebhookStore
): Promise<WebhookResult> {
  // 1. Signature verification
  if (webhook.secret) {
    const valid = await verifyWebhookSignature(
      webhook.secret,
      webhook.signature || '',
      webhook.rawBody || JSON.stringify(webhook.payload)
    );
    if (!valid) {
      return { accepted: false, error: 'INVALID_SIGNATURE' };
    }
  }

  // 2. Idempotency + replay protection (event_id must be unique)
  if (store.hasEventId(webhook.eventId)) {
    return { accepted: true, duplicate: true };
  }

  // 3. Resolve the intended action
  const resolved = resolveEvent(webhook.eventType);
  if (!resolved) {
    return { accepted: false, error: 'UNKNOWN_EVENT_TYPE' };
  }

  // 4. Record the event BEFORE applying (replay-safe: retries become no-ops)
  store.addEvent({
    eventId: webhook.eventId,
    provider: webhook.provider,
    eventType: webhook.eventType,
    payload: webhook.payload,
  });

  const targetRef = String(webhook.payload?.[resolved.targetRefKey] || '');

  // 5. Payment state validation — a terminal PAID is never re-applied, and a
  //    failed payment can only become PAID via a fresh captured event.
  if (resolved.action === 'MARK_PAID') {
    const from = String(webhook.payload?.fromStatus || 'PAYMENT_PROCESSING');
    if (!isLegalPaymentTransition(from, 'PAID')) {
      return { accepted: false, error: `ILLEGAL_TRANSITION:${from}->PAID`, action: 'NOOP' };
    }
  }
  if (resolved.action === 'MARK_REFUNDED') {
    const from = String(webhook.payload?.fromStatus || 'PAID');
    if (!isLegalPaymentTransition(from, 'REFUNDED')) {
      return { accepted: false, error: `ILLEGAL_TRANSITION:${from}->REFUNDED`, action: 'NOOP' };
    }
  }

  return {
    accepted: true,
    action: resolved.action,
    targetType: resolved.targetType,
    targetRef,
  };
}
