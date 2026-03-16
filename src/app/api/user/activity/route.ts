import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/user/activity
 * Returns real activity from transactions + user_collections for the logged-in user.
 */
export async function GET() {
  try {
    const { getSessionData } = await import("@/lib/auth/session");
    const { getSupabase } = await import("@/lib/db/supabase");

    const session = await getSessionData();
    const profileId = session?.profileId ? Number(session.profileId) : null;
    const wallet = session?.wallet?.toLowerCase() || null;

    if (!profileId) {
      return NextResponse.json({ error: "Unauthorized", activities: [] }, { status: 401 });
    }

    const sb = getSupabase();

    // Fetch from transactions table
    const { data: txRows, error: txError } = await sb
      .from("transactions")
      .select("id, tx_type, tx_hash, chain_id, contract_address, token_id, amount_eth, status, metadata, created_at")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (txError) {
      console.error("transactions query error:", txError);
    }

    // Also fetch from user_collections for assigned items (not from tx)
    const { data: collRows, error: collError } = await sb
      .from("user_collections")
      .select("id, nft_name, name, collection, contract_address, token_id, assigned_by, assigned_at, total_value_eth, image_url")
      .eq("profile_id", profileId)
      .order("assigned_at", { ascending: false })
      .limit(50);

    if (collError) {
      console.error("user_collections query error:", collError);
    }

    // Merge and deduplicate
    const activities: any[] = [];
    const seenKeys = new Set<string>();

    // Transactions first (most authoritative)
    for (const tx of (txRows || [])) {
      const key = `tx-${tx.tx_hash || tx.id}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const meta = tx.metadata || {};
      activities.push({
        id: tx.id,
        type: tx.tx_type || "mint",
        title: meta.nft_name || meta.nftName || `Token #${tx.token_id}`,
        subtitle: meta.collection || "Collection",
        image: meta.image_url || null,
        amount_eth: tx.amount_eth || 0,
        tx_hash: tx.tx_hash || null,
        contract_address: tx.contract_address,
        token_id: tx.token_id,
        chain_id: tx.chain_id,
        status: tx.status,
        time: tx.created_at,
        source: "transaction",
      });
    }

    // Collection assignments that don't have a matching transaction
    for (const c of (collRows || [])) {
      const key = `coll-${c.contract_address}-${c.token_id}`;
      // Check if we already have a tx for this NFT
      const hasTx = activities.some(
        (a) => a.contract_address === c.contract_address && a.token_id === c.token_id
      );
      if (hasTx) continue;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      activities.push({
        id: c.id,
        type: c.assigned_by?.startsWith("admin") ? "admin_assign" : c.assigned_by === "purchase" ? "mint" : "assigned",
        title: c.nft_name || c.name || `Token #${c.token_id}`,
        subtitle: c.collection || "Collection",
        image: c.image_url || null,
        amount_eth: c.total_value_eth || 0,
        tx_hash: null,
        contract_address: c.contract_address,
        token_id: c.token_id,
        chain_id: null,
        status: "confirmed",
        time: c.assigned_at,
        source: "collection",
      });
    }

    // Sort by time descending
    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return NextResponse.json({ activities, count: activities.length });
  } catch (e: any) {
    console.error("user/activity error:", e);
    return NextResponse.json({ error: e?.message || "Failed", activities: [] }, { status: 500 });
  }
}
