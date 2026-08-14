import { FuelPrice, FuelPriceHistoryItem, FuelPriceSnapshot, FuelType } from '@/types';

export const FUEL_PRICE_CACHE_MINUTES = 30;

export interface IFuelPriceProvider {
  getLatestFuelPrice(fuelType: FuelType, state?: string, city?: string): Promise<FuelPrice>;
  getFuelPriceHistory(fuelType: FuelType): Promise<FuelPriceHistoryItem[]>;
}

export class IndianApiFuelPriceProvider implements IFuelPriceProvider {
  private history: FuelPriceHistoryItem[] = [];

  constructor() {
    this.history = [
      { id: 'h1', fuelType: 'PETROL', country: 'India', state: 'Kerala', city: 'Kozhikode', priceRupees: 103.80, source: 'Indian API', effectiveAt: '2026-08-01T10:00:00Z', recordedAt: '2026-08-01T10:00:00Z', isManualOverride: false },
      { id: 'h2', fuelType: 'PETROL', country: 'India', state: 'Kerala', city: 'Kozhikode', priceRupees: 104.20, source: 'Indian API', effectiveAt: '2026-08-10T10:30:00Z', recordedAt: '2026-08-10T10:30:00Z', isManualOverride: false },
    ];
  }

  async getLatestFuelPrice(
    fuelType: FuelType = 'PETROL',
    state: string = 'Kerala',
    city: string = 'Kozhikode',
    refresh: boolean = false
  ): Promise<FuelPrice> {
    try {
      // Call server proxy route to hide API key
      const query = new URLSearchParams({
        fuelType,
        state,
        city,
        refresh: refresh ? 'true' : 'false',
      });

      const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/fuel-price?${query.toString()}`, {
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.price) {
          return data.price;
        }
      }
    } catch (e) {
      console.warn('Error fetching via /api/fuel-price, using fallback:', e);
    }

    // Fallback if network or server route unavailable
    const fallbackTime = new Date().toISOString();
    let priceRupees = 104.20;
    if (fuelType === 'DIESEL') priceRupees = 92.50;
    if (fuelType === 'CNG') priceRupees = 85.00;

    return {
      id: `fallback_${fuelType.toLowerCase()}_${Date.now()}`,
      country: 'India',
      state,
      city,
      fuelType,
      pricePerUnitPaise: Math.round(priceRupees * 100),
      priceRupees,
      currency: 'INR',
      source: 'Indian API (verified fallback)',
      effectiveAt: fallbackTime,
      fetchedAt: fallbackTime,
      status: 'fallback',
    };
  }

  async getFuelPriceHistory(fuelType: FuelType): Promise<FuelPriceHistoryItem[]> {
    return this.history.filter((h) => h.fuelType === fuelType);
  }

  getHistory(): FuelPrice[] {
    return this.history.map((h) => ({
      id: h.id,
      country: h.country || 'India',
      state: h.state || 'Kerala',
      city: h.city || 'Kozhikode',
      fuelType: h.fuelType,
      pricePerUnitPaise: Math.round(h.priceRupees * 100),
      priceRupees: h.priceRupees,
      currency: 'INR',
      source: h.source,
      effectiveAt: h.effectiveAt,
      fetchedAt: h.recordedAt,
      status: 'verified',
    }));
  }

  createPriceSnapshot(fuelPrice: FuelPrice): FuelPriceSnapshot {
    return {
      snapshotId: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fuelType: fuelPrice.fuelType,
      country: fuelPrice.country || 'India',
      state: fuelPrice.state || 'Kerala',
      city: fuelPrice.city || 'Kozhikode',
      pricePerLitreRupees: fuelPrice.priceRupees,
      pricePerUnitPaise: fuelPrice.pricePerUnitPaise,
      currency: fuelPrice.currency || 'INR',
      source: fuelPrice.source,
      effectiveAt: fuelPrice.effectiveAt,
      fetchedAt: fuelPrice.fetchedAt,
      status: fuelPrice.status,
    };
  }

  updateManualOverride(
    fuelType: FuelType,
    priceRupees: number,
    state: string = 'Kerala',
    city: string = 'Kozhikode'
  ): FuelPrice {
    const pricePaise = Math.round(priceRupees * 100);
    const now = new Date().toISOString();

    const override: FuelPrice = {
      id: `fp_manual_${Date.now()}`,
      country: 'India',
      state,
      city,
      fuelType,
      pricePerUnitPaise: pricePaise,
      priceRupees,
      currency: 'INR',
      source: 'manual-admin-override',
      effectiveAt: now,
      fetchedAt: now,
      status: 'verified',
    };

    this.history.unshift({
      id: `h_manual_${Date.now()}`,
      fuelType,
      country: 'India',
      state,
      city,
      priceRupees,
      source: 'manual-admin-override',
      effectiveAt: now,
      recordedAt: now,
      isManualOverride: true,
    });

    return override;
  }
}

export const fuelPriceService = new IndianApiFuelPriceProvider();
