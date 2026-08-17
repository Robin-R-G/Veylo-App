import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const isSupabaseConfigured = url !== 'https://placeholder.supabase.co' && anonKey !== 'placeholder';

const EMPTY_RESULT = { data: [], error: null };

function createEmptyProxy(): SupabaseClient {
  const chainable = () => {
    const obj: any = {};
    const handler: ProxyHandler<any> = {
      get(_t, prop) {
        if (prop === 'then') return (resolve: any) => resolve(EMPTY_RESULT);
        if (prop === 'auth') {
          return {
            getUser: async () => ({ data: { user: null }, error: null }),
            getSession: async () => ({ data: { session: null }, error: null }),
          };
        }
        return new Proxy(() => chainable(), handler);
      },
    };
    return new Proxy(obj, handler);
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
      return new Proxy(() => chainable(), rootHandler);
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
