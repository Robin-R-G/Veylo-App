import { FuelPrice, FuelPriceHistoryItem, FuelPriceAuditLog, FuelType } from '@/types';
import { fuelPriceRepository } from './fuelPriceRepository';
import { fuelApiProvider } from './fuelApiProvider';
import { centralFuelPriceService } from './fuelPriceService';

export class AdminFuelService {
  /**
   * Publish Platform Admin Manual Override for Petrol, Diesel, and CNG.
   */
  async publishManualOverride(params: {
    state: string;
    district?: string;
    city: string;
    petrolRupees: number;
    dieselRupees: number;
    cngRupees: number;
    notes?: string;
  }): Promise<{ success: boolean; data?: FuelPrice[]; error?: string }> {
    const { state, district, city, petrolRupees, dieselRupees, cngRupees } = params;

    // Validation
    if (!state || !city) {
      return { success: false, error: 'State and City are required.' };
    }
    if (petrolRupees <= 0 || dieselRupees <= 0 || cngRupees <= 0) {
      return { success: false, error: 'All fuel rates must be positive numbers greater than 0.' };
    }

    const petrolPaise = Math.round(petrolRupees * 100);
    const dieselPaise = Math.round(dieselRupees * 100);
    const cngPaise = Math.round(cngRupees * 100);

    const result = await fuelPriceRepository.updateAdminRates({
      state,
      district,
      city,
      petrolPaise,
      dieselPaise,
      cngPaise,
      source: 'MANUAL_ADMIN',
    });

    if (result.success) {
      centralFuelPriceService.clearCache();
    }

    return result;
  }

  /**
   * Fetch Live API rates and publish them directly to the central database.
   */
  async fetchAndPublishLiveRates(state: string = 'Kerala', city: string = 'Kozhikode'): Promise<{
    success: boolean;
    data?: FuelPrice[];
    error?: string;
  }> {
    const liveFetch = await fuelApiProvider.fetchLiveRates(state, city);

    if (liveFetch.status === 'SOURCE_ERROR' || !liveFetch.petrol || !liveFetch.diesel) {
      return {
        success: false,
        error: liveFetch.error || 'Failed to fetch verified market rates from external API providers.',
      };
    }

    const petrolPaise = liveFetch.petrol.pricePaise;
    const dieselPaise = liveFetch.diesel.pricePaise;
    const cngPaise = liveFetch.cng ? liveFetch.cng.pricePaise : Math.round(88.00 * 100);

    const result = await fuelPriceRepository.updateAdminRates({
      state,
      city,
      petrolPaise,
      dieselPaise,
      cngPaise,
      source: liveFetch.petrol.sourceName,
      sourceUrl: liveFetch.petrol.sourceUrl,
    });

    if (result.success) {
      centralFuelPriceService.clearCache();
    }

    return result;
  }

  /**
   * Get historical changes.
   */
  async getHistory(limit = 50): Promise<FuelPriceHistoryItem[]> {
    return fuelPriceRepository.getHistory(limit);
  }

  /**
   * Get audit trail logs.
   */
  async getAuditLogs(limit = 50): Promise<FuelPriceAuditLog[]> {
    return fuelPriceRepository.getAuditLogs(limit);
  }
}

export const adminFuelService = new AdminFuelService();
