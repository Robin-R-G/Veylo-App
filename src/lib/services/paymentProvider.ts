import { PaymentStatus } from '@/types';

export interface PaymentProcessResult {
  success: boolean;
  status: PaymentStatus;
  transactionId: string;
  message: string;
}

export interface IPaymentProvider {
  processMockPayment(invoiceId: string, amountRupees: number, method?: string): Promise<PaymentProcessResult>;
  markAsPaid(invoiceId: string): Promise<PaymentProcessResult>;
}

export class MockPaymentProvider implements IPaymentProvider {
  async processMockPayment(invoiceId: string, amountRupees: number, method = 'MOCK_UPI'): Promise<PaymentProcessResult> {
    // Simulate payment transaction in development mock mode
    const txnId = `TXN_MOCK_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    return {
      success: true,
      status: 'PAID',
      transactionId: txnId,
      message: `Mock payment of ₹${amountRupees.toFixed(2)} completed successfully via ${method}.`,
    };
  }

  async markAsPaid(invoiceId: string): Promise<PaymentProcessResult> {
    const txnId = `TXN_MANUAL_${Date.now()}`;
    return {
      success: true,
      status: 'PAID',
      transactionId: txnId,
      message: 'Usage bill marked as paid by vehicle owner.',
    };
  }
}

export const paymentService = new MockPaymentProvider();
