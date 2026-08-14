import { calculateRideCosts, formatCurrency } from '../financialEngine';
import { normalizeRegistrationNumber } from '../registrationNormalizer';
import { validateOdometerUpdate } from '../odometerService';
import { isAdFreeUser } from '../entitlementEngine';

describe('Vehicle SaaS Core Logic Tests', () => {
  test('Exact Prompt Financial Scenario (KL 16 P 78)', () => {
    // Start: 12,500 km, End: 12,560 km, Distance: 60 km, Mileage: 40 km/L, Fuel Price: ₹104/L
    const result = calculateRideCosts({
      startOdometer: 12500,
      endOdometer: 12560,
      mileageKmpl: 40,
      fuelPricePaise: 10400, // ₹104.00
    });

    expect(result.distanceKm).toBe(60);
    expect(result.estimatedFuelLitres).toBe(1.50);
    expect(result.estimatedFuelCostRupees).toBe(156.00);
    expect(result.pricePerKmRupees).toBe(2.60);
    expect(result.costPer10KmRupees).toBe(26.00);
    expect(result.costPer100KmRupees).toBe(260.00);
    expect(result.totalAmountRupees).toBe(156.00);
  });

  test('Registration Normalization', () => {
    expect(normalizeRegistrationNumber('KL 16 P 78')).toBe('KL16P78');
    expect(normalizeRegistrationNumber('kl-16-p-78')).toBe('KL16P78');
    expect(normalizeRegistrationNumber('MH 02 CK 1234')).toBe('MH02CK1234');
  });

  test('Odometer Decreasing Validation', () => {
    const check = validateOdometerUpdate(12560, 12500, false);
    expect(check.isValid).toBe(false);
    expect(check.errorMessage).toContain('cannot be less than previous reading');

    const adminCorrection = validateOdometerUpdate(12560, 12500, true);
    expect(adminCorrection.isValid).toBe(true);
  });

  test('Ad-Free Subscription Entitlement', () => {
    expect(isAdFreeUser('FREE')).toBe(false);
    expect(isAdFreeUser('PRO')).toBe(true);
    expect(isAdFreeUser('BUSINESS')).toBe(true);
  });
});
