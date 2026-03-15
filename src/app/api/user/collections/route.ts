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
        id,
        profile_id,
        cached_nft_id,
        chain_id,
        contract_address,
        token_id,
        assigned_at,
        assigned_by,
        nft_price_eth,
        mint_fee_eth,
        total_value_eth,
        pricing_source,
        attributes,
        collection,
        description,
        name,
        image_url,
        nft_name,
        token_type,
        chain,
        cached_nfts:cached_nft_id (
          id,
          name,
          description,
          image_url,
          collection_name,
          token_type,
          attributes,
          nft_pricing (mint_price_eth, mint_fee_eth, is_featured, is_listed)
        )
      `)
      .eq("profile_id", parseInt(profileId))
      .order("assigned_at", { ascending: false });

    if (error) throw error;

    const nfts = (data || []).map((item: any) => {
      const cn = item.cached_nfts;
      const pricing = Array.isArray(cn?.nft_pricing)
        ? (cn.nft_pricing[0] || {})
        : (cn?.nft_pricing || {});

      return {
        // KEEP THE REAL DB ROW ID
        id: item.id,

        // optional extra aliases
        profile_id: item.profile_id,
        cached_nft_id: item.cached_nft_id,

        chain_id: item.chain_id,
        contract_address: item.contract_address,
        token_id: item.token_id,
        assigned_at: item.assigned_at,
        assigned_by: item.assigned_by,

        nft_price_eth: item.nft_price_eth ?? pricing?.mint_price_eth ?? null,
        mint_fee_eth: item.mint_fee_eth ?? pricing?.mint_fee_eth ?? null,
        total_value_eth:
          item.total_value_eth ??
          (
            Number(item.nft_price_eth ?? pricing?.mint_price_eth ?? 0) +
            Number(item.mint_fee_eth ?? pricing?.mint_fee_eth ?? 0)
          ),

        pricing_source: item.pricing_source ?? "collection",

        attributes: item.attributes ?? cn?.attributes ?? [],
        collection: item.collection ?? cn?.collection_name ?? "Collection",
        description: item.description ?? cn?.description ?? "",
        name: item.name ?? cn?.name ?? `#${item.token_id}`,
        image_url: item.image_url ?? cn?.image_url ?? "",
        nft_name: item.nft_name ?? cn?.name ?? `#${item.token_id}`,
        token_type: item.token_type ?? cn?.token_type ?? "ERC-721",
        chain:
          item.chain ??
          (item.chain_id === 8453
            ? "Base"
            : item.chain_id === 1
              ? "Ethereum"
              : item.chain_id === 84532
                ? "Base Sepolia"
                : `Chain ${item.chain_id}`),

        // keep old aliases too if your frontend still uses some of them
        contractAddress: item.contract_address,
        tokenId: item.token_id,
        chainId: item.chain_id,
        image: item.image_url ?? cn?.image_url ?? "",
        assignedAt: item.assigned_at,
        assignedBy: item.assigned_by,
        mintPrice: item.nft_price_eth ?? pricing?.mint_price_eth ?? "0.002",
        mintFee: item.mint_fee_eth ?? pricing?.mint_fee_eth ?? "0.001",
        source: "collection",

        // helpful for debugging if needed
        route_id: item.id,
        composite_id: `${item.contract_address}_${item.token_id}`,
      };
    });

    return NextResponse.json({ nfts, total: nfts.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message, nfts: [] }, { status: 500 });
  }
}