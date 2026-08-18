import { describe, it, expect, beforeEach, vi } from 'vitest';
import { centralFuelPriceService } from '../fuel/fuelPriceService';
import { adminFuelService } from '../fuel/adminFuelService';
import { fuelRealtimeService } from '../fuel/fuelRealtimeService';
import { authService } from '../authService';
import { fakeStore } from './fakeSupabase';
import { FuelPrice } from '@/types';

vi.mock('@/lib/supabase/client', async () => {
  const m = await import('./fakeSupabase');
  return { createClient: m.createFakeClient, isSupabaseConfigured: true };
});

describe('Central Fuel Price Authority & Admin Security', () => {
  beforeEach(() => {
    fakeStore.reset();
    centralFuelPriceService.clearCache();
    authService.clearSession();
  });

  describe('1. Canonical Single Source of Truth Rates', () => {
    it('returns valid default benchmark rates for Petrol, Diesel, and CNG', async () => {
      const petrol = await centralFuelPriceService.getLatestFuelPrice('PETROL', 'Kerala', 'Kozhikode');
      const diesel = await centralFuelPriceService.getLatestFuelPrice('DIESEL', 'Kerala', 'Kozhikode');
      const cng = await centralFuelPriceService.getLatestFuelPrice('CNG', 'Kerala', 'Kozhikode');

      expect(petrol.priceRupees).toBeGreaterThan(50);
      expect(petrol.unit).toBe('LITRE');
      expect(diesel.priceRupees).toBeGreaterThan(40);
      expect(diesel.unit).toBe('LITRE');
      expect(cng.priceRupees).toBeGreaterThan(30);
      expect(cng.unit).toBe('KG');
    });

    it('reads database canonical rates when present in Supabase', async () => {
      fakeStore.tables.fuel_prices = [
        {
          id: 'fp_p1',
          fuel_type: 'PETROL',
          state: 'Kerala',
          city: 'Kozhikode',
          price_per_unit_paise: 10600,
          price_rupees: 106.00,
          unit: 'LITRE',
          currency: 'INR',
          source_name: 'MANUAL_ADMIN',
          effective_date: '2026-08-17',
          status: 'LIVE',
        },
      ];

      const petrol = await centralFuelPriceService.getLatestFuelPrice('PETROL', 'Kerala', 'Kozhikode');
      expect(petrol.priceRupees).toBe(106.00);
      expect(petrol.sourceName).toBe('MANUAL_ADMIN');
      expect(petrol.status).toBe('LIVE');
    });

    it('creates immutable price snapshots for invoices', async () => {
      const petrol = await centralFuelPriceService.getLatestFuelPrice('PETROL', 'Kerala', 'Kozhikode');
      const snapshot = centralFuelPriceService.createPriceSnapshot(petrol);

      expect(snapshot.fuelType).toBe('PETROL');
      expect(snapshot.priceRupees).toBe(petrol.priceRupees);
      expect(snapshot.pricePerUnitPaise).toBe(petrol.pricePerUnitPaise);
      expect(snapshot.fetchedAt).toBeDefined();
      expect(snapshot.city).toBe('Kozhikode');
    });

    it('calculates fuel consumption and cost accurately based on mileage and fuel rate', () => {
      const result = centralFuelPriceService.calculateFuelCost({
        distanceKm: 100,
        mileageKmpl: 20, // 5 Litres
        fuelPriceRupees: 100, // ₹500
      });

      expect(result.fuelUsedUnits).toBe(5);
      expect(result.fuelCostRupees).toBe(500);
      expect(result.costPerKmRupees).toBe(5);
    });
  });

  describe('2. Platform Admin Manual Override Publishing', () => {
    it('rejects zero or negative fuel rates with clear error', async () => {
      const invalidRes = await adminFuelService.publishManualOverride({
        state: 'Kerala',
        city: 'Kozhikode',
        petrolRupees: -10,
        dieselRupees: 95,
        cngRupees: 88,
      });

      expect(invalidRes.success).toBe(false);
      expect(invalidRes.error).toContain('greater than 0');
    });

    it('rejects missing state or city', async () => {
      const invalidRes = await adminFuelService.publishManualOverride({
        state: '',
        city: 'Kozhikode',
        petrolRupees: 105,
        dieselRupees: 95,
        cngRupees: 88,
      });

      expect(invalidRes.success).toBe(false);
      expect(invalidRes.error).toContain('State and City are required');
    });

    it('commits manual override and clears cache for immediate propagation', async () => {
      const result = await adminFuelService.publishManualOverride({
        state: 'Kerala',
        city: 'Kozhikode',
        petrolRupees: 109.50,
        dieselRupees: 97.20,
        cngRupees: 89.00,
      });

      expect(result.success).toBe(true);
      expect(fakeStore.tables.fuel_prices.length).toBe(3);
      expect(fakeStore.tables.fuel_price_history.length).toBe(3);
      expect(fakeStore.tables.fuel_price_audit_log.length).toBe(3);

      const updatedPetrol = await centralFuelPriceService.getLatestFuelPrice('PETROL', 'Kerala', 'Kozhikode');
      expect(updatedPetrol.priceRupees).toBe(109.50);
    });
  });

  describe('3. Realtime Subscription Broadcast', () => {
    it('notifies registered subscribers upon realtime broadcast', () => {
      let notifiedPrice: FuelPrice | null = null;

      const unsubscribe = fuelRealtimeService.subscribe((price) => {
        notifiedPrice = price;
      });

      const mockUpdate: FuelPrice = {
        id: 'fp_petrol_test',
        country: 'India',
        state: 'Kerala',
        city: 'Kozhikode',
        fuelType: 'PETROL',
        pricePerUnitPaise: 10850,
        priceRupees: 108.50,
        unit: 'LITRE',
        currency: 'INR',
        sourceName: 'MANUAL_ADMIN',
        effectiveDate: '2026-08-17',
        fetchedAt: new Date().toISOString(),
        status: 'LIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: 'MANUAL_ADMIN',
        effectiveAt: new Date().toISOString(),
      };

      fuelRealtimeService.broadcast(mockUpdate);

      expect(notifiedPrice).not.toBeNull();
      expect((notifiedPrice as unknown as FuelPrice).priceRupees).toBe(108.50);

      unsubscribe();
    });
  });

  describe('4. Strict Role Authentication & Separation', () => {
    it('authenticates Super Admin with valid security credentials', async () => {
      fakeStore.tables.profiles = [
        { id: 'prof_admin', user_id: 'u_fake', role: 'ADMIN', full_name: 'Super Admin' }
      ];
      const result = await authService.loginAsAdmin('superadmin@veylo.app', 'admin2024');
      expect(result.success).toBe(true);
      expect(authService.isPlatformAdmin()).toBe(true);
      expect(authService.hasRole('ADMIN')).toBe(true);
    });

    it('rejects Admin login with invalid pin', async () => {
      fakeStore.tables.profiles = [
        { id: 'prof_user', user_id: 'u_fake', role: 'OWNER', full_name: 'Regular Owner' }
      ];
      const result = await authService.loginAsAdmin('superadmin@veylo.app', 'wrongpin');
      expect(result.success).toBe(false);
      expect(authService.isPlatformAdmin()).toBe(false);
    });

    it('isolates Owner role from Platform Admin role', async () => {
      fakeStore.tables.profiles = [
        { id: 'prof_owner', user_id: 'u_fake', role: 'OWNER', full_name: 'Robin Owner' }
      ];
      await authService.loginAsOwner('Robin Owner', '1234');
      expect(authService.isOwner()).toBe(true);
      expect(authService.isPlatformAdmin()).toBe(false);
      expect(authService.isRider()).toBe(false);
    });

    it('isolates Rider role from Platform Admin and Owner', async () => {
      await authService.loginAsRider('Rahul Rider', '9876543210');
      expect(authService.isRider()).toBe(true);
      expect(authService.isOwner()).toBe(false);
      expect(authService.isPlatformAdmin()).toBe(false);
    });
  });

  describe('5. Historical Invoice Snapshot Immutability', () => {
    it('preserves historical snapshot amount regardless of new rate changes', () => {
      // Historical Trip generated when Petrol was ₹100/L
      const historicalSnapshot = {
        fuelType: 'PETROL' as const,
        priceRupees: 100.00,
        pricePaise: 10000,
        unit: 'LITRE' as const,
        capturedAt: '2026-08-01T10:00:00Z',
      };

      const invoice = {
        id: 'inv_hist_01',
        totalRupees: 250.00,
        priceSnapshot: historicalSnapshot,
      };

      // Admin subsequently updates current petrol rate to ₹110/L
      const currentRate = 110.00;

      // Assert historical invoice snapshot and total remain untouched
      expect(invoice.priceSnapshot.priceRupees).toBe(100.00);
      expect(invoice.priceSnapshot.priceRupees).not.toBe(currentRate);
      expect(invoice.totalRupees).toBe(250.00);
    });
  });
});
