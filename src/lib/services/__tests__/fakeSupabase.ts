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

  or(str: string) {
    this.orFilters = str.split(',').map(part => {
      const [, col, val] = part.match(/(\w+)\.eq\.(.*)/) || [];
      return { col, val };
    });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, desc: opts?.ascending === false };
    return this;
  }

  insert(row: Row) {
    this.kind = 'insert';
    this.payload = row;
    this.executed = this.doInsert();
    return this;
  }

  upsert(row: Row, opts?: { onConflict?: string }) {
    this.kind = 'upsert';
    this.payload = row;
    this.onConflict = opts?.onConflict ?? null;
    this.executed = this.doUpsert();
    return this;
  }

  update(row: Row) {
    this.kind = 'update';
    this.payload = row;
    return this;
  }

  private applyFilters(rows: Row[]): Row[] {
    let out = rows;
    for (const [col, val] of this.filters) {
      if (Array.isArray(val)) out = out.filter(r => val.map(String).includes(String(r[col])));
      else out = out.filter(r => matchesEq(r, col, val));
    }
    if (this.orFilters.length) out = out.filter(r => matchesOr(r, this.orFilters));
    return out;
  }

  private doSelect(): Promise<{ data: Row[]; count: number; error: null }> {
    const table = fakeStore.ensure(this.table);
    let rows = this.applyFilters(table);
    if (this.orderBy) {
      rows = [...rows].sort((a, b) => {
        const av = a[this.orderBy!.col];
        const bv = b[this.orderBy!.col];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return this.orderBy!.desc ? -cmp : cmp;
      });
    }
    return Promise.resolve({ data: rows, count: rows.length, error: null });
  }

  private doInsert(): Promise<{ data: Row[]; error: null }> {
    const table = fakeStore.ensure(this.table);
    const row = this.payload as Row;
    table.push(row);
    return Promise.resolve({ data: [row], error: null });
  }

  private doUpdate(): Promise<{ data: Row[]; error: null }> {
    const table = fakeStore.ensure(this.table);
    const updated = this.applyFilters(table).map(r => Object.assign(r, this.payload));
    return Promise.resolve({ data: updated, error: null });
  }

  private doUpsert(): Promise<{ data: Row[]; error: null }> {
    const table = fakeStore.ensure(this.table);
    const row = this.payload as Row;
    const keys = this.onConflict ? this.onConflict.split(',').map(k => k.trim()) : null;
    let existing: Row | undefined;
    if (keys) {
      existing = table.find(r => keys.every(k => matchesEq(r, k, row[k])));
    } else if (row.id != null) {
      existing = table.find(r => matchesEq(r, 'id', row.id));
    }
    if (existing) Object.assign(existing, row);
    else table.push(row);
    return Promise.resolve({ data: [existing ?? row], error: null });
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
    auth: {
      async getUser() {
        return { data: { user: null }, error: null };
      },
    },
  };
}
