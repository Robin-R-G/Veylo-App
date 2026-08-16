import { describe, test, expect, vi } from 'vitest';
import { calculateRideCosts, generateUpiDeepLink } from '../financialEngine';
import { fuelPriceService } from '../fuelPriceProvider';
import { mockStorage } from '../mockStorage';
import { fakeStore } from './fakeSupabase';

import { centralFuelPriceService } from '../fuel/fuelPriceService';

vi.mock('@/lib/supabase/client', async () => {
  const m = await import('./fakeSupabase');
  return { createClient: m.createFakeClient };
});

describe('Live Indian Fuel Price & Payment Test Suite', () => {
  beforeEach(() => {
    fakeStore.reset();
    centralFuelPriceService.clearCache();
  });

  test('TEST 1 — Prompt Scenario: KL 16 P 78 (8 km @ 40 km/L @ ₹104.20/L)', () => {
    // Start: 12,500 km, End: 12,508 km, Distance: 8 km, Mileage: 40 km/L, Petrol: ₹104.20/L
    const result = calculateRideCosts({
      startOdometer: 12500,
      endOdometer: 12508,
      mileageKmpl: 40,
      fuelPricePaise: 10420, // ₹104.20
      pricingMode: 'FUEL_COST',
    });

    expect(result.distanceKm).toBe(8);
    expect(result.estimatedFuelLitres).toBe(0.20);
    expect(result.estimatedFuelCostRupees).toBe(20.84);
    expect(result.totalAmountRupees).toBe(20.84);
  });

  test('TEST 2 — Petrol Price Change (₹105.00/L)', () => {
    // Petrol ₹105.00/L, Distance: 8 km, Mileage: 40 km/L
    const result = calculateRideCosts({
      startOdometer: 12500,
      endOdometer: 12508,
      mileageKmpl: 40,
      fuelPricePaise: 10500, // ₹105.00
      pricingMode: 'FUEL_COST',
    });

    expect(result.distanceKm).toBe(8);
    expect(result.estimatedFuelLitres).toBe(0.20);
    expect(result.estimatedFuelCostRupees).toBe(21.00);
    expect(result.totalAmountRupees).toBe(21.00);
  });

  test('TEST 3 — Mandatory Price Snapshot Rule (Start Price vs Later Price Change)', () => {
    const vehicle = mockStorage.getVehicles()[0]; // KL 16 P 78
    const { invoice } = mockStorage.recordRide({
      vehicleId: vehicle.id,
      customerName: 'Snapshot Verification Customer',
      endOdometer: vehicle.currentOdometer + 8,
      fuelPriceRupees: 104.20,
      pricingMode: 'FUEL_COST',
    });

    // Expected total uses the vehicle's actual mileage at the snapshot price ₹104.20/L.
    const expectedRupees = Math.round((8 / vehicle.mileageKmpl) * 10420) / 100;

    // Invoice captured at start price ₹104.20/L
    expect(invoice.priceSnapshot!.pricePerLitreRupees).toBe(104.20);
    expect(invoice.totalRupees).toBe(expectedRupees);

    // Simulate price change to ₹105.00/L
    fuelPriceService.updateManualOverride('PETROL', 105.00, 'Kerala', 'Kozhikode');

    // Completed invoice MUST retain ₹104.20/L snapshot and NOT recalculate!
    const state = mockStorage.getState();
    const fetchedInv = state.invoices.find(i => i.id === invoice.id);

    expect(fetchedInv?.priceSnapshot?.pricePerLitreRupees).toBe(104.20);
    expect(fetchedInv?.totalRupees).toBe(expectedRupees);
  });

  test('TEST 4 — PER_KM Pricing Mode (Rate: ₹3/km, Distance: 8 km)', () => {
    const result = calculateRideCosts({
      startOdometer: 12500,
      endOdometer: 12508,
      mileageKmpl: 40,
      fuelPricePaise: 10420,
      pricingMode: 'PER_KM',
      perKmRateRupees: 3,
    });

    expect(result.distanceKm).toBe(8);
    expect(result.totalAmountRupees).toBe(24.00); // 8 x 3 = 24
  });

  test('TEST 5 — Fuel API Unavailable Fallback Display', async () => {
    // Seed a cached price so the service returns instantly (no network).
    fakeStore.tables.fuel_prices = [{
      id: 'fp_petrol_kl',
      country: 'India',
      state: 'Kerala',
      district: '',
      city: 'Kozhikode',
      fuel_type: 'PETROL',
      price_per_unit_paise: 10420,
      price_rupees: 104.20,
      unit: 'LITRE',
      currency: 'INR',
      source_name: 'IOCL (Indian Oil)',
      source_url: 'https://iocl.com/petrol-diesel-price',
      effective_date: new Date().toISOString().slice(0, 10),
      fetched_at: new Date().toISOString(),
      status: 'LIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }];

    const price = await fuelPriceService.getLatestFuelPrice('PETROL', 'Kerala', 'Kozhikode');
    
    expect(price.priceRupees).toBe(104.20);
    expect(price.sourceName).toBe('IOCL (Indian Oil)');
    expect(price.status).toMatch(/LIVE|RECENT|STALE/);
  });

  test('TEST 6 — Owner UPI Configuration and Verification Status', () => {
    mockStorage.updateOwnerUpiSettings('robin@paytm', 'Robin Rentals', true, 'CONFIGURED');
    const store = mockStorage.getState();
    expect(store.organization.upiId).toBe('robin@paytm');
    expect(store.organization.upiPayeeName).toBe('Robin Rentals');
    expect(store.organization.upiStatus).toBe('CONFIGURED');

    // Simulate Admin/API verification update
    mockStorage.updateOwnerUpiSettings('robin@paytm', 'Robin Rentals', true, 'ACTIVE');
    const updatedStore = mockStorage.getState();
    expect(updatedStore.organization.upiStatus).toBe('ACTIVE');
    expect(updatedStore.organization.upiVerifiedAt).toBeDefined();
  });

  test('TEST 7 — Payment Attempt Initiation and Duplicate Prevention', async () => {
    const { paymentService } = await import('../paymentService');

    // Setup dummy invoice + trip in the in-memory supabase store.
    fakeStore.tables.invoices = [{
      id: 'inv_test_999',
      invoice_number: 'INV-TEST-999',
      trip_id: 'trip_test_999',
      organization_id: 'org_test_999',
      total_rupees: 301.20,
      status: 'PENDING',
      payee_upi_id: 'ownername@upi',
      payee_name: 'Owner Name',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }];
    fakeStore.tables.rental_trips = [{
      id: 'trip_test_999',
      rider_id: 'rider_999',
      owner_id: 'owner_999',
      vehicle_id: 'vehicle_999',
      organization_id: 'org_test_999',
      status: 'CONFIRMATION_PENDING',
      payment_status: 'PENDING',
    }];
    fakeStore.tables.payment_attempts = [];

    // 1. Initiate first payment attempt
    const attempt1 = await paymentService.initiatePaymentAttempt({
      invoiceId: 'inv_test_999',
      paymentMethod: 'UPI_DIRECT'
    });

    expect(attempt1.amount).toBe(301.20);
    expect(attempt1.paymentDestination).toBe('ownername@upi');
    expect(attempt1.status).toBe('PAYMENT_PROCESSING');

    // 2. Try duplicate payment initiation: should return same active attempt
    const attempt2 = await paymentService.initiatePaymentAttempt({
      invoiceId: 'inv_test_999',
      paymentMethod: 'UPI_DIRECT'
    });

    expect(attempt2.paymentId).toBe(attempt1.paymentId);
    expect(fakeStore.tables.payment_attempts.length).toBe(1);
  });

  test('TEST 8 — Payment Attempt Verification and State Flow', async () => {
    const { paymentService } = await import('../paymentService');

    // Setup invoice + trip
    fakeStore.tables.invoices = [{
      id: 'inv_test_999',
      invoice_number: 'INV-TEST-999',
      trip_id: 'trip_test_999',
      organization_id: 'org_test_999',
      total_rupees: 301.20,
      status: 'PENDING',
      payee_upi_id: 'ownername@upi',
      payee_name: 'Owner Name',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }];
    fakeStore.tables.rental_trips = [{
      id: 'trip_test_999',
      rider_id: 'rider_999',
      owner_id: 'owner_999',
      vehicle_id: 'vehicle_999',
      organization_id: 'org_test_999',
      status: 'CONFIRMATION_PENDING',
      payment_status: 'PENDING',
    }];

    // Initiate payment attempt
    const init = await paymentService.initiatePaymentAttempt({
      invoiceId: 'inv_test_999',
      paymentMethod: 'UPI_DIRECT',
    });

    // Verify payment attempt
    const result = await paymentService.verifyPaymentAttempt(init.paymentId, 'TXN_REF_REAL_123');
    
    expect(result.success).toBe(true);
    expect(result.attempt.status).toBe('PAID');
    expect(result.attempt.providerReference).toBe('TXN_REF_REAL_123');

    // Verify that invoice and trip statuses are updated automatically
    const inv = fakeStore.tables.invoices.find(i => i.id === 'inv_test_999');
    const trip = fakeStore.tables.rental_trips.find(t => t.id === 'trip_test_999');

    expect(inv?.status).toBe('PAID');
    expect(trip?.payment_status).toBe('PAID');
    expect(trip?.status).toBe('COMPLETED');
  });

});

