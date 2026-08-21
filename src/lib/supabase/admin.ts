import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-only client with the service role key. NEVER import into client
// components, NEVER expose this key with a NEXT_PUBLIC_ prefix.
let _client: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase admin: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  _client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return _client;
}

// Lazy proxy — only throws when actually called, not at import time
export const adminClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getAdminClient() as any)[prop];
  },
});
