import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Use `any` as the Database generic to avoid `never` type errors
// on tables that aren't defined in a generated schema file.
let serviceClient: SupabaseClient<any> | null = null;

export function getServiceSupabase(): SupabaseClient<any> {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) environment variable"
    );
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
  }

  if (!serviceClient) {
    serviceClient = createClient<any>(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return serviceClient;
}