import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Fetch global minting fee from settings table.
 * Falls back to 0.002 if missing.
 */
async function getSettingsMintFee(sb: any): Promise<string> {
  const { data, error } = await sb
    .from("settings")
    .select("minting_fee")
    .limit(1)
    .single();

  if (error || !data) return "0.002";
  return data.minting_fee || "0.002";
}

/**
 * Fetch cached NFT record so admin assignment can snapshot
 * the same kind of pricing/meta the mint page uses.
 */
async function getCachedNftById(sb: any, cachedNftId: string | number | null) {
  if (!cachedNftId) return null;

  const { data, error } = await sb
    .from("cached_nfts")
    .select("*")
    .eq("id", cachedNftId)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * POST /api/admin/assign-collection
 * Body: { profileId, cachedNftId, chainId, contractAddress, tokenId }
 *
 * Assigns an NFT to a user's collection and stores a price snapshot
 * so portfolio value stays stable even if admin edits NFT prices later.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profileId, cachedNftId, chainId, contractAddress, tokenId } = body;

    if (!profileId || !contractAddress || tokenId === undefined || tokenId === null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { getSupabase } = await import("@/lib/db/supabase");
    const sb = getSupabase();

    const cachedNft = await getCachedNftById(sb, cachedNftId || null);
    const defaultMintFee = await getSettingsMintFee(sb);

    const liveMintFee = parseFloat(
      cachedNft?.mintFee ?? defaultMintFee ?? "0.002"
    );

    const liveNftPrice = parseFloat(
      cachedNft?.mintPrice ?? defaultMintFee ?? "0.002"
    );

    const safeMintFee = Number.isFinite(liveMintFee) ? liveMintFee : 0.002;
    const safeNftPrice = Number.isFinite(liveNftPrice) ? liveNftPrice : 0.002;
    const safeTotalValue = Number((safeNftPrice + safeMintFee).toFixed(6));

    const payload = {
      profile_id: profileId,
      cached_nft_id: cachedNft?.id ?? cachedNftId ?? null,
      chain_id: cachedNft?.chainId ?? chainId ?? 8453,
      contract_address: String(
        cachedNft?.contractAddress ?? contractAddress ?? ""
      ).toLowerCase(),
      token_id: String(cachedNft?.tokenId ?? tokenId ?? ""),
      assigned_by: "admin",
      assigned_at: new Date().toISOString(),

      // metadata snapshot
      image_url: cachedNft?.image ?? cachedNft?.image_url ?? "",
      nft_name: cachedNft?.name ?? "Assigned NFT",
      description: cachedNft?.description ?? "",
      collection: cachedNft?.collection ?? null,
      token_type: cachedNft?.tokenType ?? "ERC-721",
      attributes: cachedNft?.attributes ?? [],

      // price snapshot
      nft_price_eth: safeNftPrice,
      mint_fee_eth: safeMintFee,
      total_value_eth: safeTotalValue,
      pricing_source: "admin_assign",
    };

    const { data, error } = await sb
      .from("user_collections")
      .upsert(payload, {
        onConflict: "profile_id,chain_id,contract_address,token_id",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, assignment: data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/assign-collection
 * Body: { profileId, chainId, contractAddress, tokenId }
 */
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { profileId, chainId, contractAddress, tokenId } = body;

    if (!profileId || !contractAddress || tokenId === undefined || tokenId === null) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { getSupabase } = await import("@/lib/db/supabase");
    const sb = getSupabase();

    const { error } = await sb
      .from("user_collections")
      .delete()
      .eq("profile_id", profileId)
      .eq("chain_id", chainId || 8453)
      .eq("contract_address", String(contractAddress).toLowerCase())
      .eq("token_id", String(tokenId));

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed" },
      { status: 500 }
    );
  }
}