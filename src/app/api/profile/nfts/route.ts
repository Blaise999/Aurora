import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabase } from "@/lib/db/supabase";

export const runtime = "nodejs";

export async function GET() {
  try {
    const wallet = await getSession();
    if (!wallet) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const sb = getSupabase();

    // First try wallet_mints (new system)
    const { data: mints } = await sb.from("wallet_mints").select("*")
      .eq("wallet_address", wallet.toLowerCase()).eq("status", "confirmed")
      .order("minted_at", { ascending: false });

    // Also get legacy user_nfts
    const { data: legacy } = await sb.from("user_nfts").select("*")
      .eq("owner_address", wallet.toLowerCase()).eq("status", "confirmed")
      .order("minted_at", { ascending: false });

    const enriched: any[] = [];
    const seen = new Set<string>();

    // Wallet mints (snapshot data)
    for (const m of mints || []) {
      const key = `${m.contract_address}_${m.token_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      enriched.push({
        id: key, contractAddress: m.contract_address, tokenId: m.token_id,
        name: m.snapshot_name || `NFT #${m.token_id}`,
        chain: m.chain_id === 8453 ? "Base" : "Base Sepolia",
        collectionName: "AuroraNft", hasMedia: Boolean(m.snapshot_image),
        normalized_metadata: { image: m.snapshot_image },
        description: m.snapshot_desc || "",
        price: m.mint_price_eth ? `${m.mint_price_eth} ETH` : "—",
        lastSale: "—", txHash: m.tx_hash, mintedAt: m.minted_at,
      });
    }

    // Legacy user_nfts
    for (const nft of legacy || []) {
      const key = `${nft.contract_address}_${nft.token_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const { data: meta } = await sb.from("nft_metadata_cache").select("name, description, image_url")
        .eq("chain_id", nft.chain_id).eq("contract_address", nft.contract_address).eq("token_id", nft.token_id).maybeSingle();
      enriched.push({
        id: key, contractAddress: nft.contract_address, tokenId: nft.token_id,
        name: meta?.name || `NFT #${nft.token_id}`, chain: nft.chain_id === 8453 ? "Base" : "Base Sepolia",
        collectionName: "AuroraNft", hasMedia: Boolean(meta?.image_url),
        normalized_metadata: { image: meta?.image_url }, description: meta?.description || "",
        price: "—", lastSale: "—", txHash: nft.tx_hash, mintedAt: nft.minted_at,
      });
    }

    return NextResponse.json({ nfts: enriched });
  } catch (e: any) {
    console.error("Profile nfts error:", e);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
