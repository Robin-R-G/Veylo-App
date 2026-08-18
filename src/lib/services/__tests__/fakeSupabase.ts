// In-memory fake of @/lib/supabase/client for unit tests. Chainable builder that
// supports the subset of the supabase-js surface the services use:
//   .from(t).select(c).eq/.in/.or(...).order(...).single()/.maybeSingle()
//   .from(t).insert(row).select().single()
//   .from(t).update(row).eq(...)   .from(t).upsert(row, { onConflict })
// All terminal calls resolve synchronously-backed Promises; no network, ever.
type Row = Record<string, any>;

export const fakeStore = {
  tables: {} as Record<string, Row[]>,
  ensure(table: string) {
    if (!this.tables[table]) this.tables[table] = [];
    return this.tables[table];
  },
  reset() {
    for (const k of Object.keys(this.tables)) this.tables[k] = [];
  },
};

function matchesEq(row: Row, col: string, val: any): boolean {
  return String(row[col]) === String(val);
}

function matchesOr(row: Row, filters: { col: string; val: any }[]): boolean {
  return filters.some(f => matchesEq(row, f.col, f.val));
}

class Query {
  table: string;
  kind: 'select' | 'insert' | 'update' | 'upsert';
  payload: Row | Row[] | null = null;
  onConflict: string | null = null;
  filters: [string, any][] = [];
  orFilters: { col: string; val: any }[] = [];
  orderBy: { col: string; desc: boolean } | null = null;
  limitCount: number | null = null;
  head = false;
  private executed: Promise<{ data: Row[] | null; count?: number; error: null }> | null = null;

  constructor(table: string, kind: 'select' | 'insert' | 'update' | 'upsert' = 'select', payload: Row | Row[] | null = null) {
    this.table = table;
    this.kind = kind;
    this.payload = payload;
  }

  select(cols: string = '*', opts?: { head?: boolean }) {
    if (opts?.head) this.head = true;
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push([col, val]);
    if (this.kind === 'update' && this.executed === null) this.executed = this.doUpdate();
    return this;
  }

  in(col: string, vals: any[]) {
    this.filters.push([col, vals]);
    return this;
  }

  or(filterStr: string) {
    const parts = filterStr.split(',').map(p => p.trim());
    const parsed: { col: string; val: any }[] = [];
    for (const part of parts) {
      const match = part.match(/^([^.]+)\.eq\.(.+)$/);
      if (match) parsed.push({ col: match[1], val: match[2] });
    }
    if (parsed.length) this.orFilters.push(...parsed);
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, desc: opts?.ascending === false };
    return this;
  }

  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  insert(rows: Row | Row[]) {
    return new Query(this.table, 'insert', rows);
  }

  update(row: Row) {
    const q = new Query(this.table, 'update', row);
    q.filters = [...this.filters];
    return q;
  }

  upsert(rows: Row | Row[], opts?: { onConflict?: string }) {
    const q = new Query(this.table, 'upsert', rows);
    q.onConflict = opts?.onConflict ?? null;
    return q;
  }

  private applyFilters(rows: Row[]): Row[] {
    let result = rows;
    for (const [col, val] of this.filters) {
      if (Array.isArray(val)) {
        result = result.filter(r => val.some(v => matchesEq(r, col, v)));
      } else {
        result = result.filter(r => matchesEq(r, col, val));
      }
    }
    if (this.orFilters.length) {
      result = result.filter(r => matchesOr(r, this.orFilters));
    }
    if (this.orderBy) {
      const { col, desc } = this.orderBy;
      result = [...result].sort((a, b) => {
        const va = a[col];
        const vb = b[col];
        if (va < vb) return desc ? 1 : -1;
        if (va > vb) return desc ? -1 : 1;
        return 0;
      });
    }
    if (this.limitCount != null) {
      result = result.slice(0, this.limitCount);
    }
    return result;
  }

  private doSelect(): Promise<{ data: Row[]; count: number; error: null }> {
    const table = fakeStore.ensure(this.table);
    const filtered = this.applyFilters(table);
    return Promise.resolve({ data: filtered, count: filtered.length, error: null });
  }

  private doInsert(): Promise<{ data: Row[]; error: null }> {
    const table = fakeStore.ensure(this.table);
    const rows = Array.isArray(this.payload) ? this.payload : [this.payload!];
    for (const r of rows) {
      if (r && !r.id) r.id = 'row_' + Math.random().toString(36).slice(2, 9);
      table.push(r);
    }
    return Promise.resolve({ data: rows, error: null });
  }

  private doUpdate(): Promise<{ data: Row[]; error: null }> {
    const table = fakeStore.ensure(this.table);
    const updated = this.applyFilters(table).map(r => Object.assign(r, this.payload));
    return Promise.resolve({ data: updated, error: null });
  }

  private doUpsert(): Promise<{ data: Row[]; error: null }> {
    const table = fakeStore.ensure(this.table);
    const rows = Array.isArray(this.payload) ? this.payload : [this.payload as Row];
    const keys = this.onConflict ? this.onConflict.split(',').map(k => k.trim()) : null;
    const upserted: Row[] = [];

    for (const row of rows) {
      let existing: Row | undefined;
      if (keys) {
        existing = table.find(r => keys.every(k => matchesEq(r, k, row[k])));
      } else if (row.id != null) {
        existing = table.find(r => matchesEq(r, 'id', row.id));
      }
      if (existing) {
        Object.assign(existing, row);
        upserted.push(existing);
      } else {
        table.push(row);
        upserted.push(row);
      }
    }
    return Promise.resolve({ data: upserted, error: null });
  }

  private execute(): Promise<{ data: Row[] | null; count?: number; error: null }> {
    if (this.executed) return this.executed;
    if (this.kind === 'insert') this.executed = this.doInsert();
    else if (this.kind === 'upsert') this.executed = this.doUpsert();
    else if (this.kind === 'update') this.executed = this.doUpdate();
    else this.executed = this.doSelect();
    return this.executed;
  }

  single() {
    return this.execute().then(r => ({ data: (r.data ?? [])[0] ?? null, error: r.data?.length ? null : { message: 'no rows' } }));
  }

  maybeSingle() {
    return this.execute().then(r => ({ data: (r.data ?? [])[0] ?? null, error: null }));
  }

  then(resolve: any, reject?: any) {
    const p = this.execute().then(r =>
      this.head ? { data: null, count: r.count, error: null } : { data: r.data ?? [], error: null }
    );
    return reject ? p.then(resolve, reject) : p.then(resolve);
  }
}

export function createFakeClient() {
  return {
    from(table: string) {
      return new Query(table);
    },
    rpc(fn: string, args: any) {
      if (fn === 'admin_update_fuel_rates') {
        const table = fakeStore.ensure('fuel_prices');
        const history = fakeStore.ensure('fuel_price_history');
        const audit = fakeStore.ensure('fuel_price_audit_log');

        const petrolRow = {
          id: 'fp_petrol',
          state: args.p_state,
          district: args.p_district || '',
          city: args.p_city,
          fuel_type: 'PETROL',
          price_per_unit_paise: args.p_petrol_paise,
          price_rupees: args.p_petrol_paise / 100,
          unit: 'LITRE',
          source_name: args.p_source || 'MANUAL_ADMIN',
          status: 'LIVE',
          updated_at: new Date().toISOString(),
        };
        const dieselRow = {
          id: 'fp_diesel',
          state: args.p_state,
          district: args.p_district || '',
          city: args.p_city,
          fuel_type: 'DIESEL',
          price_per_unit_paise: args.p_diesel_paise,
          price_rupees: args.p_diesel_paise / 100,
          unit: 'LITRE',
          source_name: args.p_source || 'MANUAL_ADMIN',
          status: 'LIVE',
          updated_at: new Date().toISOString(),
        };
        const cngRow = {
          id: 'fp_cng',
          state: args.p_state,
          district: args.p_district || '',
          city: args.p_city,
          fuel_type: 'CNG',
          price_per_unit_paise: args.p_cng_paise,
          price_rupees: args.p_cng_paise / 100,
          unit: 'KG',
          source_name: args.p_source || 'MANUAL_ADMIN',
          status: 'LIVE',
          updated_at: new Date().toISOString(),
        };

        table.push(petrolRow, dieselRow, cngRow);
        history.push(petrolRow, dieselRow, cngRow);
        audit.push(
          { event_type: 'FUEL_PRICE_UPDATED', fuel_type: 'PETROL', status: 'SUCCESS' },
          { event_type: 'FUEL_PRICE_UPDATED', fuel_type: 'DIESEL', status: 'SUCCESS' },
          { event_type: 'FUEL_PRICE_UPDATED', fuel_type: 'CNG', status: 'SUCCESS' }
        );

        return Promise.resolve({ data: [petrolRow, dieselRow, cngRow], error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
    channel(name: string) {
      return {
        on() { return this; },
        subscribe(cb?: any) {
          if (cb) cb('SUBSCRIBED');
          return this;
        },
      };
    },
    removeChannel() {},
    auth: {
      async getUser() {
        return { data: { user: null }, error: null };
      },
      async getSession() {
        return { data: { session: null }, error: null };
      },
      async signInWithPassword(params: any) {
        return { data: { user: { id: 'u_fake', email: params?.email } }, error: null };
      },
      async signUp(params: any) {
        return { data: { user: { id: 'u_fake', email: params?.email } }, error: null };
      },
      async signOut() {
        return { error: null };
      },
    },
  };
}
