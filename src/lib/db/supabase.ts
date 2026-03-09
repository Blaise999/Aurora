import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using service role key (bypasses RLS)
function requireEnv(name: string, ...fallbacks: string[]) {
  const v = process.env[name];
  if (v) return v;
  for (const fb of fallbacks) {
    const fv = process.env[fb];
    if (fv) return fv;
  }
  throw new Error(`Missing env: ${name}`);
}

let _client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (_client) return _client;
  _client = createClient(
    requireEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );
  return _client;
}
