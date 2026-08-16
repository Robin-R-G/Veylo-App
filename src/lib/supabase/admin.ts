import { createClient } from '@supabase/supabase-js';

// Server-only client with the service role key. NEVER import into client
// components, NEVER expose this key with a NEXT_PUBLIC_ prefix.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

export const adminClient = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
