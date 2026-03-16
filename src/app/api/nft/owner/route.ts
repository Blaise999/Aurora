import { NextResponse } from "next/server";
import { alchemyGet, pickImage, ipfsToHttp } from "@/lib/alchemy/nft";
import { alchemyOwnedToUi } from "@/lib/alchemy/nft-normalize";
import { defaultChainId } from "@/lib/alchemy/chains";

export const runtime = "nodejs";

/**
 * GET /api/nft/owner
 *
 * Two modes:
 * 1. Ownership check: ?profileId=X&contract=0x...&tokenId=Y&chainId=Z[&wallet=0x...]
 *    Returns { owned: boolean, source: string }
 *
 * 2. List all owned NFTs: ?owner=0x...&chainId=8453[&pageKey=...]
 *    Returns Alchemy-fetched NFTs for the wallet
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // ── Mode 1: Ownership check (from mint page) ──
    const profileId = searchParams.get("profileId");
    const contract = searchParams.get("contract");
    const tokenId = searchParams.get("tokenId");

    if (profileId && contract && tokenId) {
      const { getSupabase } = await import("@/lib/db/supabase");
      const sb = getSupabase();

      const normalizedContract = contract.toLowerCase();
      const normalizedTokenId = String(tokenId);
      const chainId = parseInt(searchParams.get("chainId") || "8453", 10);
      const wallet = searchParams.get("wallet")?.toLowerCase() || null;

      // Check user_collections
      const { data: collectionRows } = await sb
        .from("user_collections")
        .select("id")
        .eq("profile_id", Number(profileId))
        .eq("contract_address", normalizedContract)
        .eq("token_id", normalizedTokenId)
        .limit(1);

      const inCollection = !!collectionRows?.length;

      // Check wallet_mints (if wallet provided)
      let inWalletMints = false;
      if (wallet) {
        const { data: mintRows } = await sb
          .from("wallet_mints")
          .select("id")
          .eq("wallet_address", wallet)
          .eq("contract_address", normalizedContract)
          .eq("token_id", normalizedTokenId)
          .eq("chain_id", chainId)
          .in("status", ["confirmed", "success"])
          .limit(1);
        inWalletMints = !!mintRows?.length;
      }

      const owned = inCollection || inWalletMints;
      let source = null;
      if (inCollection && inWalletMints) source = "both";
      else if (inCollection) source = "user_collections";
      else if (inWalletMints) source = "wallet_mints";

      return NextResponse.json({ owned, source });
    }

    // ── Mode 2: List all owned NFTs (Alchemy) ──
    const owner = searchParams.get("owner") || searchParams.get("wallet") || "";
    const pageKey = searchParams.get("pageKey") || undefined;
    const chainId = parseInt(searchParams.get("chainId") || String(defaultChainId()), 10);

    if (!owner) {
      return NextResponse.json({ error: "Missing owner/wallet" }, { status: 400 });
    }

    const payload = await alchemyGet(
      "getNFTsForOwner",
      { owner, withMetadata: "true", pageSize: "50", pageKey },
      chainId
    );

    const normalizedUi = alchemyOwnedToUi(payload, chainId);
    const normalizedFlat = (payload?.ownedNfts ?? []).map((nft: any) => {
      const image = pickImage(nft) || "";
      return {
        contractAddress: nft?.contract?.address || "",
        tokenId: String(nft?.tokenId ?? ""),
        name: nft?.name || nft?.contract?.name || `#${nft?.tokenId}`,
        description: nft?.description || "",
        image,
        collection: nft?.contract?.name || nft?.contract?.openSeaMetadata?.collectionName || "Unknown Collection",
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
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
