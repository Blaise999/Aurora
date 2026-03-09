// src/lib/db/supabase-browser.js — Client-side Supabase for realtime
import { createClient } from '@supabase/supabase-js';

let _client = null;

export function getSupabaseBrowser() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.warn('[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return null;
  }

  _client = createClient(url, anonKey, {
    realtime: { params: { eventsPerSecond: 10 } },
  });

  return _client;
}
