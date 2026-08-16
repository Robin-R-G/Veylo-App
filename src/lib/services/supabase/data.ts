import { supabase } from './client';
import type {
  Vehicle, OdometerRecord, MaintenanceRecord, Issue, RentalTrip,
  PlatformMonetizationSettings, Organization, SaaSPlan, Subscription,
  Invoice, PaymentAttempt, RiderProfile, Dispute,
} from '@/types';

type Row = Record<string, any>;

function mapVehicle(r: Row): Vehicle {
  return {
    id: r.id,
    organizationId: r.organization_id,
    ownerId: r.owner_id,
    securePublicId: r.secure_public_id,
    registrationNumber: r.registration_number,
    normalizedRegNumber: r.normalized_reg_number,
    vehicleType: r.vehicle_type,
    make: r.make,
    model: r.model,
    manufacturingYear: r.manufacturing_year,
    fuelType: r.fuel_type,
    mileageKmpl: Number(r.mileage_kmpl ?? 0),
    initialOdometer: Number(r.initial_odometer ?? 0),
    currentOdometer: Number(r.current_odometer ?? 0),
    lastVerifiedOdometer: Number(r.last_verified_odometer ?? r.current_odometer ?? 0),
    estimatedCurrentOdometer: Number(r.estimated_current_odometer ?? 0),
    ratePerKmRupees: Number(r.rate_per_km_rupees ?? 12),
    ownerUpiId: r.owner_upi_id,
    requiresApproval: r.requires_approval ?? false,
    state: r.state,
    city: r.city,
    status: r.status,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapTrip(r: Row): RentalTrip {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    vehicleRegNumber: r.vehicle_reg_number ?? '',
    vehicleModel: r.vehicle_model ?? '',
    vehicleType: r.vehicle_type,
    ownerId: r.owner_id,
    ownerName: r.owner_name,
    ownerUpiId: r.owner_upi_id,
    riderId: r.rider_id,
    riderName: r.rider_name ?? '',
    riderPhone: r.rider_phone ?? '',
    startTime: r.start_time,
    endTime: r.end_time,
    durationSeconds: Number(r.duration_seconds ?? 0),
    startOdometer: Number(r.start_odometer ?? 0),
    gpsDistanceKm: Number(r.gps_distance_km ?? 0),
    estimatedEndOdometer: Number(r.estimated_end_odometer ?? 0),
    actualEndOdometer: r.actual_end_odometer != null ? Number(r.actual_end_odometer) : undefined,
    ratePerKmRupees: Number(r.rate_per_km_rupees ?? 0),
    distanceChargeRupees: Number(r.distance_charge_rupees ?? 0),
    otherChargesRupees: Number(r.other_charges_rupees ?? 0),
    totalAmountRupees: Number(r.total_amount_rupees ?? 0),
    status: r.status,
    gpsTrackingStatus: r.gps_tracking_status ?? 'STOPPED',
    isSuspicious: r.is_suspicious ?? false,
    suspiciousReason: r.suspicious_reason,
    trackingPoints: [],
    invoiceId: r.invoice_id,
    paymentStatus: r.payment_status ?? 'PENDING',
    upiDeepLink: r.upi_deep_link,
    upiTransactionRef: r.upi_transaction_ref,
    paidAt: r.paid_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapInvoice(r: Row): Invoice {
  return {
    id: r.id,
    organizationId: r.organization_id,
    tripId: r.trip_id,
    vehicleId: r.vehicle_id,
    vehicleRegNumber: r.vehicle_reg_number ?? '',
    vehicleMakeModel: r.vehicle_make_model,
    invoiceNumber: r.invoice_number,
    title: r.title ?? 'USAGE BILL',
    customerName: r.customer_name ?? '',
    customerPhone: r.customer_phone,
    startOdometer: Number(r.start_odometer ?? 0),
    endOdometer: Number(r.end_odometer ?? 0),
    distanceKm: Number(r.distance_km ?? 0),
    mileageKmpl: r.mileage_kmpl != null ? Number(r.mileage_kmpl) : undefined,
    ratePerKmRupees: r.rate_per_km_rupees != null ? Number(r.rate_per_km_rupees) : undefined,
    subtotalRupees: Number(r.subtotal_rupees ?? r.total_rupees ?? 0),
    taxRupees: Number(r.tax_rupees ?? 0),
    totalRupees: Number(r.total_rupees ?? 0),
    platformFeeRupees: Number(r.platform_fee_rupees ?? 0),
    payeeUpiId: r.payee_upi_id,
    payeeName: r.payee_name,
    upiDeepLink: r.upi_deep_link,
    paymentStatus: r.status ?? 'PENDING',
    paymentMethod: r.payment_method,
    paymentReference: r.provider_reference,
    tripStartTime: r.trip_start_time,
    tripEndTime: r.trip_end_time,
    issuedAt: r.issued_at,
    paidAt: r.paid_at,
    notes: r.notes,
  };
}

function mapAttempt(r: Row): PaymentAttempt {
  return {
    paymentId: r.payment_id ?? r.id,
    tripId: r.trip_id,
    invoiceId: r.invoice_id,
    ownerId: r.owner_id,
    riderId: r.rider_id,
    amount: Number(r.amount ?? 0),
    currency: r.currency ?? 'INR',
    paymentMethod: r.payment_method ?? 'UPI_DIRECT',
    paymentDestination: r.payment_destination ?? '',
    status: r.status,
    providerReference: r.provider_reference,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    paidAt: r.paid_at,
  };
}

function mapOdometer(r: Row): OdometerRecord {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    previousReading: Number(r.previous_reading ?? 0),
    newReading: Number(r.new_reading ?? 0),
    difference: Number(r.difference ?? 0),
    updatedByProfileId: r.updated_by_profile_id,
    updatedByName: r.updated_by_name,
    reason: r.reason,
    rideId: r.ride_id,
    tripId: r.trip_id,
    notes: r.notes,
    timestamp: r.timestamp,
  };
}

function mapMaintenance(r: Row): MaintenanceRecord {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    serviceType: r.service_type,
    serviceDate: r.service_date,
    odometerReading: Number(r.odometer_reading ?? 0),
    costRupees: Number(r.cost_rupees ?? (r.cost_paise != null ? r.cost_paise / 100 : 0)),
    notes: r.notes,
    nextDueDate: r.next_due_date,
    nextDueOdometer: r.next_due_odometer != null ? Number(r.next_due_odometer) : undefined,
    createdAt: r.created_at,
  };
}

function mapIssue(r: Row): Issue {
  return {
    id: r.id,
    vehicleId: r.vehicle_id,
    rideId: r.ride_id,
    reportedByProfileId: r.reported_by_profile_id,
    reporterName: r.reporter_name,
    issueType: r.issue_type,
    severity: r.severity,
    description: r.description,
    status: r.status,
    photoUrls: r.photo_urls,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at,
  };
}

function mapDispute(r: Row): Dispute {
  return {
    id: r.id,
    tripId: r.trip_id,
    invoiceId: r.invoice_id,
    raisedBy: r.raised_by,
    raisedByName: r.raised_by_name ?? '',
    reason: r.reason,
    claimedDistanceKm: r.claimed_distance_km != null ? Number(r.claimed_distance_km) : undefined,
    evidence: r.evidence,
    status: r.status,
    resolution: r.resolution,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapSubscription(r: Row): Subscription {
  return {
    id: r.id,
    organizationId: r.organization_id,
    planId: r.plan_id,
    status: r.status,
    startedAt: r.started_at,
    currentPeriodStart: r.current_period_start,
    currentPeriodEnd: r.current_period_end,
    cancelledAt: r.cancelled_at,
    provider: r.provider ?? 'MOCK',
    providerSubscriptionId: r.provider_subscription_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapPlan(r: Row): SaaSPlan {
  return {
    id: r.id,
    name: r.name,
    pricePaise: Number(r.price_paise ?? 0),
    priceRupees: Number(r.price_rupees ?? 0),
    billingInterval: r.billing_interval ?? 'MONTHLY',
    vehicleLimit: Number(r.vehicle_limit ?? 0),
    staffLimit: Number(r.staff_limit ?? 0),
    gpsEnabled: r.gps_enabled ?? false,
    advancedReports: r.advanced_reports ?? false,
    customBranding: r.custom_branding ?? false,
    adsEnabled: r.ads_enabled ?? true,
    prioritySupport: r.priority_support ?? false,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapOrganization(r: Row): Organization {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    planTier: r.plan_tier,
    businessName: r.business_name,
    logoUrl: r.logo_url,
    phone: r.phone,
    email: r.email,
    defaultState: r.default_state,
    defaultCity: r.default_city,
    upiId: r.upi_id,
    upiPayeeName: r.upi_payee_name,
    upiEnabled: r.upi_enabled,
    upiStatus: r.upi_status,
    upiVerifiedAt: r.upi_verified_at,
    upiUpdatedAt: r.upi_updated_at,
    taxEnabled: r.tax_enabled ?? false,
    gstin: r.gstin,
    cgstRate: Number(r.cgst_rate ?? 0),
    sgstRate: Number(r.sgst_rate ?? 0),
    igstRate: Number(r.igst_rate ?? 0),
    invoicePrefix: r.invoice_prefix ?? 'VBS',
    createdAt: r.created_at,
  };
}

export async function getVehicles(organizationId: string): Promise<Vehicle[]> {
  const { data } = await supabase
    .from('vehicles')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapVehicle);
}

export async function getAvailableVehicles(): Promise<Vehicle[]> {
  const { data } = await supabase
    .from('vehicles')
    .select('*')
    .eq('status', 'AVAILABLE')
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapVehicle);
}

export async function getVehicleById(idOrPublicId: string): Promise<Vehicle | null> {
  const { data } = await supabase
    .from('vehicles')
    .select('*')
    .or(`id.eq.${idOrPublicId},secure_public_id.eq.${idOrPublicId}`)
    .maybeSingle();
  return data ? mapVehicle(data) : null;
}

export async function findVehicleByRegNumber(reg: string): Promise<Vehicle | null> {
  const normalized = reg.toUpperCase().replace(/\s+/g, '');
  const { data } = await supabase
    .from('vehicles')
    .select('*')
    .eq('normalized_reg_number', normalized)
    .maybeSingle();
  return data ? mapVehicle(data) : null;
}

export async function updateVehicleOdometer(
  vehicleId: string,
  newReading: number,
  reason: string = 'GPS_RIDE_COMPLETED',
  tripId?: string,
  notes?: string
): Promise<void> {
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('current_odometer')
    .eq('id', vehicleId)
    .single();
  if (!vehicle) return;

  const prev = vehicle.current_odometer;
  const isVerified = reason === 'OWNER_VERIFIED' || reason === 'MANUAL_UPDATE';

  await supabase
    .from('vehicles')
    .update({
      current_odometer: newReading,
      estimated_current_odometer: newReading,
      ...(isVerified ? { last_verified_odometer: newReading } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', vehicleId);

  await supabase.from('odometer_history').insert({
    vehicle_id: vehicleId,
    previous_reading: prev,
    new_reading: newReading,
    reason,
    trip_id: tripId,
    notes: notes || (reason === 'GPS_RIDE_COMPLETED' ? 'Automatic GPS tracking update' : 'Odometer verified by owner'),
    timestamp: new Date().toISOString(),
  });
}

export async function getOdometerHistory(vehicleId: string): Promise<OdometerRecord[]> {
  const { data } = await supabase
    .from('odometer_history')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('timestamp', { ascending: false });
  return (data ?? []).map(mapOdometer);
}

export async function getRentalTripsByVehicle(vehicleId: string): Promise<RentalTrip[]> {
  const { data } = await supabase
    .from('rental_trips')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('start_time', { ascending: false });
  return (data ?? []).map(mapTrip);
}

export async function getMaintenanceByVehicle(vehicleId: string): Promise<MaintenanceRecord[]> {
  const { data } = await supabase
    .from('maintenance_records')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('service_date', { ascending: false });
  return (data ?? []).map(mapMaintenance);
}

export async function getMaintenanceRecords(vehicleIds: string[]): Promise<MaintenanceRecord[]> {
  if (vehicleIds.length === 0) return [];
  const { data } = await supabase
    .from('maintenance_records')
    .select('*')
    .in('vehicle_id', vehicleIds)
    .order('service_date', { ascending: false });
  return (data ?? []).map(mapMaintenance);
}

export async function getIssues(vehicleIds: string[]): Promise<Issue[]> {
  if (vehicleIds.length === 0) return [];
  const { data } = await supabase
    .from('issues')
    .select('*')
    .in('vehicle_id', vehicleIds)
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapIssue);
}

export async function getTripsByRider(riderId: string): Promise<RentalTrip[]> {
  const { data } = await supabase
    .from('rental_trips')
    .select('*')
    .eq('rider_id', riderId)
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapTrip);
}

export async function getActiveRentalTrips(): Promise<RentalTrip[]> {
  const { data } = await supabase
    .from('rental_trips')
    .select('*')
    .in('status', ['ACTIVE', 'CONFIRMATION_PENDING'])
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapTrip);
}

export async function getRentalTripById(tripId: string): Promise<RentalTrip | null> {
  const { data } = await supabase
    .from('rental_trips')
    .select('*')
    .eq('id', tripId)
    .maybeSingle();
  return data ? mapTrip(data) : null;
}

export async function getMonetizationSettings(): Promise<PlatformMonetizationSettings> {
  const { data } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'monetization')
    .single();
  return (data?.value as PlatformMonetizationSettings) || {
    platformFeeEnabled: false,
    platformFeeType: 'NONE',
    platformFeeValue: 0,
    advertisingEnabled: true,
    trialDays: 14,
  };
}

export async function getOrganization(orgId: string): Promise<Organization | null> {
  const { data } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();
  return data ? mapOrganization(data) : null;
}

export async function getPlans(): Promise<SaaSPlan[]> {
  const { data } = await supabase
    .from('plans')
    .select('*')
    .order('price_paise', { ascending: true });
  return (data ?? []).map(mapPlan);
}

export async function getSubscriptionForOrg(orgId: string): Promise<Subscription | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle();
  return data ? mapSubscription(data) : null;
}

export async function getRentalTrips(orgId: string): Promise<RentalTrip[]> {
  const { data } = await supabase
    .from('rental_trips')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapTrip);
}

export async function getInvoices(orgId: string): Promise<Invoice[]> {
  const { data } = await supabase
    .from('invoices')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapInvoice);
}

export async function getPayments(orgId: string): Promise<PaymentAttempt[]> {
  const { data } = await supabase
    .from('payment_attempts')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapAttempt);
}

export async function getDisputes(orgId: string): Promise<Dispute[]> {
  const { data } = await supabase
    .from('disputes')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapDispute);
}

export async function getInvoiceById(invoiceId: string): Promise<Invoice | null> {
  const { data } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .maybeSingle();
  return data ? mapInvoice(data) : null;
}

export async function getDisputeByTripId(tripId: string): Promise<Dispute | null> {
  const { data } = await supabase
    .from('disputes')
    .select('*')
    .eq('trip_id', tripId)
    .maybeSingle();
  return data ? mapDispute(data) : null;
}

export async function createDispute(dispute: Partial<Dispute>): Promise<Dispute> {
  const record = {
    trip_id: dispute.tripId,
    invoice_id: dispute.invoiceId,
    raised_by: dispute.raisedBy,
    raised_by_name: dispute.raisedByName,
    reason: dispute.reason,
    claimed_distance_km: dispute.claimedDistanceKm,
    evidence: dispute.evidence,
    status: dispute.status || 'OPEN',
  };
  const { data, error } = await supabase
    .from('disputes')
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return mapDispute(data);
}

export async function updatePaymentStatus(
  invoiceId: string,
  status: string,
  reference?: string
): Promise<void> {
  await supabase
    .from('payment_attempts')
    .update({ status, provider_reference: reference, updated_at: new Date().toISOString() })
    .eq('invoice_id', invoiceId);
  await supabase
    .from('invoices')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', invoiceId);
}

export async function getPaymentsByInvoiceId(invoiceId: string): Promise<PaymentAttempt[]> {
  const { data } = await supabase
    .from('payment_attempts')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapAttempt);
}

export async function getInvoicesByOwner(ownerId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('owner_id', ownerId)
    .order('issued_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapInvoice);
}

export async function getPaymentsByOwner(ownerId: string) {
  const { data: attempts, error: aErr } = await supabase
    .from('payment_attempts')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (aErr) throw aErr;
  if (!attempts || attempts.length === 0) return [];

  const invoiceIds = [...new Set(attempts.map((a: any) => a.invoice_id).filter(Boolean))];
  const riderIds = [...new Set(attempts.map((a: any) => a.rider_id).filter(Boolean))];
  const tripIds = [...new Set(attempts.map((a: any) => a.trip_id).filter(Boolean))];

  const [invoicesRes, ridersRes, tripsRes] = await Promise.all([
    invoiceIds.length > 0
      ? supabase.from('invoices').select('*').in('id', invoiceIds)
      : { data: [], error: null },
    riderIds.length > 0
      ? supabase.from('rider_profiles').select('*').in('id', riderIds)
      : { data: [], error: null },
    tripIds.length > 0
      ? supabase.from('rental_trips').select('*').in('id', tripIds)
      : { data: [], error: null },
  ]);

  if (invoicesRes.error) throw invoicesRes.error;
  if (ridersRes.error) throw ridersRes.error;
  if (tripsRes.error) throw tripsRes.error;

  const invoiceMap = new Map((invoicesRes.data ?? []).map((i: any) => [i.id, i]));
  const riderMap = new Map((ridersRes.data ?? []).map((r: any) => [r.id, r]));
  const tripMap = new Map((tripsRes.data ?? []).map((t: any) => [t.id, t]));

  return attempts.map((a: any) => ({
    ...mapAttempt(a),
    rider: riderMap.get(a.rider_id) as RiderProfile | undefined,
    vehicleRegNumber: tripMap.get(a.trip_id)?.vehicle_reg_number ?? invoiceMap.get(a.invoice_id)?.vehicle_reg_number,
    invoice: invoiceMap.get(a.invoice_id) ? mapInvoice(invoiceMap.get(a.invoice_id)) : undefined,
  }));
}
