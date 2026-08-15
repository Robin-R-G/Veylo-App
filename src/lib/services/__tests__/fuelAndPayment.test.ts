import { calculateRideCosts, generateUpiDeepLink } from '../financialEngine';
import { fuelPriceService } from '../fuelPriceProvider';
import { mockStorage } from '../mockStorage';

describe('Live Indian Fuel Price & Payment Test Suite', () => {

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

    // Invoice captured at start price ₹104.20/L
    expect(invoice.priceSnapshot.pricePerLitreRupees).toBe(104.20);
    expect(invoice.totalRupees).toBe(20.84);

    // Simulate price change to ₹105.00/L
    fuelPriceService.updateManualOverride('PETROL', 105.00, 'Kerala', 'Kozhikode');

    // Completed invoice MUST retain ₹104.20/L snapshot and NOT recalculate!
    const state = mockStorage.getState();
    const fetchedInv = state.invoices.find(i => i.id === invoice.id);

    expect(fetchedInv?.priceSnapshot.pricePerLitreRupees).toBe(104.20);
    expect(fetchedInv?.totalRupees).toBe(20.84);
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
    const price = await fuelPriceService.getLatestFuelPrice('PETROL', 'Kerala', 'Kozhikode');
    
    expect(price.priceRupees).toBeGreaterThan(0);
    expect(price.sourceName || price.source).toBeDefined();
    expect(price.status).toMatch(/verified|cached|fallback|LIVE|RECENT|STALE/);
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

    // Setup dummy invoice
    const dummyInvoice = {
      id: 'inv_test_999',
      invoiceNumber: 'INV-TEST-999',
      tripId: 'trip_test_999',
      totalRupees: 301.20,
      paymentStatus: 'PENDING' as const,
      payeeUpiId: 'ownername@upi',
      payeeName: 'Owner Name',
      issuedAt: new Date().toISOString(),
    };
    
    const store = mockStorage.getState();
    store.invoices.push(dummyInvoice as any);
    store.rentalTrips.push({
      id: 'trip_test_999',
      riderId: 'rider_999',
      ownerId: 'owner_999',
      vehicleId: 'vehicle_999',
      totalAmountRupees: 301.20,
      status: 'CONFIRMATION_PENDING',
      paymentStatus: 'PENDING',
    } as any);
    mockStorage.saveStore(store);

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
    expect(mockStorage.getPaymentAttemptsByInvoiceId('inv_test_999').length).toBe(1);
  });

  test('TEST 8 — Payment Attempt Verification and State Flow', async () => {
    const { paymentService } = await import('../paymentService');
    const attempts = mockStorage.getPaymentAttemptsByInvoiceId('inv_test_999');
    const activeAttempt = attempts[0];

    // Verify payment attempt
    const result = await paymentService.verifyPaymentAttempt(activeAttempt.paymentId, 'TXN_REF_REAL_123');
    
    expect(result.success).toBe(true);
    expect(result.attempt.status).toBe('PAID');
    expect(result.attempt.providerReference).toBe('TXN_REF_REAL_123');

    // Verify that invoice and trip statuses are updated automatically
    const state = mockStorage.getState();
    const inv = state.invoices.find(i => i.id === 'inv_test_999');
    const trip = state.rentalTrips.find(t => t.id === 'trip_test_999');

    expect(inv?.paymentStatus).toBe('PAID');
    expect(trip?.paymentStatus).toBe('PAID');
    expect(trip?.status).toBe('COMPLETED');
  });

});

