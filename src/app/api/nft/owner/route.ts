import { NextResponse } from "next/server";
import { alchemyGet, pickImage, ipfsToHttp } from "@/lib/alchemy/nft";
import { alchemyOwnedToUi } from "@/lib/alchemy/nft-normalize";
import { defaultChainId } from "@/lib/alchemy/chains";

export const runtime = "nodejs";

/**
 * GET /api/nft/owner?owner=0x...&wallet=0x...&chainId=8453&pageKey=...
 * Returns ALL NFTs the wallet owns (Alchemy getNFTsForOwner v3).
 * Accepts both 'owner' and 'wallet' params for backwards compat.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const owner =
      searchParams.get("owner") ||
      searchParams.get("wallet") ||
      "";
    const pageKey = searchParams.get("pageKey") || undefined;
    const chainId = parseInt(
      searchParams.get("chainId") || String(defaultChainId()),
      10
    );

    if (!owner) {
      return NextResponse.json({ error: "Missing owner/wallet" }, { status: 400 });
    }

    const payload = await alchemyGet(
      "getNFTsForOwner",
      {
        owner,
        withMetadata: "true",
        pageSize: "50",
        pageKey,
      },
      chainId
    );

    // Return in BOTH formats so old hooks (expect flat nfts[]) and new UI components work
    const normalizedUi = alchemyOwnedToUi(payload, chainId);
    const normalizedFlat = (payload?.ownedNfts ?? []).map((nft: any) => {
      const image = pickImage(nft) || "";
      return {
        contractAddress: nft?.contract?.address || "",
        tokenId: String(nft?.tokenId ?? ""),
        name: nft?.name || nft?.contract?.name || `#${nft?.tokenId}`,
        description: nft?.description || "",
        image: image,
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
      nfts: normalizedFlat,
      nftsUi: normalizedUi,
      pageKey: payload?.pageKey ?? null,
      totalCount: payload?.totalCount ?? null,
      source: "alchemy",
    });
  } catch (e: any) {
    console.error("[/api/nft/owner]", e);
    return NextResponse.json(
      { error: e?.message || "Failed" },
      { status: 500 }
    );
  }
}
