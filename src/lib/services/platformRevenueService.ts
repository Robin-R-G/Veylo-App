import { createClient } from '@/lib/supabase/client';
import {
  aggregateRevenue,
  revenueSeries,
  summarizeOwnerRevenue,
  computeSaaSMetrics,
  RevenueRange,
} from './platformEconomics';
import { Invoice, PaymentAttempt, RiderProfile } from '@/types';

const supabase = createClient();

/**
 * Read-side revenue/analytics facade. Everything the dashboards render is
 * computed here from stored records — never from a client-submitted amount.
 */
class PlatformRevenueService {
  async getPlatformRevenueBreakdown(range: RevenueRange) {
    const { data } = await supabase.from('platform_revenue').select('*');
    return aggregateRevenue(data || [], range);
  }

  async getRevenueSeries(range: RevenueRange) {
    const { data } = await supabase.from('platform_revenue').select('*');
    return revenueSeries(data || [], range);
  }

  async getSaaSMetrics() {
    const [subscriptionsRes, plansRes, revenueRes] = await Promise.all([
      supabase.from('subscriptions').select('*'),
      supabase.from('plans').select('*'),
      supabase.from('platform_revenue').select('*'),
    ]);
    return computeSaaSMetrics({
      subscriptions: subscriptionsRes.data || [],
      plans: plansRes.data || [],
      revenueLogs: revenueRes.data || [],
    });
  }

  async getOwnerRevenueSummary() {
    const { data: invoices } = await supabase.from('invoices').select('*');
    return summarizeOwnerRevenue(invoices || []);
  }

  /** Owner-side payment history: joined attempts → invoice → rider. */
  async getPaymentHistory(): Promise<(PaymentAttempt & {
    rider: RiderProfile | undefined;
    vehicleRegNumber?: string;
    invoice: Invoice | undefined;
  })[]> {
    const [paymentsRes, invoicesRes, tripsRes] = await Promise.all([
      supabase.from('payments').select('*'),
      supabase.from('invoices').select('*'),
      supabase.from('rental_trips').select('*'),
    ]);

    const payments = paymentsRes.data || [];
    const invoices = invoicesRes.data || [];
    const trips = tripsRes.data || [];

    const riderIds = [...new Set(payments.map((p: any) => p.riderId).filter(Boolean))];
    const { data: riders } = riderIds.length > 0
      ? await supabase.from('rider_profiles').select('*').in('id', riderIds)
      : { data: [] };
    const ridersMap = new Map((riders || []).map((r: any) => [r.id, r]));

    return payments.map(attempt => {
      const invoice = invoices.find(i => i.id === attempt.invoiceId);
      const rider = ridersMap.get(attempt.riderId);
      const trip = trips.find(t => t.id === attempt.tripId);
      return {
        ...attempt,
        rider,
        invoice,
        vehicleRegNumber: trip?.vehicleRegNumber || invoice?.vehicleRegNumber,
      };
    });
  }

  /** Platform subscription ledger (who is on what plan, status, period). */
  async getSubscriptionLedger() {
    const [subsRes, plansRes, orgRes] = await Promise.all([
      supabase.from('subscriptions').select('*'),
      supabase.from('plans').select('*'),
      supabase.from('organizations').select('id, name'),
    ]);

    const plans = plansRes.data || [];
    const orgs = new Map((orgRes.data || []).map((o: any) => [o.id, o.name]));

    return (subsRes.data || []).map(sub => ({
      ...sub,
      plan: plans.find(p => p.id === sub.planId),
      organizationName: orgs.get(sub.organizationId) || sub.organizationId,
    }));
  }
}

export const platformRevenueService = new PlatformRevenueService();
