import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateRideCosts } from '@/lib/services/financialEngine';
import { computePlatformFee } from '@/lib/services/platformEconomics';

export const dynamic = 'force-dynamic';

// ponytail: simple in-memory rate limiter — resets on cold start, fine for prototype.
// Upgrade to Redis-backed limiter if throughput matters.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again in 1 minute.' }, { status: 429 });
  }

  const supabase = await createClient();
  const { tripId } = await request.json();
  if (!tripId || typeof tripId !== 'string') {
    return NextResponse.json({ error: 'tripId required' }, { status: 400 });
  }

  if (!UUID_RE.test(tripId)) {
    return NextResponse.json({ error: 'Invalid tripId format' }, { status: 400 });
  }

  const { data: trip, error: tripErr } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();
  if (tripErr || !trip) {
    return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
  }

  const { data: vehicle, error: vehicleErr } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', trip.vehicle_id)
    .single();
  if (vehicleErr || !vehicle) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
  }

  const calc = calculateRideCosts({
    startOdometer: Number(trip.start_odometer),
    endOdometer: Number(trip.end_odometer),
    mileageKmpl: Number(vehicle.mileage_kmpl),
    fuelPricePaise: Math.round(Number(trip.fuel_price_rupees || 0) * 100),
    pricingMode: trip.pricing_mode,
    perKmRateRupees: Number(trip.per_km_rate_rupees || 0),
  });

  const { data: settingsRow } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'monetization')
    .single();
  const settings = (settingsRow?.value as any) || {};
  const platformFee = computePlatformFee(calc.totalAmountRupees, {
    platformFeeEnabled: !!settings.platform_fee_enabled,
    platformFeeType: settings.platform_fee_type || 'NONE',
    platformFeeValue: Number(settings.platform_fee_value || 0),
  });

  const invoiceNumber = `VBS-${Date.now()}`;
  const { data: invoice, error: invoiceErr } = await supabase
    .from('invoices')
    .insert({
      organization_id: vehicle.organization_id,
      owner_id: vehicle.owner_id,
      trip_id: null,
      vehicle_id: vehicle.id,
      vehicle_reg_number: vehicle.registration_number,
      invoice_number: invoiceNumber,
      customer_name: trip.customer_name,
      customer_phone: trip.customer_phone,
      start_odometer: Number(trip.start_odometer),
      end_odometer: Number(trip.end_odometer),
      distance_km: calc.distanceKm,
      mileage_kmpl: Number(vehicle.mileage_kmpl),
      rate_per_km_rupees: calc.pricePerKmRupees,
      subtotal_rupees: calc.totalAmountRupees,
      platform_fee_rupees: platformFee,
      total_rupees: Math.round((calc.totalAmountRupees + platformFee) * 100) / 100,
      payee_upi_id: vehicle.owner_upi_id,
      status: 'PENDING',
      issued_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (invoiceErr) {
    return NextResponse.json({ error: invoiceErr.message }, { status: 500 });
  }

  return NextResponse.json({ invoiceId: invoice.id });
}
