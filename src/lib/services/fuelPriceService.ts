import { FuelPrice, FuelPriceHistoryItem, FuelPriceSnapshot, FuelType, FuelPriceStatus } from '@/types';
import { centralFuelPriceService } from './fuel/fuelPriceService';
import { adminFuelService } from './fuel/adminFuelService';
import { fuelPriceRepository } from './fuel/fuelPriceRepository';
import { fuelRealtimeService } from './fuel/fuelRealtimeService';

export * from './fuel/fuelPriceRepository';
export * from './fuel/fuelPriceService';
export * from './fuel/adminFuelService';
export * from './fuel/fuelApiProvider';
export * from './fuel/fuelRealtimeService';

class LegacyFuelPriceServiceAdapter {
  /**
   * Get latest canonical price for a fuel type.
   */
  async getLatestFuelPrice(
    fuelType: FuelType = 'PETROL',
    state: string = 'Kerala',
    city: string = 'Kozhikode',
    forceRefresh = false
  ): Promise<FuelPrice> {
    return centralFuelPriceService.getLatestFuelPrice(fuelType, state, city, forceRefresh);
  }

  /**
   * Get cached price or DB price.
   */
  async getCachedPrice(fuelType: FuelType, state: string = 'Kerala', city: string = 'Kozhikode'): Promise<number> {
    const res = await centralFuelPriceService.getLatestFuelPrice(fuelType, state, city);
    const rawPrice = res.priceRupees || (res.pricePerUnitPaise ? res.pricePerUnitPaise / 100 : 0);
    return rawPrice > 500 ? rawPrice / 100 : rawPrice;
  }

  /**
   * Update manual override from Admin panel.
   */
  async updateManualOverride(fuelType: FuelType, priceRupees: number, state: string = 'Kerala', city: string = 'Kozhikode') {
    // For single fuel type override compatibility
    const current = await centralFuelPriceService.getAllCurrentRates(state, city);
    const petrol = fuelType === 'PETROL' ? priceRupees : current.petrol.priceRupees;
    const diesel = fuelType === 'DIESEL' ? priceRupees : current.diesel.priceRupees;
    const cng = fuelType === 'CNG' ? priceRupees : current.cng.priceRupees;

    return adminFuelService.publishManualOverride({
      state,
      city,
      petrolRupees: petrol,
      dieselRupees: diesel,
      cngRupees: cng,
    });
  }

  /**
   * Get price history.
   */
  async getHistory(limit = 50): Promise<FuelPriceHistoryItem[]> {
    return adminFuelService.getHistory(limit);
  }

  /**
   * Create immutable price snapshot for invoice.
   */
  createPriceSnapshot(fp: FuelPrice): FuelPriceSnapshot {
    return centralFuelPriceService.createPriceSnapshot(fp);
  }

  /**
   * Calculate fuel cost for a trip.
   */
  calculateFuelCost(params: {
    distanceKm: number;
    mileageKmpl: number;
    fuelPriceRupees: number;
  }) {
    return centralFuelPriceService.calculateFuelCost(params);
  }
}

export const fuelPriceService = new LegacyFuelPriceServiceAdapter();
