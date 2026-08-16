import { FuelPrice, FuelPriceSnapshot, FuelType, FuelPriceStatus } from '@/types';
import { fuelPriceRepository, mapFuelPriceRow } from './fuelPriceRepository';

// Standard fallback rates for Kerala (Kozhikode baseline) if database has not yet been initialized
const DEFAULT_BASELINE_RATES: Record<FuelType, { priceRupees: number; pricePaise: number; unit: 'LITRE' | 'KG' }> = {
  PETROL: { priceRupees: 107.50, pricePaise: 10750, unit: 'LITRE' },
  DIESEL: { priceRupees: 96.30, pricePaise: 9630, unit: 'LITRE' },
  CNG: { priceRupees: 88.00, pricePaise: 8800, unit: 'KG' },
  ELECTRIC: { priceRupees: 9.50, pricePaise: 950, unit: 'LITRE' },
};

// In-memory runtime cache for microsecond reads
const runtimeCache = new Map<string, { price: FuelPrice; cachedAt: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute local TTL (invalidated instantly by realtime subscription)

export class CentralFuelPriceService {
  /**
   * Clears the in-memory cache for a location or all locations.
   */
  clearCache(key?: string) {
    if (key) runtimeCache.delete(key);
    else runtimeCache.clear();
  }

  /**
   * Helper to build cache key.
   */
  private buildCacheKey(fuelType: FuelType, state: string, city: string): string {
    return `${fuelType.toUpperCase()}_${state.toLowerCase().trim()}_${city.toLowerCase().trim()}`;
  }

  /**
   * Get canonical live / cached fuel price for a fuel type and location.
   */
  async getLatestFuelPrice(
    fuelType: FuelType,
    state: string = 'Kerala',
    city: string = 'Kozhikode',
    forceRefresh: boolean = false
  ): Promise<FuelPrice> {
    const key = this.buildCacheKey(fuelType, state, city);
    const cached = runtimeCache.get(key);

    if (!forceRefresh && cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.price;
    }

    // 1. Fetch from canonical Database
    const dbRecord = await fuelPriceRepository.getByLocationAndType(fuelType, state, city);
    if (dbRecord) {
      runtimeCache.set(key, { price: dbRecord, cachedAt: Date.now() });
      return dbRecord;
    }

    // 2. If state/city not found, try Kerala / Kozhikode canonical fallback in DB
    if (state !== 'Kerala' || city !== 'Kozhikode') {
      const defaultDbRecord = await fuelPriceRepository.getByLocationAndType(fuelType, 'Kerala', 'Kozhikode');
      if (defaultDbRecord) {
        return {
          ...defaultDbRecord,
          state,
          city,
          fallbackReason: `Regional price not configured for ${city}, using Kerala baseline rate.`,
          status: 'RECENT',
        };
      }
    }

    // 3. Fallback to standard baseline if DB is empty
    const baseline = DEFAULT_BASELINE_RATES[fuelType] || DEFAULT_BASELINE_RATES.PETROL;
    const fallbackPrice: FuelPrice = {
      id: `fp_${fuelType.toLowerCase()}_default`,
      country: 'India',
      state,
      city,
      fuelType,
      pricePerUnitPaise: baseline.pricePaise,
      priceRupees: baseline.priceRupees,
      unit: baseline.unit,
      currency: 'INR',
      sourceName: 'Standard State Benchmark',
      effectiveDate: new Date().toISOString().slice(0, 10),
      fetchedAt: new Date().toISOString(),
      status: 'RECENT',
      fallbackReason: 'Baseline market rate',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: 'Standard State Benchmark',
      effectiveAt: new Date().toISOString(),
    };

    runtimeCache.set(key, { price: fallbackPrice, cachedAt: Date.now() });
    return fallbackPrice;
  }

  /**
   * Get all 3 rates (Petrol, Diesel, CNG) simultaneously for dashboards and forms.
   */
  async getAllCurrentRates(state: string = 'Kerala', city: string = 'Kozhikode') {
    const [petrol, diesel, cng] = await Promise.all([
      this.getLatestFuelPrice('PETROL', state, city),
      this.getLatestFuelPrice('DIESEL', state, city),
      this.getLatestFuelPrice('CNG', state, city),
    ]);

    return { petrol, diesel, cng };
  }

  /**
   * Create an immutable snapshot for trip or invoice generation.
   */
  createPriceSnapshot(fp: FuelPrice): FuelPriceSnapshot {
    return {
      snapshotId: `fps_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      fuelType: fp.fuelType,
      country: fp.country || 'India',
      state: fp.state || 'Kerala',
      district: fp.district || '',
      city: fp.city || 'Kozhikode',
      pincode: fp.pincode,
      pricePerLitreRupees: fp.priceRupees,
      priceRupees: fp.priceRupees,
      pricePerUnitPaise: fp.pricePerUnitPaise,
      unit: fp.unit,
      currency: fp.currency || 'INR',
      source: fp.sourceName,
      sourceUrl: fp.sourceUrl,
      effectiveAt: fp.effectiveDate,
      fetchedAt: fp.fetchedAt || new Date().toISOString(),
      status: fp.status,
    };
  }

  /**
   * Calculate fuel cost for a given distance and vehicle.
   */
  calculateFuelCost(params: {
    distanceKm: number;
    mileageKmpl: number;
    fuelPriceRupees: number;
  }): {
    fuelUsedUnits: number;
    fuelCostRupees: number;
    costPerKmRupees: number;
  } {
    const { distanceKm, mileageKmpl, fuelPriceRupees } = params;
    if (mileageKmpl <= 0 || distanceKm <= 0) {
      return { fuelUsedUnits: 0, fuelCostRupees: 0, costPerKmRupees: 0 };
    }

    const fuelUsedUnits = distanceKm / mileageKmpl;
    const fuelCostRupees = fuelUsedUnits * fuelPriceRupees;
    const costPerKmRupees = fuelCostRupees / distanceKm;

    return {
      fuelUsedUnits: Math.round(fuelUsedUnits * 100) / 100,
      fuelCostRupees: Math.round(fuelCostRupees * 100) / 100,
      costPerKmRupees: Math.round(costPerKmRupees * 100) / 100,
    };
  }
}

export const centralFuelPriceService = new CentralFuelPriceService();
