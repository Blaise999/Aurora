// src/lib/alchemy/nft-normalize.ts
// Transforms raw Alchemy v3 payloads → UI-ready objects

import { chainLabel } from "./chains";
import { ipfsToHttp, pickImage } from "./nft";

export type UiNft = {
  id: string;
  contractAddress: string;
  tokenId: string;
  name: string;
  description?: string;
  chain: string;
  collectionName: string;
  hasMedia: boolean;
  normalized_metadata: { image?: string };
  price?: string;
  lastSale?: string;
  tokenType?: string;
  attributes?: any[];
};

function normalizeTokenId(tokenId: any): string {
  if (tokenId === null || tokenId === undefined) return "";
  return String(tokenId);
}

export function alchemyOwnedToUi(
  payload: any,
  chainId?: number
): UiNft[] {
  const list = payload?.ownedNfts ?? payload?.nfts ?? [];
  const label = chainId ? chainLabel(chainId) : "Ethereum";

  return list.map((nft: any) => {
    const contractAddress =
      nft?.contract?.address || nft?.contractAddress || "";
    const tokenId = normalizeTokenId(nft?.tokenId);
    const image = pickImage(nft);
    const name = nft?.name || (tokenId ? `#${tokenId}` : "Untitled");
    const collectionName =
      nft?.contract?.name ||
      nft?.contractMetadata?.name ||
      nft?.collection?.name ||
      "Collection";

    const id = `${contractAddress}_${tokenId}`.replace(/:/g, "_");

    return {
      id,
      contractAddress,
      tokenId,
      name,
      description: nft?.description,
      chain: label,
      collectionName,
      hasMedia: Boolean(image),
      normalized_metadata: { image },
      tokenType: nft?.tokenType || nft?.contract?.tokenType,
      attributes:
        nft?.raw?.metadata?.attributes || nft?.metadata?.attributes || [],
      price: "—",
      lastSale: "—",
    };
  });
}
