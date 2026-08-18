import { FuelPrice, FuelPriceHistoryItem, FuelPriceAuditLog, FuelType, FuelPriceStatus } from '@/types';
import { createClient } from '@/lib/supabase/client';

export interface FuelPriceQuery {
  fuelType: FuelType;
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  pincode?: string;
}

export function mapFuelPriceRow(r: any): FuelPrice {
  let rawPaise = Number(r.price_per_unit_paise || r.pricePerUnitPaise || 0);
  let rawRupees = Number(r.price_rupees || r.priceRupees || 0);

  if (rawRupees > 1000) {
    rawPaise = rawRupees;
    rawRupees = rawPaise / 100;
  } else if (rawRupees === 0 && rawPaise > 0) {
    rawRupees = rawPaise / 100;
  } else if (rawPaise === 0 && rawRupees > 0) {
    rawPaise = Math.round(rawRupees * 100);
  }

  return {
    id: r.id || `fp_${(r.fuel_type || r.fuelType || '').toLowerCase()}`,
    country: r.country || 'India',
    state: r.state || 'Kerala',
    district: r.district || '',
    city: r.city || 'Kozhikode',
    pincode: r.pincode || '',
    fuelType: (r.fuel_type || r.fuelType) as FuelType,
    pricePerUnitPaise: rawPaise,
    priceRupees: rawRupees,
    unit: (r.unit || (r.fuel_type === 'CNG' || r.fuelType === 'CNG' ? 'KG' : 'LITRE')) as 'LITRE' | 'KG',
    currency: r.currency || 'INR',
    sourceName: r.source_name || r.sourceName || r.source || 'Central Database',
    sourceUrl: r.source_url || r.sourceUrl,
    effectiveDate: r.effective_date || r.effectiveDate || new Date().toISOString().slice(0, 10),
    fetchedAt: r.fetched_at || r.fetchedAt || new Date().toISOString(),
    status: (r.status || 'LIVE') as FuelPriceStatus,
    fallbackReason: r.fallback_reason || r.fallbackReason,
    createdAt: r.created_at || r.createdAt || new Date().toISOString(),
    updatedAt: r.updated_at || r.updatedAt || new Date().toISOString(),
    source: r.source_name || r.sourceName || r.source || 'Central Database',
    effectiveAt: r.fetched_at || r.fetchedAt || new Date().toISOString(),
  };
}

export class FuelPriceRepository {
  private getSupabase() {
    return createClient();
  }

  /**
   * Fetch single canonical fuel price record from database.
   */
  async getByLocationAndType(fuelType: FuelType, state: string = 'Kerala', city: string = 'Kozhikode'): Promise<FuelPrice | null> {
    try {
      const supabase = this.getSupabase();
      const { data, error } = await supabase
        .from('fuel_prices')
        .select('*')
        .eq('fuel_type', fuelType)
        .eq('state', state)
        .eq('city', city)
        .maybeSingle();

      if (error) {
        console.warn(`[FuelPriceRepository] Query failed for ${fuelType} in ${city}, ${state}:`, error.message);
        return null;
      }

      return data ? mapFuelPriceRow(data) : null;
    } catch (err) {
      console.warn('[FuelPriceRepository] Supabase connection error:', err);
      return null;
    }
  }

  /**
   * Fetch all 3 canonical fuel prices (Petrol, Diesel, CNG) for a location.
   */
  async getAllForLocation(state: string = 'Kerala', city: string = 'Kozhikode'): Promise<Record<FuelType, FuelPrice | null>> {
    const result: Record<FuelType, FuelPrice | null> = {
      PETROL: null,
      DIESEL: null,
      CNG: null,
      ELECTRIC: null,
    };

    try {
      const supabase = this.getSupabase();
      const { data, error } = await supabase
        .from('fuel_prices')
        .select('*')
        .eq('state', state)
        .eq('city', city);

      if (!error && data) {
        for (const row of data) {
          const mapped = mapFuelPriceRow(row);
          result[mapped.fuelType] = mapped;
        }
      }
    } catch (err) {
      console.warn('[FuelPriceRepository] Failed to fetch all fuel prices:', err);
    }

    return result;
  }

  /**
   * Execute transactional platform admin fuel rates update.
   */
  async updateAdminRates(params: {
    state: string;
    district?: string;
    city: string;
    petrolPaise: number;
    dieselPaise: number;
    cngPaise: number;
    source?: string;
    sourceUrl?: string;
  }): Promise<{ success: boolean; data?: FuelPrice[]; error?: string }> {
    try {
      const supabase = this.getSupabase();

      // Try RPC function first
      const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_update_fuel_rates', {
        p_state: params.state,
        p_district: params.district || '',
        p_city: params.city,
        p_petrol_paise: params.petrolPaise,
        p_diesel_paise: params.dieselPaise,
        p_cng_paise: params.cngPaise,
        p_source: params.source || 'MANUAL_ADMIN',
        p_source_url: params.sourceUrl || null,
        p_effective_date: new Date().toISOString().slice(0, 10),
      });

      if (!rpcErr && rpcData) {
        return { success: true, data: rpcData.map((r: any) => mapFuelPriceRow(r)) };
      }

      // Fallback to table upserts if RPC is pending in migration
      const todayStr = new Date().toISOString().slice(0, 10);
      const nowIso = new Date().toISOString();
      const records = [
        {
          state: params.state,
          district: params.district || '',
          city: params.city,
          fuel_type: 'PETROL',
          price_per_unit_paise: params.petrolPaise,
          price_rupees: params.petrolPaise / 100,
          unit: 'LITRE',
          currency: 'INR',
          source_name: params.source || 'MANUAL_ADMIN',
          effective_date: todayStr,
          fetched_at: nowIso,
          status: 'LIVE',
          updated_at: nowIso,
        },
        {
          state: params.state,
          district: params.district || '',
          city: params.city,
          fuel_type: 'DIESEL',
          price_per_unit_paise: params.dieselPaise,
          price_rupees: params.dieselPaise / 100,
          unit: 'LITRE',
          currency: 'INR',
          source_name: params.source || 'MANUAL_ADMIN',
          effective_date: todayStr,
          fetched_at: nowIso,
          status: 'LIVE',
          updated_at: nowIso,
        },
        {
          state: params.state,
          district: params.district || '',
          city: params.city,
          fuel_type: 'CNG',
          price_per_unit_paise: params.cngPaise,
          price_rupees: params.cngPaise / 100,
          unit: 'KG',
          currency: 'INR',
          source_name: params.source || 'MANUAL_ADMIN',
          effective_date: todayStr,
          fetched_at: nowIso,
          status: 'LIVE',
          updated_at: nowIso,
        },
      ];

      const { data: upsertData, error: upsertErr } = await supabase
        .from('fuel_prices')
        .upsert(records, { onConflict: 'state,district,city,fuel_type' })
        .select();

      if (upsertErr) {
        return { success: false, error: upsertErr.message };
      }

      // Insert history
      for (const rec of records) {
        await supabase.from('fuel_price_history').insert({
          fuel_type: rec.fuel_type,
          country: 'India',
          state: rec.state,
          district: rec.district,
          city: rec.city,
          price_per_unit_paise: rec.price_per_unit_paise,
          price_rupees: rec.price_rupees,
          unit: rec.unit,
          currency: 'INR',
          source_name: rec.source_name,
          effective_date: todayStr,
        });

        await supabase.from('fuel_price_audit_log').insert({
          event_type: 'FUEL_PRICE_UPDATED',
          fuel_type: rec.fuel_type,
          country: 'India',
          state: rec.state,
          district: rec.district,
          city: rec.city,
          new_price_rupees: rec.price_rupees,
          source_name: rec.source_name,
          status: 'SUCCESS',
        });
      }

      return {
        success: true,
        data: (upsertData || records).map(mapFuelPriceRow),
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Database transaction error' };
    }
  }

  /**
   * Get price history logs.
   */
  async getHistory(limit = 50): Promise<FuelPriceHistoryItem[]> {
    try {
      const supabase = this.getSupabase();
      const { data, error } = await supabase
        .from('fuel_price_history')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return data.map((r: any) => ({
        id: r.id,
        fuelPriceId: r.fuel_price_id,
        fuelType: r.fuel_type,
        country: r.country,
        state: r.state,
        district: r.district,
        city: r.city,
        pincode: r.pincode,
        pricePerUnitPaise: r.price_per_unit_paise,
        priceRupees: Number(r.price_rupees),
        unit: r.unit,
        currency: r.currency,
        sourceName: r.source_name,
        sourceUrl: r.source_url,
        effectiveDate: r.effective_date,
        recordedAt: r.recorded_at,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get price audit logs.
   */
  async getAuditLogs(limit = 50): Promise<FuelPriceAuditLog[]> {
    try {
      const supabase = this.getSupabase();
      const { data, error } = await supabase
        .from('fuel_price_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return data.map((r: any) => ({
        id: r.id,
        eventType: r.event_type,
        fuelType: r.fuel_type,
        country: r.country,
        state: r.state,
        district: r.district,
        city: r.city,
        oldPriceRupees: r.old_price_rupees ? Number(r.old_price_rupees) : undefined,
        newPriceRupees: r.new_price_rupees ? Number(r.new_price_rupees) : undefined,
        sourceName: r.source_name,
        status: r.status,
        errorMessage: r.error_message,
        createdAt: r.created_at,
      }));
    } catch {
      return [];
    }
  }
}

export const fuelPriceRepository = new FuelPriceRepository();
