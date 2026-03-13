import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/user/collections?profileId=X or uses session
 * Returns NFTs assigned to a user's collection
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let profileId = searchParams.get("profileId");

    // If no profileId, use session
    if (!profileId) {
      const { getSessionData } = await import("@/lib/auth/session");
      const session = await getSessionData();
      profileId = session?.profileId ? String(session.profileId) : null;
    }

    if (!profileId) {
      return NextResponse.json({ error: "No profile ID" }, { status: 400 });
    }

    const { getSupabase } = await import("@/lib/db/supabase");
    const sb = getSupabase();

    const { data, error } = await sb
      .from("user_collections")
      .select(`
        id, chain_id, contract_address, token_id, assigned_at, assigned_by,
        cached_nfts:cached_nft_id (
          id, name, description, image_url, collection_name, token_type, attributes,
          nft_pricing (mint_price_eth, mint_fee_eth, is_featured, is_listed)
        )
      `)
      .eq("profile_id", parseInt(profileId))
      .order("assigned_at", { ascending: false });

    if (error) throw error;

    const nfts = (data || []).map((item: any) => {
      const cn = item.cached_nfts;
      const pricing = cn?.nft_pricing?.[0] || cn?.nft_pricing || {};
      return {
        id: `${item.contract_address}_${item.token_id}`,
        contractAddress: item.contract_address,
        tokenId: item.token_id,
        chainId: item.chain_id,
        name: cn?.name || `#${item.token_id}`,
        description: cn?.description || "",
        image: cn?.image_url || "",
        collection: cn?.collection_name || "Collection",
        chain: item.chain_id === 8453 ? "Base" : item.chain_id === 1 ? "Ethereum" : "Base Sepolia",
        mintPrice: pricing?.mint_price_eth ? String(pricing.mint_price_eth) : "0.002",
        mintFee: pricing?.mint_fee_eth ? String(pricing.mint_fee_eth) : "0.001",
        assignedAt: item.assigned_at,
        assignedBy: item.assigned_by,
        source: "collection",
      };
    });

    return NextResponse.json({ nfts, total: nfts.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message, nfts: [] }, { status: 500 });
  }
}
