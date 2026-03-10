import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client using service role key (bypasses RLS).
// We use `any` as the Database generic to avoid `never` type errors
// on tables that aren't defined in a generated schema file.
// To get full type safety, generate types with:
//   npx supabase gen types typescript --project-id <id> > src/lib/db/database.types.ts

function requireEnv(name: string, ...fallbacks: string[]) {
  const v = process.env[name];
  if (v) return v;
  for (const fb of fallbacks) {
    const fv = process.env[fb];
    if (fv) return fv;
  }
  throw new Error(`Missing env: ${name}`);
}

let _client: SupabaseClient<any> | null = null;

export function getSupabase(): SupabaseClient<any> {
  if (_client) return _client;
  _client = createClient<any>(
    requireEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );
  return _client;
}
