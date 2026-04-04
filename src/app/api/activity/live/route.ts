import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 10; // ISR cache for 10 seconds

/**
 * GET /api/activity/live
 *
 * Public endpoint — no auth required.
 * Returns the most recent mints + purchases across ALL users
 * for the live activity feed on the home page.
 *
 * FIXED: TypeScript errors on 'assigned_at' by using .select('*')
 *        → Supabase types now see the full table row (including assigned_at, purchased_at, etc.)
 *        → Real prices from nft_price_eth / total_value_eth (no more 0.0000 ETH)
 *        → Seeded activities pulled live from user_listed + user_collections every request
 */
export async function GET() {
  try {
    const { getSupabase } = await import("@/lib/db/supabase");
    const sb = getSupabase();

    // =============================================
    // 1. Real on-chain transactions (mint + buy)
    // =============================================
    const { data: txRows, error: txError } = await sb
      .from("transactions")
      .select(
        "id, wallet_address, tx_type, tx_hash, chain_id, contract_address, token_id, amount_eth, status, metadata, created_at"
      )
      .in("status", ["confirmed"])
      .order("created_at", { ascending: false })
      .limit(20);

    if (txError) console.error("live activity query error:", txError);

    // =============================================
    // 2. wallet_mints (fresh mints not yet in transactions)
    // =============================================
    const { data: mintRows, error: mintError } = await sb
      .from("wallet_mints")
      .select(
        "id, wallet_address, chain_id, contract_address, token_id, tx_hash, total_paid_eth, snapshot_name, snapshot_image, status, minted_at"
      )
      .eq("status", "confirmed")
      .order("minted_at", { ascending: false })
      .limit(20);

    if (mintError) console.error("live activity mint query error:", mintError);

    // =============================================
    // 3. SEEDED MINTED NFTs → user_listed (real prices)
    //    Using .select('*') to fix TS error on assigned_at
    // =============================================
    const { data: listedRows, error: listedError } = await sb
      .from("user_listed")
      .select("*") // ← FULL ROW so TypeScript sees assigned_at + all price fields
      .order("assigned_at", { ascending: false })
      .limit(15);

    if (listedError) {
      console.error("live activity user_listed query error:", listedError);
    }

    // =============================================
    // 4. BOUGHT NFTs → user_collections (real prices)
    //    Using .select('*') to fix any potential TS issues
    // =============================================
    const { data: collectedRows, error: collectedError } = await sb
      .from("user_collections")
      .select("*") // ← FULL ROW so TypeScript sees purchased_at / assigned_at + prices
      .order("purchased_at", { ascending: false })
      .limit(10);

    if (collectedError) {
      console.error("live activity user_collections query error:", collectedError);
    }

    const events: any[] = [];
    const seenKeys = new Set<string>();

    function truncWallet(addr: string) {
      if (!addr || addr.length < 10) return addr || "???";
      if (addr.includes("@")) return addr.split("@")[0] + "...";
      return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    }

    function timeAgo(dateStr: string | null | undefined) {
      if (!dateStr) return "just now";
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "just now";
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    }

    // Profile → short wallet map (for seeded data that only has profile_id)
    const profileToWallet: Record<number, string> = {
      3719: "0x00da...d873",
      8: "0xfa3b...6873",
      12: "0xb7f7...f6",
      11: "0x524c...a048",
    };

    // =============================================
    // Process real transactions
    // =============================================
    for (const tx of txRows || []) {
      const key = tx.tx_hash || `tx-${tx.id}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const meta = (tx.metadata as Record<string, any>) || {};
      const action =
        tx.tx_type === "create_mint"
          ? "minted"
          : tx.tx_type === "buy"
          ? "bought"
          : "minted";

      events.push({
        id: key,
        wallet: truncWallet(tx.wallet_address),
        action,
        nft: meta.nft_name || meta.name || `Token #${tx.token_id}`,
        image: meta.image_url || meta.image || null,
        amount: tx.amount_eth
          ? `${parseFloat(String(tx.amount_eth)).toFixed(4)} ETH`
          : null,
        time: timeAgo(tx.created_at),
        timestamp: tx.created_at,
      });
    }

    // =============================================
    // Process wallet_mints
    // =============================================
    for (const m of mintRows || []) {
      const key = m.tx_hash || `mint-${m.id}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      events.push({
        id: key,
        wallet: truncWallet(m.wallet_address),
        action: "minted",
        nft: m.snapshot_name || `Token #${m.token_id}`,
        image: m.snapshot_image || null,
        amount: m.total_paid_eth
          ? `${parseFloat(String(m.total_paid_eth)).toFixed(4)} ETH`
          : null,
        time: timeAgo(m.minted_at),
        timestamp: m.minted_at,
      });
    }

    // =============================================
    // Process SEEDED minted NFTs from user_listed (REAL PRICES)
    // =============================================
    for (const listed of listedRows || []) {
      const key = `listed-${listed.id}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const wallet = profileToWallet[listed.profile_id] || "0x????...????";

      events.push({
        id: key,
        wallet,
        action: "minted",
        nft: listed.nft_name || `${listed.collection || "NFT"}`,
        image: null,
        amount: listed.total_value_eth
          ? `${parseFloat(String(listed.total_value_eth)).toFixed(4)} ETH`
          : `${parseFloat(String(listed.nft_price_eth || 0)).toFixed(4)} ETH`,
        time: timeAgo(listed.assigned_at),
        timestamp: listed.assigned_at,
      });
    }

    // =============================================
    // Process bought NFTs from user_collections (REAL PRICES)
    // =============================================
    for (const coll of collectedRows || []) {
      const key = `collected-${coll.id}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      const wallet = profileToWallet[coll.profile_id] || "0x????...????";

      events.push({
        id: key,
        wallet,
        action: "bought",
        nft: coll.nft_name || `${coll.collection || "NFT"}`,
        image: null,
        amount: coll.total_value_eth
          ? `${parseFloat(String(coll.total_value_eth)).toFixed(4)} ETH`
          : `${parseFloat(String(coll.nft_price_eth || 0)).toFixed(4)} ETH`,
        time: timeAgo(coll.purchased_at || coll.assigned_at),
        timestamp: coll.purchased_at || coll.assigned_at || new Date().toISOString(),
      });
    }

    // Sort newest first
    events.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({
      events: events.slice(0, 20),
      count: events.length,
    });
  } catch (e: any) {
    console.error("live activity error:", e);
    return NextResponse.json({ events: [], error: e?.message }, { status: 500 });
  }
}