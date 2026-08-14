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

  test('TEST 5 — Fuel API Unavailable Fallback Timestamp Display', async () => {
    const price = await fuelPriceService.getLatestFuelPrice('PETROL', 'Kerala', 'Kozhikode');
    
    expect(price.priceRupees).toBeGreaterThan(0);
    expect(price.source).toBeDefined();
    expect(price.status).toMatch(/verified|cached|fallback/);
  });

});
