import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Public client (browser-safe)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service client (server-side only — used in API routes)
let _serviceClient = null;
export function getServiceSupabase() {
  if (_serviceClient) return _serviceClient;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  _serviceClient = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  return _serviceClient;
}
