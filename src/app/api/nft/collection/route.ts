import { NextResponse } from "next/server";
import { alchemyGet } from "@/lib/alchemy/nft";
import { alchemyOwnedToUi } from "@/lib/alchemy/nft-normalize";
import { defaultChainId } from "@/lib/alchemy/chains";

export const runtime = "nodejs";

/**
 * GET /api/nft/collection?contractAddress=0x...&contract=0x...&startToken=...&limit=50
 * Returns NFTs in a collection (Alchemy getNFTsForContract v3).
 * Accepts both 'contractAddress' and 'contract' params for backwards compat.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const contractAddress =
      searchParams.get("contractAddress") ||
      searchParams.get("contract") ||
      "";
    const startToken = searchParams.get("startToken") || undefined;
    const limit = searchParams.get("limit") || "50";
    const chainId = parseInt(
      searchParams.get("chainId") || String(defaultChainId()),
      10
    );

    if (!contractAddress) {
      return NextResponse.json(
        { error: "Missing contractAddress" },
        { status: 400 }
      );
    }

    const payload = await alchemyGet(
      "getNFTsForContract",
      {
        contractAddress,
        withMetadata: "true",
        startToken,
        limit,
      },
      chainId
    );

    // Normalize for the UI
    const nfts = (payload?.nfts ?? []).map((nft: any) => {
      const image =
        nft?.image?.cachedUrl ||
        nft?.image?.thumbnailUrl ||
        nft?.image?.pngUrl ||
        nft?.image?.originalUrl ||
        nft?.raw?.metadata?.image ||
        "";
      const resolvedImage = image.startsWith("ipfs://")
        ? image.replace("ipfs://", "https://ipfs.io/ipfs/")
        : image;

      return {
        contractAddress: nft?.contract?.address || contractAddress,
        tokenId: String(nft?.tokenId ?? ""),
        name: nft?.name || nft?.contract?.name || `#${nft?.tokenId}`,
        description: nft?.description || "",
        image: resolvedImage,
        collection:
          nft?.contract?.name ||
          nft?.contract?.openSeaMetadata?.collectionName ||
          "Unknown Collection",
        attributes: nft?.raw?.metadata?.attributes || [],
        tokenType: nft?.tokenType || "ERC721",
        source: "alchemy",
      };
    });

    return NextResponse.json({
      nfts,
      source: "alchemy",
      nextToken: payload?.nextToken ?? null,
    });
  } catch (e: any) {
    console.error("[/api/nft/collection]", e);
    return NextResponse.json(
      { error: e?.message || "Failed" },
      { status: 500 }
    );
  }
}
