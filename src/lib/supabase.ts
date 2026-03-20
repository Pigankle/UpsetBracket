import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

console.log('SUPABASE URL:', url);
console.log('SUPABASE ANON KEY:', key?.slice(0, 5));

export const supabase = createClient(url, key, {
  auth: {
    storageKey: 'bracket-pool-auth',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    lock: async (name, acquireTimeout, fn) => {
      // Use a simple non-locking implementation to avoid deadlocks
      return fn();
    },
  },
});
