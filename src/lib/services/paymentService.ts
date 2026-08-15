import { PaymentStatus, PaymentAttempt, Invoice } from '@/types';
import { mockStorage } from './mockStorage';
import { generateUpiDeepLink } from './financialEngine';

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
    // Generate secure intent deep-link
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
    // Direct UPI payment direct verification mock (manual or simple verification confirmation)
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
      status: 'PAID' as const,
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

  async initiatePaymentAttempt(params: {
    invoiceId: string;
    paymentMethod: string; // 'UPI_DIRECT', 'CASH', etc.
  }): Promise<PaymentAttempt> {
    const invoice = mockStorage.getState().invoices.find(i => i.id === params.invoiceId);
    if (!invoice) throw new Error(`Invoice ${params.invoiceId} not found`);

    const trip = mockStorage.getState().rentalTrips.find(t => t.id === invoice.tripId);
    if (!trip) throw new Error(`Rental trip associated with invoice not found`);

    // Prevent duplicate active payments: check if there's already a PAID or PAYMENT_PROCESSING attempt
    const existing = mockStorage.getPaymentAttemptsByInvoiceId(invoice.id);
    const completed = existing.find(p => p.status === 'PAID');
    if (completed) {
      return completed;
    }

    const processing = existing.find(p => p.status === 'PAYMENT_PROCESSING' || p.status === 'PAYMENT_INITIATED');
    if (processing && params.paymentMethod === processing.paymentMethod) {
      return processing;
    }

    // Determine destination from owner settings (associated with the vehicle's owner/org)
    // Rider cannot change this destination
    const org = mockStorage.getState().organization;
    const dest = invoice.payeeUpiId || org.upiId || 'vehicleowner@upi';

    const providerName = params.paymentMethod === 'CASH' ? 'CASH' : this.defaultProviderName;
    const provider = this.providers.get(providerName);
    if (!provider) throw new Error(`Payment provider ${providerName} not found`);

    // Execute provider logic
    const initResult = await provider.initiatePayment({
      invoice,
      tripId: trip.id,
      ownerId: trip.ownerId || org.id,
      riderId: trip.riderId,
      amount: invoice.totalRupees,
      paymentMethod: params.paymentMethod,
      destination: dest
    });

    // Write payment record to mockStorage
    const attempt = mockStorage.addPaymentAttempt({
      tripId: trip.id,
      invoiceId: invoice.id,
      ownerId: trip.ownerId || org.id,
      riderId: trip.riderId,
      amount: invoice.totalRupees,
      currency: 'INR',
      paymentMethod: params.paymentMethod,
      paymentDestination: initResult.paymentDestination,
      status: initResult.status,
      providerReference: initResult.providerReference
    });

    // Sync upi deep link onto invoice if generated
    if (initResult.upiDeepLink) {
      mockStorage.updateInvoicePaymentStatus(invoice.id, initResult.status === 'PAID' ? 'PAID' : 'PAYMENT_INITIATED', params.paymentMethod, initResult.providerReference);
      const store = mockStorage.getState();
      const inv = store.invoices.find(i => i.id === invoice.id);
      if (inv) {
        inv.upiDeepLink = initResult.upiDeepLink;
        mockStorage.updateInvoice(inv);
      }
    } else {
      mockStorage.updateInvoicePaymentStatus(invoice.id, initResult.status, params.paymentMethod, initResult.providerReference);
    }

    return attempt;
  }

  async verifyPaymentAttempt(paymentId: string, reference?: string): Promise<{ success: boolean; attempt: PaymentAttempt }> {
    const attempts = mockStorage.getPaymentAttempts();
    const attempt = attempts.find(a => a.paymentId === paymentId);
    if (!attempt) throw new Error(`Payment attempt ${paymentId} not found`);

    if (attempt.status === 'PAID') {
      return { success: true, attempt };
    }

    const provider = this.providers.get(attempt.paymentMethod === 'CASH' ? 'CASH' : this.defaultProviderName);
    if (!provider) throw new Error(`Payment provider for attempt ${paymentId} not found`);

    const verifyResult = await provider.verifyPayment(paymentId, reference || attempt.providerReference);

    if (verifyResult.status === 'PAID') {
      // 1. Update attempt status
      mockStorage.updatePaymentAttempt(paymentId, 'PAID', reference || attempt.providerReference);
      
      // 2. Update invoice status
      mockStorage.updateInvoicePaymentStatus(attempt.invoiceId, 'PAID', attempt.paymentMethod, reference || attempt.providerReference);

      // 3. Mark trip as PAID/COMPLETED
      const trip = mockStorage.getState().rentalTrips.find(t => t.id === attempt.tripId);
      if (trip) {
        mockStorage.updateRentalTrip({
          ...trip,
          paymentStatus: 'PAID',
          upiTransactionRef: reference || attempt.providerReference,
          paidAt: verifyResult.paidAt || new Date().toISOString(),
          status: 'COMPLETED',
          updatedAt: new Date().toISOString()
        });

        // 4. Send Owner Notification Event
        const notificationMsg = `₹${attempt.amount.toFixed(2)} received for vehicle ${trip.vehicleRegNumber}. Trip: ${trip.id}. Invoice: ${attempt.invoiceId.substring(0, 8)}`;
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('veylo_payment_received', { detail: { message: notificationMsg, tripId: trip.id } });
          window.dispatchEvent(event);
        }
      }

      const updatedAttempts = mockStorage.getPaymentAttempts();
      const updatedAttempt = updatedAttempts.find(a => a.paymentId === paymentId)!;
      return { success: true, attempt: updatedAttempt };
    }

    return { success: false, attempt };
  }
}

export const paymentService = new CorePaymentService();
