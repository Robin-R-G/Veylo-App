import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeRegistrationNumber } from '@/lib/services/registrationNormalizer';

export const dynamic = 'force-static';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single();
  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'No organization for user' }, { status: 403 });
  }

  const [{ count: vehicleCount }, { data: sub }] = await Promise.all([
    supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('organization_id', profile.organization_id),
    supabase.from('subscriptions').select('plan_id').eq('organization_id', profile.organization_id).maybeSingle(),
  ]);
  const { data: plan } = await supabase
    .from('plans')
    .select('vehicle_limit')
    .eq('id', sub?.plan_id || 'FREE')
    .single();
  const vehicleLimit = Number(plan?.vehicle_limit ?? 2);
  if ((vehicleCount ?? 0) >= vehicleLimit) {
    return NextResponse.json(
      { error: `Vehicle limit reached for current plan (${vehicleLimit}). Please upgrade.` },
      { status: 403 }
    );
  }

  const body = await request.json();
  const {
    registrationNumber, vin, vehicleType, make, model, fuelType,
    mileageKmpl, initialOdometer, ratePerKmRupees, ownerUpiId,
    requiresApproval, state, city, notes,
  } = body;

  if (!registrationNumber?.trim() || !make?.trim() || !model?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const normalizedRegNumber = normalizeRegistrationNumber(registrationNumber);
  const id = `v_${normalizedRegNumber.toLowerCase()}_${Date.now()}`;
  const securePublicId = `pub_${normalizedRegNumber.toLowerCase()}_${Math.random().toString(36).substring(2, 6)}`;

  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .insert({
      id,
      organization_id: profile.organization_id,
      owner_id: profile.organization_id,
      secure_public_id: securePublicId,
      registration_number: registrationNumber,
      normalized_reg_number: normalizedRegNumber,
      vin: vin || null,
      vehicle_type: vehicleType,
      make,
      model,
      fuel_type: fuelType,
      mileage_kmpl: Number(mileageKmpl),
      initial_odometer: Number(initialOdometer),
      current_odometer: Number(initialOdometer),
      last_verified_odometer: Number(initialOdometer),
      estimated_current_odometer: Number(initialOdometer),
      rate_per_km_rupees: Number(ratePerKmRupees || 12),
      owner_upi_id: ownerUpiId || 'vehicleowner@upi',
      requires_approval: requiresApproval || false,
      state,
      city,
      status: 'AVAILABLE',
      notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Initial odometer record
  await supabase.from('odometer_history').insert({
    vehicle_id: id,
    previous_reading: Number(initialOdometer),
    new_reading: Number(initialOdometer),
    reason: 'MANUAL_UPDATE',
    notes: 'Initial registration entry',
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({ vehicle }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single();
  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'No organization for user' }, { status: 403 });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Vehicle id required' }, { status: 400 });
  }

  // Map camelCase to snake_case
  const snakeUpdates: Record<string, unknown> = {};
  if (updates.make !== undefined) snakeUpdates.make = updates.make;
  if (updates.model !== undefined) snakeUpdates.model = updates.model;
  if (updates.vin !== undefined) snakeUpdates.vin = updates.vin;
  if (updates.fuelType !== undefined) snakeUpdates.fuel_type = updates.fuelType;
  if (updates.mileageKmpl !== undefined) snakeUpdates.mileage_kmpl = Number(updates.mileageKmpl);
  if (updates.manufacturingYear !== undefined) snakeUpdates.manufacturing_year = Number(updates.manufacturingYear);
  if (updates.vehicleType !== undefined) snakeUpdates.vehicle_type = updates.vehicleType;
  if (updates.ratePerKmRupees !== undefined) snakeUpdates.rate_per_km_rupees = Number(updates.ratePerKmRupees);
  if (updates.ownerUpiId !== undefined) snakeUpdates.owner_upi_id = updates.ownerUpiId;
  if (updates.state !== undefined) snakeUpdates.state = updates.state;
  if (updates.city !== undefined) snakeUpdates.city = updates.city;
  if (updates.notes !== undefined) snakeUpdates.notes = updates.notes;
  snakeUpdates.updated_at = new Date().toISOString();

  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .update(snakeUpdates)
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ vehicle });
}
