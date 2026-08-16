import { createClient } from '@/lib/supabase/client';
import { getPlans, getSubscriptionForOrg } from '@/lib/services/supabase/data';
import { SaaSPlan, Subscription } from '@/types';

export type GateableFeature =
  | 'BASIC_BILLING'
  | 'GPS_TRACKING'
  | 'ADVANCED_GPS'
  | 'ADVANCED_REPORTS'
  | 'MULTI_STAFF'
  | 'CUSTOM_INVOICE'
  | 'CUSTOM_BRANDING'
  | 'MULTI_LOCATION'
  | 'ANALYTICS'
  | 'WHITE_LABEL';

class CoreSubscriptionService {
  private supabase = createClient();

  async ensureFreeSubscription(organizationId: string): Promise<Subscription> {
    const { data: existing } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (existing) return existing;

    const sub: Subscription = {
      id: `sub_${Date.now()}`,
      organizationId,
      planId: 'FREE',
      status: 'ACTIVE',
      startedAt: new Date().toISOString(),
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      provider: 'MOCK',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.supabase.from('subscriptions').upsert(sub);
    return sub;
  }

  async startTrial(organizationId: string, planId: string): Promise<Subscription> {
    const { data: plans } = await this.supabase.from('plans').select('*');
    const plan = plans?.find(p => p.id === planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);
    if (plan.priceRupees <= 0) throw new Error('Trials apply to paid plans only');

    const { data: settings } = await this.supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'monetization')
      .single();
    const trialDays = settings?.value?.trialDays || 14;

    const { data: existing } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    const sub: Subscription = {
      id: existing?.id || `sub_${Date.now()}`,
      organizationId,
      planId,
      status: 'TRIAL',
      startedAt: new Date().toISOString(),
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString(),
      provider: 'MOCK',
      providerSubscriptionId: existing?.providerSubscriptionId,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.supabase.from('subscriptions').upsert(sub);
    return sub;
  }

  async getActivePlan(organizationId: string): Promise<SaaSPlan> {
    const plans = await getPlans();
    const defaultPlan = plans.find(p => p.id === 'FREE')!;

    const sub = await getSubscriptionForOrg(organizationId);

    if (!sub || (sub.status !== 'ACTIVE' && sub.status !== 'TRIAL')) {
      return defaultPlan;
    }

    return plans.find(p => p.id === sub.planId) || defaultPlan;
  }

  async canUseFeature(organizationId: string, feature: GateableFeature): Promise<boolean> {
    const plan = await this.getActivePlan(organizationId);

    switch (feature) {
      case 'BASIC_BILLING':
        return true;
      case 'GPS_TRACKING':
        return plan.gpsEnabled || plan.id === 'STARTER' || plan.id === 'PRO' || plan.id === 'BUSINESS';
      case 'ADVANCED_GPS':
        return plan.id === 'PRO' || plan.id === 'BUSINESS';
      case 'ADVANCED_REPORTS':
        return plan.advancedReports || plan.id === 'PRO' || plan.id === 'BUSINESS';
      case 'MULTI_STAFF':
        return plan.staffLimit > 0 || plan.id === 'PRO' || plan.id === 'BUSINESS';
      case 'CUSTOM_INVOICE':
        return plan.id === 'PRO' || plan.id === 'BUSINESS';
      case 'CUSTOM_BRANDING':
        return plan.customBranding || plan.id === 'PRO' || plan.id === 'BUSINESS';
      case 'MULTI_LOCATION':
        return plan.id === 'BUSINESS';
      case 'ANALYTICS':
        return plan.id === 'STARTER' || plan.id === 'PRO' || plan.id === 'BUSINESS';
      case 'WHITE_LABEL':
        return plan.id === 'BUSINESS';
      default:
        return false;
    }
  }

  async hasReachedVehicleLimit(organizationId: string): Promise<boolean> {
    const plan = await this.getActivePlan(organizationId);

    const { data: vehicles } = await this.supabase
      .from('vehicles')
      .select('id')
      .eq('organization_id', organizationId);

    return (vehicles?.length || 0) >= plan.vehicleLimit;
  }
}

export const subscriptionService = new CoreSubscriptionService();
