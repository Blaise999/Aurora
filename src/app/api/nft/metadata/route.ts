import { NextResponse } from "next/server";
import { alchemyGet, normalizeSingleNft, pickImage, ipfsToHttp } from "@/lib/alchemy/nft";
import { defaultChainId } from "@/lib/alchemy/chains";

export const runtime = "nodejs";

/**
 * GET /api/nft/metadata?contractAddress=0x...&contract=0x...&tokenId=123&nftId=5&chainId=8453
 * Returns full metadata for a single NFT (Alchemy getNFTMetadata v3).
 * Also merges price/fee data from Supabase nft_prices table.
 * Accepts both 'contractAddress'/'contract' and 'tokenId'/'nftId' for compat.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const contractAddress =
      searchParams.get("contractAddress") ||
      searchParams.get("contract") ||
      "";
    const tokenId =
      searchParams.get("tokenId") ||
      searchParams.get("nftId") ||
      "";
    const refreshCache = searchParams.get("refreshCache") || undefined;
    const chainId = parseInt(
      searchParams.get("chainId") || String(defaultChainId()),
      10
    );

    // Try to get price data from DB first (even without Alchemy data)
    let priceData: any = null;
    try {
      const { getSupabase } = await import("@/lib/db/supabase");
      const sb = getSupabase();
      const lookupId = searchParams.get("nftId") || tokenId;
      const { data } = await sb
        .from("nft_prices")
        .select("price_eth, minting_fee_eth, is_listed, name")
        .eq("nft_id", lookupId)
        .maybeSingle();
      if (data) priceData = data;
    } catch {
      // DB not configured or table missing
    }

    // If we have both contractAddress and tokenId, fetch from Alchemy
    if (contractAddress && tokenId) {
      const payload = await alchemyGet(
        "getNFTMetadata",
        { contractAddress, tokenId, refreshCache },
        chainId
      );

      const raw = payload?.nft ?? payload;
      const image = pickImage(raw) || "";
      const nft = {
        contractAddress: raw?.contract?.address || contractAddress,
        tokenId: String(raw?.tokenId ?? tokenId),
        name: raw?.name || raw?.contract?.name || `#${tokenId}`,
        description: raw?.description || "",
        image: image,
        collection:
          raw?.contract?.name ||
          raw?.contract?.openSeaMetadata?.collectionName ||
          "Unknown Collection",
        attributes: raw?.raw?.metadata?.attributes || raw?.metadata?.attributes || [],
        tokenType: raw?.tokenType || raw?.contract?.tokenType || "ERC721",
        source: "alchemy",
        raw: raw,
        // Merge price data if available
        price_eth: priceData?.price_eth || null,
        minting_fee_eth: priceData?.minting_fee_eth || null,
      };

      return NextResponse.json({
        nft,
        pricing: priceData,
      });
    }

    // If only nftId, return price data + local info
    if (tokenId && priceData) {
      return NextResponse.json({
        nft: {
          tokenId,
          nftId: tokenId,
          name: priceData.name || `NFT #${tokenId}`,
          price_eth: priceData.price_eth,
          minting_fee_eth: priceData.minting_fee_eth,
          is_listed: priceData.is_listed,
        },
        pricing: priceData,
      });
    }

    return NextResponse.json(
      { error: "Missing contractAddress/tokenId or nftId" },
      { status: 400 }
    );
  } catch (e: any) {
    console.error("[/api/nft/metadata]", e);
    return NextResponse.json(
      { error: e?.message || "Failed" },
      { status: 500 }
    );
  }
}
