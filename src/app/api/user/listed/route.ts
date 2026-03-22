import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/user/listed
 * Returns all NFTs the logged-in user has created/minted.
 */
export async function GET(req: Request) {
  try {
    const { getSessionData } = await import("@/lib/auth/session");
    const { getSupabase } = await import("@/lib/db/supabase");
    const sb = getSupabase();

    const session = await getSessionData();

    if (!session?.email && !session?.profileId) {
      return NextResponse.json(
        { error: "Unauthorized", nfts: [] },
        { status: 401 }
      );
    }

    let profileId: number | null = session.profileId
      ? Number(session.profileId)
      : null;

    if (!profileId && session.email) {
      const { data: prof } = await sb
        .from("profiles")
        .select("id")
        .eq("email", session.email)
        .maybeSingle();

      if (prof?.id) profileId = Number(prof.id);
    }

    if (!profileId) {
      return NextResponse.json(
        { error: "Profile not found", nfts: [] },
        { status: 404 }
      );
    }

    const { data, error } = await sb
      .from("user_listed")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("user_listed query error:", error);
      return NextResponse.json(
        { error: error.message, nfts: [] },
        { status: 500 }
      );
    }

    const nfts = (data || []).map((item: any) => ({
      id: item.id,
      profile_id: item.profile_id,
      wallet_address: item.wallet_address,
      chain_id: item.chain_id,
      contract_address: item.contract_address,
      token_id: item.token_id,
      name: item.name || `#${item.token_id}`,
      description: item.description || "",
      collection: item.collection || "User Created",
      image_url: item.image_url || "",
      external_url: item.external_url || "",
      attributes: item.attributes || [],
      token_type: item.token_type || "ERC721",
      chain: item.chain || "Base",
      tx_hash: item.tx_hash || "",
      mint_fee_eth: parseFloat(item.mint_fee_eth || 0),
      listing_price_eth: parseFloat(item.listing_price_eth || 0),
      status: item.status || "confirmed",
      created_at: item.created_at,

      // Aliases for frontend compat
      contractAddress: item.contract_address,
      tokenId: item.token_id,
      chainId: item.chain_id,
      image: item.image_url || "",
      collection_name: item.collection || "User Created",
      nft_name: item.name || `#${item.token_id}`,
      price: parseFloat(item.listing_price_eth || 0),
    }));

    return NextResponse.json({
      nfts,
      count: nfts.length,
      profileId,
    });
  } catch (e: any) {
    console.error("user/listed error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed", nfts: [] },
      { status: 500 }
    );
  }
}
