import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/nft/cached?limit=50&collection=name&contract=addr&tokenId=id&shuffle=true
 * All frontend NFT displays use this. Never calls Alchemy.
 */
export async function GET(request) {
  try {
    const { getServiceSupabase } = await import("@/lib/supabase");
    const sb = getServiceSupabase();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 300);
    const collection = searchParams.get("collection");
    const contract = searchParams.get("contract");
    const tokenId = searchParams.get("tokenId");
    const shuffle = searchParams.get("shuffle") !== "false";

    // Single NFT fetch
    if (contract && tokenId) {
      const { data } = await sb.from("cached_nfts").select("*, nft_pricing(mint_price_eth, mint_fee_eth, is_featured, is_listed)")
        .eq("contract_address", contract.toLowerCase()).eq("token_id", tokenId).maybeSingle();
      if (!data) return NextResponse.json({ nft: null });
      return NextResponse.json({ nft: formatNft(data) });
    }

    let query = sb.from("cached_nfts").select("*, nft_pricing(mint_price_eth, mint_fee_eth, is_featured, is_listed)")
      .eq("is_active", true).not("image_url", "is", null).neq("image_url", "")
      .order("synced_at", { ascending: false }).limit(limit);
    if (collection) query = query.ilike("collection_name", `%${collection}%`);
    if (contract) query = query.eq("contract_address", contract.toLowerCase());

    const { data, error } = await query;
    if (error) throw error;
    let nfts = (data || []).map(formatNft);
    if (shuffle && nfts.length > 1) {
      for (let i = nfts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [nfts[i], nfts[j]] = [nfts[j], nfts[i]]; }
    }
    return NextResponse.json({ nfts, total: nfts.length, source: "cache" },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } });
  } catch (e) {
    console.error("[/api/nft/cached]", e);
    return NextResponse.json({ error: e?.message, nfts: [] }, { status: 500 });
  }
}

function formatNft(row) {
  const pricing = Array.isArray(row.nft_pricing) ? row.nft_pricing[0] : row.nft_pricing;
  return {
    id: `${row.contract_address}_${row.token_id}`, dbId: row.id,
    contractAddress: row.contract_address, tokenId: row.token_id,
    name: row.name || `#${row.token_id}`, description: row.description || "",
    image: row.image_url || "", collection: row.collection_name || "Collection",
    chain: row.chain_id === 8453 ? "Base" : row.chain_id === 1 ? "Ethereum" : "Base Sepolia",
    chainId: row.chain_id, tokenType: row.token_type || "ERC721",
    attributes: row.attributes || [], syncedAt: row.synced_at,
    mintPrice: pricing?.mint_price_eth ? String(pricing.mint_price_eth) : "0.002",
    mintFee: pricing?.mint_fee_eth ? String(pricing.mint_fee_eth) : "0.001",
    isFeatured: pricing?.is_featured || false, isListed: pricing?.is_listed !== false,
    source: "cache",
  };
}
