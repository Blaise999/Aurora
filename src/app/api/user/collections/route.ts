import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/user/collections/[id]
 * Returns one NFT assigned to the logged-in user's collection
 */
export async function GET(
  _req: Request,
  context: { params: { id: string } }
) {
  try {
    const rowId = context?.params?.id;

    if (!rowId) {
      return NextResponse.json(
        { error: "Missing collection id" },
        { status: 400 }
      );
    }

    const { getSessionData } = await import("@/lib/auth/session");
    const session = await getSessionData();
    const profileId = session?.profileId ? Number(session.profileId) : null;

    if (!profileId) {
      return NextResponse.json(
        { error: "Unauthorized or no profile session" },
        { status: 401 }
      );
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
      .eq("id", Number(rowId))
      .eq("profile_id", profileId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "NFT not found" },
        { status: 404 }
      );
    }

    const item = data as any;
    const cn = item.cached_nfts as any;
    const pricing = Array.isArray(cn?.nft_pricing)
      ? (cn.nft_pricing[0] ?? {})
      : (cn?.nft_pricing ?? {});

    const nft = {
      id: item.id,
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

      // old aliases
      contractAddress: item.contract_address,
      tokenId: item.token_id,
      chainId: item.chain_id,
      image: item.image_url ?? cn?.image_url ?? "",
      assignedAt: item.assigned_at,
      assignedBy: item.assigned_by,
      mintPrice: item.nft_price_eth ?? pricing?.mint_price_eth ?? "0.002",
      mintFee: item.mint_fee_eth ?? pricing?.mint_fee_eth ?? "0.001",
      source: "collection",

      route_id: item.id,
      composite_id: `${item.contract_address}_${item.token_id}`,
    };

    return NextResponse.json({ nft });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to fetch NFT" },
      { status: 500 }
    );
  }
}