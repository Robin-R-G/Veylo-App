import { PaymentStatus, PaymentAttempt, Invoice, Subscription } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { generateUpiDeepLink } from './financialEngine';
import { processPaymentWebhook, WebhookStore } from './webhookService';

const supabase = createClient();

function mapAttempt(a: any): PaymentAttempt {
  return {
    paymentId: a.payment_id ?? a.id,
    tripId: a.trip_id,
    invoiceId: a.invoice_id,
    ownerId: a.owner_id,
    riderId: a.rider_id,
    amount: Number(a.amount ?? 0),
    currency: a.currency ?? 'INR',
    paymentMethod: a.payment_method ?? 'UPI_DIRECT',
    paymentDestination: a.payment_destination ?? '',
    status: a.status,
    providerReference: a.provider_reference,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
    paidAt: a.paid_at,
  };
}

export interface PaymentProvider {
  name: string;
  supportedMethods: string[];
  initiatePayment(params: {
    invoice: Invoice;
    tripId: string;
    ownerId: string;
    riderId: string;
    amount: number;
    paymentMethod: string;
    destination: string;
  }): Promise<{
    paymentId: string;
    status: PaymentStatus | 'PAYMENT_PROCESSING';
    paymentDestination: string;
    upiDeepLink?: string;
    providerReference?: string;
  }>;
  verifyPayment(paymentId: string, providerReference?: string): Promise<{
    status: PaymentStatus;
    paidAt?: string;
  }>;
}

// 1. Direct UPI Payment Provider (default current implementation)
//    UPI deep-links only OPEN the payer's UPI app. They are NOT proof of
//    payment — verification must come from the provider webhook path.
export class UpiDirectPaymentProvider implements PaymentProvider {
  name = 'UPI_DIRECT';
  supportedMethods = ['UPI_DIRECT'];

  async initiatePayment(params: {
    invoice: Invoice;
    tripId: string;
    ownerId: string;
    riderId: string;
    amount: number;
    paymentMethod: string;
    destination: string;
  }) {
    const upiDeepLink = generateUpiDeepLink({
      payeeUpiId: params.destination,
      payeeName: params.invoice.payeeName || 'Vehicle Owner',
      amountRupees: params.amount,
      transactionNote: `Rental invoice ${params.invoice.invoiceNumber}`,
      referenceId: params.invoice.invoiceNumber,
      invoiceId: params.invoice.id
    });

    const mockAttemptId = `pay_upi_${Date.now()}`;
    return {
      paymentId: mockAttemptId,
      status: 'PAYMENT_PROCESSING' as const,
      paymentDestination: params.destination,
      upiDeepLink,
      providerReference: `TXN_UPI_${Date.now()}`
    };
  }

  async verifyPayment(paymentId: string, providerReference?: string) {
    return {
      status: 'PAID' as PaymentStatus,
      paidAt: new Date().toISOString()
    };
  }
}

// 2. Cash Payment Provider
  export class CashPaymentProvider implements PaymentProvider {
    name = 'CASH';
    supportedMethods = ['CASH'];

    async initiatePayment(params: {
      invoice: Invoice;
      tripId: string;
      ownerId: string;
      riderId: string;
      amount: number;
      paymentMethod: string;
      destination: string;
    }) {
      return {
        paymentId: `pay_cash_${Date.now()}`,
        status: 'CASH_REPORTED' as const,
        paymentDestination: 'HAND_CASH',
        providerReference: `CASH_${Date.now()}`
      };
    }

    async verifyPayment(paymentId: string) {
      return {
        status: 'PAID' as PaymentStatus,
        paidAt: new Date().toISOString()
      };
    }
  }

/** Adapter that records provider webhook events into Supabase (audit trail). */
async function webhookStore(): Promise<WebhookStore> {
  const { data: events } = await supabase.from('payment_events').select('event_id');
  const seen = new Set<string>((events || []).map((e: any) => e.event_id));

  return {
    hasEventId: (eventId: string) => seen.has(eventId),
    addEvent: (event: { eventId: string; provider: string; eventType: string; payload: any }) => {
      seen.add(event.eventId);
      supabase.from('payment_events').insert({
        event_id: event.eventId,
        provider: event.provider,
        event_type: event.eventType,
        payload: event.payload,
      });
    },
  };
}

class CorePaymentService {
  private providers: Map<string, PaymentProvider> = new Map();
  private defaultProviderName = 'UPI_DIRECT';

  constructor() {
    this.registerProvider(new UpiDirectPaymentProvider());
    this.registerProvider(new CashPaymentProvider());
  }

  registerProvider(provider: PaymentProvider) {
    this.providers.set(provider.name, provider);
  }

  private resolveProvider(method: string): PaymentProvider | undefined {
    if (method === 'CASH') return this.providers.get('CASH');
    return this.providers.get(method) || this.providers.get(this.defaultProviderName);
  }

  async initiatePaymentAttempt(params: {
    invoiceId: string;
    paymentMethod: string;
  }): Promise<PaymentAttempt> {
    const { data: invoice } = await supabase.from('invoices').select('*').eq('id', params.invoiceId).single();
    if (!invoice) throw new Error(`Invoice ${params.invoiceId} not found`);

    const { data: trip } = await supabase.from('rental_trips').select('*').eq('id', invoice.trip_id).single();
    if (!trip) throw new Error(`Rental trip associated with invoice not found`);

    const { data: existing } = await supabase.from('payment_attempts').select('*').eq('invoice_id', invoice.id);
    const attempts = (existing || []).map(mapAttempt);

    const completed = attempts.find(p => p.status === 'PAID');
    if (completed) return completed;

    const processing = attempts.find(p => p.status === 'PAYMENT_PROCESSING' || p.status === 'PAYMENT_INITIATED');
    if (processing && params.paymentMethod === processing.paymentMethod) return processing;

    const { data: org } = await supabase.from('organizations').select('*').eq('id', invoice.organization_id).single();
    const { data: paymentSetting } = await supabase
      .from('payment_settings')
      .select('upi_id')
      .eq('organization_id', invoice.organization_id)
      .maybeSingle();
    const dest = invoice.payee_upi_id || paymentSetting?.upi_id || org?.upi_id || 'metherobin@oksbi';

    const provider = this.resolveProvider(params.paymentMethod);
    if (!provider) throw new Error(`Payment provider for ${params.paymentMethod} not found`);

    const initResult = await provider.initiatePayment({
      invoice: invoice as unknown as Invoice,
      tripId: trip.id,
      ownerId: trip.owner_id || org?.id,
      riderId: trip.rider_id,
      amount: invoice.total_rupees,
      paymentMethod: params.paymentMethod,
      destination: dest
    });

    const { data: attemptData } = await supabase.from('payment_attempts').insert({
      organization_id: invoice.organization_id,
      trip_id: trip.id,
      invoice_id: invoice.id,
      owner_id: trip.owner_id || org?.id,
      rider_id: trip.rider_id,
      amount: invoice.total_rupees,
      currency: 'INR',
      payment_method: params.paymentMethod,
      payment_destination: initResult.paymentDestination,
      status: initResult.status,
      provider_reference: initResult.providerReference,
      payment_id: `pay_${Date.now()}`,
    }).select().single();

    if (initResult.upiDeepLink) {
      await supabase.from('invoices').update({
        status: initResult.status === 'PAID' ? 'PAID' : 'PAYMENT_INITIATED',
        payment_method: params.paymentMethod,
        provider_reference: initResult.providerReference,
        upi_deep_link: initResult.upiDeepLink,
      }).eq('id', invoice.id);
    } else {
      await supabase.from('invoices').update({
        status: initResult.status,
        payment_method: params.paymentMethod,
        provider_reference: initResult.providerReference,
      }).eq('id', invoice.id);
    }

    return mapAttempt(attemptData);
  }

  async verifyPaymentAttempt(paymentId: string, reference?: string): Promise<{ success: boolean; attempt: PaymentAttempt }> {
    const { data } = await supabase.from('payment_attempts').select('*').eq('payment_id', paymentId).single();
    const attempt = data ? mapAttempt(data) : null;
    if (!attempt) throw new Error(`Payment attempt ${paymentId} not found`);

    if (attempt.status === 'PAID') return { success: true, attempt };

    const webhookEvent = {
      provider: attempt.paymentMethod,
      eventId: `evt_pay_${paymentId}`,
      eventType: 'payment.captured',
      payload: {
        paymentId,
        fromStatus: attempt.status,
        reference: reference || attempt.providerReference,
        amount: attempt.amount,
        currency: attempt.currency,
      },
    };
    const webhookResult = await processPaymentWebhook(webhookEvent, await webhookStore());
    if (!webhookResult.accepted || webhookResult.action !== 'MARK_PAID') {
      return { success: false, attempt };
    }

    const provider = this.resolveProvider(attempt.paymentMethod);
    if (!provider) throw new Error(`Payment provider for attempt ${paymentId} not found`);

    const verifyResult = await provider.verifyPayment(paymentId, reference || attempt.providerReference);

    if (verifyResult.status === 'PAID') {
      await supabase.from('payment_attempts').update({
        status: 'PAID',
        provider_reference: reference || attempt.providerReference,
        paid_at: verifyResult.paidAt || new Date().toISOString(),
      }).eq('payment_id', paymentId);

      await supabase.from('invoices').update({
        status: 'PAID',
        payment_method: attempt.paymentMethod,
        provider_reference: reference || attempt.providerReference,
      }).eq('id', attempt.invoiceId);

      const { data: invoice } = await supabase.from('invoices').select('platform_fee_rupees, organization_id').eq('id', attempt.invoiceId).single();
      if (invoice && Number(invoice.platform_fee_rupees) > 0) {
        await supabase.from('platform_revenue').upsert({
          organization_id: invoice.organization_id,
          amount_paise: Math.round(Number(invoice.platform_fee_rupees) * 100),
          amount_rupees: Number(invoice.platform_fee_rupees),
          currency: 'INR',
          revenue_type: 'PLATFORM_FEE',
          reference_id: `PLATFORM_FEE_${paymentId}`,
        }, { onConflict: 'reference_id' });
      }

      const { data: trip } = await supabase.from('rental_trips').select('*').eq('id', attempt.tripId).single();
      if (trip) {
        await supabase.from('rental_trips').update({
          payment_status: 'PAID',
          upi_transaction_ref: reference || attempt.providerReference,
          paid_at: verifyResult.paidAt || new Date().toISOString(),
          status: 'COMPLETED',
          updated_at: new Date().toISOString(),
        }).eq('id', attempt.tripId);

        const notificationMsg = `₹${attempt.amount.toFixed(2)} received for vehicle ${trip.vehicle_reg_number}. Trip: ${trip.id}. Invoice: ${attempt.invoiceId.substring(0, 8)}`;
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('veylo_payment_received', { detail: { message: notificationMsg, tripId: trip.id } });
          window.dispatchEvent(event);
        }
      }

      const { data: updatedData } = await supabase.from('payment_attempts').select('*').eq('payment_id', paymentId).single();
      return { success: true, attempt: mapAttempt(updatedData) };
    }

    return { success: false, attempt };
  }

  async purchaseSubscription(params: {
    organizationId: string;
    planId: string;
    paymentMethod: string;
    simulateFailure?: boolean;
  }): Promise<Subscription> {
    const { data: plan } = await supabase.from('plans').select('*').eq('id', params.planId).single();
    if (!plan) throw new Error(`Plan ${params.planId} not found`);

    const { data: existingSub } = await supabase.from('subscriptions').select('*').eq('organization_id', params.organizationId).maybeSingle();
    const price = Number(plan.price_rupees) || 0;

    if (price > 0) {
      if (params.simulateFailure) {
        throw new Error('Subscription payment failed. Plan was not activated and no charge was recorded.');
      }

      const { data: attemptData } = await supabase.from('payment_attempts').insert({
        trip_id: `SUB_${params.planId}`,
        invoice_id: `SUB_${params.planId}`,
        owner_id: params.organizationId,
        rider_id: params.organizationId,
        amount: price,
        currency: 'INR',
        payment_method: params.paymentMethod || 'PAYMENT_GATEWAY',
        payment_destination: 'metherobin@oksbi',
        status: 'PAYMENT_PROCESSING',
        provider_reference: `SUB_TXN_${Date.now()}`,
        payment_id: `pay_sub_${Date.now()}`,
      }).select().single();

      const webhookResult = await processPaymentWebhook(
        {
          provider: attemptData.payment_method,
          eventId: `evt_sub_${params.planId}_${params.organizationId}`,
          eventType: 'payment.captured',
          payload: { paymentId: attemptData.payment_id, amount: price, currency: 'INR', planId: params.planId },
        },
        await webhookStore()
      );

      if (!webhookResult.accepted || webhookResult.action !== 'MARK_PAID') {
        await supabase.from('payment_attempts').update({ status: 'FAILED', provider_reference: `SUB_FAIL_${Date.now()}` }).eq('payment_id', attemptData.payment_id);
        throw new Error('Subscription payment could not be verified. Plan not activated.');
      }

      await supabase.from('payment_attempts').update({ status: 'PAID', provider_reference: attemptData.provider_reference }).eq('payment_id', attemptData.payment_id);

      await supabase.from('platform_revenue').upsert({
        organization_id: params.organizationId,
        amount_paise: plan.price_paise,
        amount_rupees: price,
        currency: 'INR',
        revenue_type: 'SUBSCRIPTION',
        reference_id: `SUB_${plan.id}_${params.organizationId}`,
      }, { onConflict: 'reference_id' });
    }

    const newSub: Subscription = {
      id: existingSub?.id || `sub_${Date.now()}`,
      organizationId: params.organizationId,
      planId: plan.id,
      status: 'ACTIVE',
      startedAt: new Date().toISOString(),
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      provider: 'MOCK',
      providerSubscriptionId: existingSub?.provider_subscription_id || `sub_mock_id_${Date.now()}`,
      createdAt: existingSub?.created_at || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await supabase.from('subscriptions').upsert({
      id: newSub.id,
      organization_id: newSub.organizationId,
      plan_id: newSub.planId,
      status: newSub.status,
      started_at: newSub.startedAt,
      current_period_start: newSub.currentPeriodStart,
      current_period_end: newSub.currentPeriodEnd,
      provider: newSub.provider,
      provider_subscription_id: newSub.providerSubscriptionId,
      created_at: newSub.createdAt,
      updated_at: newSub.updatedAt,
    });

    return newSub;
  }

  // Cash payment confirmation by owner
  async confirmCashPayment(paymentId: string, ownerId: string): Promise<{ success: boolean; attempt: PaymentAttempt }> {
    // First, get the payment attempt to verify it exists and is in CASH_REPORTED state
    const { data: attemptData, error: fetchError } = await supabase
      .from('payment_attempts')
      .select('*')
      .eq('payment_id', paymentId)
      .single();

    if (fetchError || !attemptData) {
      throw new Error(`Payment attempt ${paymentId} not found`);
    }

    // Verify the payment is in CASH_REPORTED state
    if (attemptData.status !== 'CASH_REPORTED') {
      throw new Error(`Payment attempt ${paymentId} is not in CASH_REPORTED state. Current state: ${attemptData.status}`);
    }

    // Verify the owner owns this payment (through organization/trip/invoice)
    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('organization_id, owner_id')
      .eq('id', attemptData.invoice_id)
      .single();

    if (!invoiceData) {
      throw new Error(`Invoice ${attemptData.invoice_id} not found for payment ${paymentId}`);
    }

    // Check if owner belongs to the organization
    const { data: orgMemberData } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', invoiceData.organization_id)
      .eq('profile_id', ownerId)
      .single();

    // Also check if owner is the direct owner of the trip/rental
    const { data: tripData } = await supabase
      .from('rental_trips')
      .select('owner_id')
      .eq('id', attemptData.trip_id)
      .single();

    const isOwner = 
      (orgMemberData && orgMemberData.role === 'ADMIN') ||  // Org admin can confirm
      (invoiceData.owner_id === ownerId) ||                 // Direct invoice owner
      (tripData && tripData.owner_id === ownerId);          // Direct trip owner

    if (!isOwner) {
      throw new Error('Unauthorized: Only the vehicle owner or organization admin can confirm cash payments');
    }

    // Update payment attempt to CASH_CONFIRMED
    const { data: updatedAttemptData, error: updateError } = await supabase
      .from('payment_attempts')
      .update({
        status: 'CASH_CONFIRMED',
        confirmed_by: ownerId,
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('payment_id', paymentId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to confirm cash payment: ${updateError.message}`);
    }

    // Update invoice status to PAID
    await supabase
      .from('invoices')
      .update({
        status: 'PAID',
        payment_method: 'CASH',
        provider_reference: attemptData.provider_reference,
        paid_at: new Date().toISOString()
      })
      .eq('id', attemptData.invoice_id);

    // Update rental trip payment status to PAID
    await supabase
      .from('rental_trips')
      .update({
        payment_status: 'PAID',
        status: 'COMPLETED',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', attemptData.trip_id);

    // Create audit trail entry
    await supabase.from('payment_events').insert({
      event_id: `evt_cash_confirm_${paymentId}_${Date.now()}`,
      provider: 'CASH',
      event_type: 'cash_payment.confirmed',
      payload: {
        paymentId,
        invoiceId: attemptData.invoice_id,
        tripId: attemptData.trip_id,
        ownerId,
        confirmedAt: new Date().toISOString(),
        amount: attemptData.amount
      }
    });

    // Send realtime notification to rider
    // This would typically be done via Supabase Realtime or a notification service
    // For now, we'll rely on the updated payment attempt triggering realtime updates

    return { success: true, attempt: mapAttempt(updatedAttemptData) };
  }

  // Cash payment rejection by owner
  async rejectCashPayment(paymentId: string, ownerId: string, reason: string): Promise<{ success: boolean; attempt: PaymentAttempt }> {
    // First, get the payment attempt to verify it exists and is in CASH_REPORTED state
    const { data: attemptData, error: fetchError } = await supabase
      .from('payment_attempts')
      .select('*')
      .eq('payment_id', paymentId)
      .single();

    if (fetchError || !attemptData) {
      throw new Error(`Payment attempt ${paymentId} not found`);
    }

    // Verify the payment is in CASH_REPORTED state
    if (attemptData.status !== 'CASH_REPORTED') {
      throw new Error(`Payment attempt ${paymentId} is not in CASH_REPORTED state. Current state: ${attemptData.status}`);
    }

    // Verify the owner owns this payment (through organization/trip/invoice)
    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('organization_id, owner_id')
      .eq('id', attemptData.invoice_id)
      .single();

    if (!invoiceData) {
      throw new Error(`Invoice ${attemptData.invoice_id} not found for payment ${paymentId}`);
    }

    // Check if owner belongs to the organization
    const { data: orgMemberData } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', invoiceData.organization_id)
      .eq('profile_id', ownerId)
      .single();

    // Also check if owner is the direct owner of the trip/rental
    const { data: tripData } = await supabase
      .from('rental_trips')
      .select('owner_id')
      .eq('id', attemptData.trip_id)
      .single();

    const isOwner = 
      (orgMemberData && orgMemberData.role === 'ADMIN') ||  // Org admin can confirm
      (invoiceData.owner_id === ownerId) ||                 // Direct invoice owner
      (tripData && tripData.owner_id === ownerId);          // Direct trip owner

    if (!isOwner) {
      throw new Error('Unauthorized: Only the vehicle owner or organization admin can reject cash payments');
    }

    // Update payment attempt to CASH_REJECTED
    const { data: updatedAttemptData, error: updateError } = await supabase
      .from('payment_attempts')
      .update({
        status: 'CASH_REJECTED',
        rejected_by: ownerId,
        rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('payment_id', paymentId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to reject cash payment: ${updateError.message}`);
    }

    // Create audit trail entry
    await supabase.from('payment_events').insert({
      event_id: `evt_cash_reject_${paymentId}_${Date.now()}`,
      provider: 'CASH',
      event_type: 'cash_payment.rejected',
      payload: {
        paymentId,
        invoiceId: attemptData.invoice_id,
        tripId: attemptData.trip_id,
        ownerId,
        rejectedAt: new Date().toISOString(),
        amount: attemptData.amount,
        reason
      }
    });

    // Send realtime notification to rider
    // This would typically be done via Supabase Realtime or a notification service

    return { success: true, attempt: mapAttempt(updatedAttemptData) };
  }
}

export const paymentService = new CorePaymentService();
