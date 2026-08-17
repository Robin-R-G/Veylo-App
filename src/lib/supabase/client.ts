import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const isSupabaseConfigured = url !== 'https://placeholder.supabase.co' && anonKey !== 'placeholder';

const TABLE_MAP: Record<string, string> = {
  vehicles: 'vehicles',
  rental_trips: 'rentalTrips',
  invoices: 'invoices',
  maintenance_records: 'maintenanceRecords',
  issues: 'issues',
  payment_attempts: 'paymentAttempts',
  plans: 'plans',
  subscriptions: 'subscriptions',
  platform_revenue: 'platformRevenue',
  payment_events: 'paymentEvents',
  disputes: 'disputes',
  fuel_prices: 'fuelPrices',
  fuel_price_history: 'fuelPriceHistory',
  fuel_price_audit_log: 'fuelPriceAuditLogs',
  ad_configurations: 'adConfigurations',
  riders: 'riders',
  odometer_history: 'odometerHistory',
  platform_settings: 'featureFlags',
  organizations: 'organization',
  payment_settings: 'organization',
};

function getMockStorage() {
  try {
    const { mockStorage } = require('./mockStorage');
    return mockStorage;
  } catch {
    return null;
  }
}

function getMockData(table: string, filters: Map<string, any>): any[] {
  const ms = getMockStorage();
  if (!ms) return [];

  const stateKey = TABLE_MAP[table];
  if (!stateKey) return [];

  const state = ms.getState();
  let rows = state[stateKey];
  if (!Array.isArray(rows)) rows = rows ? [rows] : [];

  for (const [col, val] of filters) {
    if (col.startsWith('__')) continue;
    const snake = col.replace(/([A-Z])/g, '_$1').toLowerCase();
    rows = rows.filter((r: any) => r[col] === val || r[snake] === val);
  }

  return rows;
}

function applyWrite(table: string, op: 'insert' | 'update' | 'upsert', data: any, filters?: Map<string, any>) {
  const ms = getMockStorage();
  if (!ms) return;

  const stateKey = TABLE_MAP[table];
  if (!stateKey) return;

  const state = ms.getState();
  const rows = Array.isArray(state[stateKey]) ? [...(state[stateKey] as any[])] : state[stateKey] ? [state[stateKey]] : [];

  if (op === 'insert') {
    const row = Array.isArray(data) ? data : [data];
    rows.push(...row);
  } else if (op === 'update' || op === 'upsert') {
    for (let i = 0; i < rows.length; i++) {
      let match = true;
      if (filters) {
        for (const [col, val] of filters) {
          if (col.startsWith('__')) continue;
          const snake = col.replace(/([A-Z])/g, '_$1').toLowerCase();
          if (rows[i][col] !== val && rows[i][snake] !== val) { match = false; break; }
        }
      }
      if (match) {
        const normalized: Record<string, any> = {};
        for (const [k, v] of Object.entries(data)) {
          normalized[k] = v;
          const camel = k.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
          normalized[camel] = v;
        }
        rows[i] = { ...rows[i], ...normalized };
      }
    }
  }

  const newState = { ...state, [stateKey]: rows };
  ms.saveStore(newState);
}

function createEmptyProxy(): SupabaseClient {
  const buildChain = (tableName?: string, filters?: Map<string, any>) => {
    const f = filters || new Map();
    let returnsSingle = false;
    let returnsMaybeSingle = false;
    let orderCol: string | null = null;
    let orderAsc = true;
    let limitN: number | null = null;
    let pendingData: any = null;
    let pendingOp: 'insert' | 'update' | 'upsert' | null = null;

    const chainObj = new Proxy({}, {
      get(_t, prop) {
        if (prop === 'then') {
          return (resolve: any) => {
            if (pendingOp && tableName && pendingData) {
              applyWrite(tableName, pendingOp, pendingData, f);
              pendingData = null;
              pendingOp = null;
            }
            if (!tableName) return resolve({ data: null, error: null });
            let rows = getMockData(tableName, f);
            if (orderCol) {
              const key = orderCol.replace(/([A-Z])/g, '_$1').toLowerCase();
              rows = [...rows].sort((a: any, b: any) => {
                const av = a[orderCol!] ?? a[key];
                const bv = b[orderCol!] ?? b[key];
                return orderAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
              });
            }
            if (limitN !== null) rows = rows.slice(0, limitN);
            if (returnsSingle || returnsMaybeSingle) return resolve({ data: rows[0] || null, error: null });
            return resolve({ data: rows, error: null });
          };
        }
        if (prop === 'auth') {
          return {
            getUser: async () => ({ data: { user: null }, error: null }),
            getSession: async () => ({ data: { session: null }, error: null }),
          };
        }
        if (prop === 'select') return (_cols?: string) => chainObj;
        if (prop === 'eq') return (col: string, val: any) => { f.set(col, val); return chainObj; };
        if (prop === 'neq') return () => chainObj;
        if (prop === 'single') return () => { returnsSingle = true; return chainObj; };
        if (prop === 'maybeSingle') return () => { returnsMaybeSingle = true; return chainObj; };
        if (prop === 'order') return (col: string, opts?: { ascending?: boolean }) => { orderCol = col; orderAsc = opts?.ascending !== false; return chainObj; };
        if (prop === 'limit') return (n: number) => { limitN = n; return chainObj; };
        if (prop === 'range') return () => chainObj;
        if (prop === 'insert') return (data: any) => { pendingData = data; pendingOp = 'insert'; return chainObj; };
        if (prop === 'update') return (data: any) => { pendingData = data; pendingOp = 'update'; return chainObj; };
        if (prop === 'upsert') return (data: any, _opts?: any) => { pendingData = data; pendingOp = 'upsert'; return chainObj; };
        if (prop === 'delete') return () => chainObj;
        if (prop === 'in') return () => chainObj;
        if (prop === 'is') return () => chainObj;
        if (prop === 'like' || prop === 'ilike') return () => chainObj;
        if (prop === 'gt' || prop === 'gte' || prop === 'lt' || prop === 'lte') return () => chainObj;
        return new Proxy(() => buildChain(tableName, f), {});
      },
    });
    return chainObj;
  };

  const rootHandler: ProxyHandler<any> = {
    get(_t, prop) {
      if (prop === 'then') return undefined;
      if (prop === 'auth') {
        return {
          getUser: async () => ({ data: { user: null }, error: null }),
          getSession: async () => ({ data: { session: null }, error: null }),
        };
      }
      if (prop === 'channel') return (_name: string) => new Proxy({}, { get: () => new Proxy(() => ({}), { get: () => () => ({}) }) });
      if (prop === 'removeChannel') return async () => ({});
      if (typeof prop === 'string') {
        return new Proxy(() => buildChain(prop), rootHandler);
      }
      return new Proxy(() => buildChain(), rootHandler);
    },
  };

  return new Proxy({} as SupabaseClient, rootHandler);
}

let client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (!client) {
    client = isSupabaseConfigured
      ? createSupabaseClient(url, anonKey)
      : createEmptyProxy();
  }
  return client;
}
