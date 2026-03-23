import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 10; // ISR cache for 10 seconds

/**
 * GET /api/activity/live
 *
 * Public endpoint — no auth required.
 * Returns the most recent mints + purchases across ALL users
 * for the live activity feed on the home page.
 */
export async function GET() {
  try {
    const { getSupabase } = await import("@/lib/db/supabase");
    const sb = getSupabase();

    // Fetch recent transactions (both mints and buys)
    const { data: txRows, error: txError } = await sb
      .from("transactions")
      .select(
        "id, wallet_address, tx_type, tx_hash, chain_id, contract_address, token_id, amount_eth, status, metadata, created_at"
      )
      .in("status", ["confirmed"])
      .order("created_at", { ascending: false })
      .limit(20);

    if (txError) {
      console.error("live activity query error:", txError);
    }

    // Also get recent wallet_mints for create-mints that may not be in transactions yet
    const { data: mintRows, error: mintError } = await sb
      .from("wallet_mints")
      .select(
        "id, wallet_address, chain_id, contract_address, token_id, tx_hash, total_paid_eth, snapshot_name, snapshot_image, status, minted_at"
      )
      .eq("status", "confirmed")
      .order("minted_at", { ascending: false })
      .limit(20);

    if (mintError) {
      console.error("live activity mint query error:", mintError);
    }

    const events: any[] = [];
    const seenKeys = new Set<string>();

    function truncWallet(addr: string) {
      if (!addr || addr.length < 10) return addr || "???";
      if (addr.includes("@")) return addr.split("@")[0] + "...";
      return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    }

    function timeAgo(dateStr: string) {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "just now";
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    }

    // Process transactions
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

    // Process wallet_mints (fill gaps)
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
