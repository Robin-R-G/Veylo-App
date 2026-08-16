import { FuelPrice } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { centralFuelPriceService } from './fuelPriceService';
import { mapFuelPriceRow } from './fuelPriceRepository';

export type FuelPriceUpdateCallback = (updatedPrice: FuelPrice) => void;

export class FuelRealtimeService {
  private listeners: Set<FuelPriceUpdateCallback> = new Set();
  private channel: any = null;
  private isSubscribed = false;

  /**
   * Subscribe to real-time fuel price changes across the application.
   */
  subscribe(callback: FuelPriceUpdateCallback): () => void {
    this.listeners.add(callback);

    if (!this.isSubscribed) {
      this.initRealtimeSubscription();
      this.setupFocusAndVisibilityListeners();
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
      if (this.listeners.size === 0) {
        this.teardownSubscription();
      }
    };
  }

  /**
   * Broadcast an updated price to all listeners and clear local cache.
   */
  broadcast(price: FuelPrice) {
    centralFuelPriceService.clearCache();
    this.listeners.forEach((cb) => {
      try {
        cb(price);
      } catch (err) {
        console.error('[FuelRealtimeService] Listener error:', err);
      }
    });
  }

  private initRealtimeSubscription() {
    try {
      const supabase = createClient();
      this.channel = supabase
        .channel('fuel-prices-realtime-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'fuel_prices' },
          (payload) => {
            const newRow = payload.new;
            if (newRow) {
              const mapped = mapFuelPriceRow(newRow);
              this.broadcast(mapped);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.isSubscribed = true;
          }
        });
    } catch (err) {
      console.warn('[FuelRealtimeService] Realtime channel setup failed:', err);
    }
  }

  private setupFocusAndVisibilityListeners() {
    if (typeof window === 'undefined') return;

    // Refresh when user switches back to the tab
    window.addEventListener('focus', () => {
      centralFuelPriceService.clearCache();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        centralFuelPriceService.clearCache();
      }
    });
  }

  private teardownSubscription() {
    if (this.channel) {
      try {
        const supabase = createClient();
        supabase.removeChannel(this.channel);
      } catch {
        // cleanup ignore
      }
      this.channel = null;
      this.isSubscribed = false;
    }
  }
}

export const fuelRealtimeService = new FuelRealtimeService();
