import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/admin/wallet-names
 * Returns all user profiles with wallet info for admin
 */
export async function GET() {
  try {
    const { getSupabase } = await import("@/lib/db/supabase");
    const sb = getSupabase();

    const { data, error } = await sb
      .from("profiles")
      .select("id, email, first_name, username, wallet_address, created_at, updated_at, is_active")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Enrich with collection + mint counts
    const profiles = await Promise.all(
      (data || []).map(async (p: any) => {
        const { count: collCount } = await sb
          .from("user_collections")
          .select("id", { count: "exact", head: true })
          .eq("profile_id", p.id);

        let mintCount = 0;
        if (p.wallet_address) {
          const { count: mc } = await sb
            .from("wallet_mints")
            .select("id", { count: "exact", head: true })
            .eq("wallet_address", p.wallet_address.toLowerCase());
          mintCount = mc || 0;
        }

        return {
          ...p,
          collectionCount: collCount || 0,
          mintCount,
        };
      })
    );

    return NextResponse.json({ profiles, total: profiles.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message, profiles: [] }, { status: 500 });
  }
}
