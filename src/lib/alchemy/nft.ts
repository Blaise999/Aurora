// src/lib/alchemy/nft.ts
// Server-only — Alchemy API key NEVER leaves the server

import { alchemyNftBaseUrl, defaultChainId, chainLabel } from "./chains";

export type AlchemyNft = {
  contractAddress: string;
  tokenId: string;
  name?: string;
  description?: string;
  image?: string;
  collectionName?: string;
  tokenType?: string;
  raw?: any;
};

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// ─── Image normalisation ───────────────────────────────────────────

export function ipfsToHttp(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("ipfs://"))
    return url.replace("ipfs://", "https://ipfs.io/ipfs/");
  if (url.startsWith("ar://"))
    return url.replace("ar://", "https://arweave.net/");
  return url;
}

export function pickImage(nft: any): string | undefined {
  // Alchemy v3 response shape — check every common location
  const candidates = [
    nft?.image?.cachedUrl,
    nft?.image?.thumbnailUrl,
    nft?.image?.pngUrl,
    nft?.image?.originalUrl,
    nft?.media?.[0]?.gateway,
    nft?.media?.[0]?.thumbnail,
    nft?.metadata?.image,
    nft?.raw?.metadata?.image,
    nft?.tokenUri?.gateway,
  ];
  for (const c of candidates) {
    if (c && typeof c === "string" && c.length > 0) return ipfsToHttp(c);
  }
  return undefined;
}

// ─── Generic Alchemy GET (server-only) ─────────────────────────────

export async function alchemyGet(
  path: string,
  searchParams?: Record<string, string | undefined>,
  chainId?: number
) {
  const apiKey = requireEnv("ALCHEMY_API_KEY");
  const cid = chainId ?? defaultChainId();
  const base = alchemyNftBaseUrl(cid);

  const url = new URL(`${base}/${apiKey}/${path}`);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 30 },
    headers: { accept: "application/json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Alchemy ${res.status}: ${text || res.statusText}`);
  }

  return res.json();
}

// ─── Normalise Alchemy payloads ────────────────────────────────────

export function normalizeOwnedNfts(
  payload: any,
  chainId?: number
): AlchemyNft[] {
  const list = payload?.ownedNfts ?? payload?.nfts ?? [];
  return list.map((nft: any) => ({
    contractAddress: nft?.contract?.address || nft?.contractAddress || "",
    tokenId: nft?.tokenId?.toString?.() ?? String(nft?.tokenId ?? ""),
    name: nft?.name || nft?.contract?.name,
    description: nft?.description,
    image: pickImage(nft),
    collectionName:
      nft?.contract?.name ||
      nft?.contractMetadata?.name ||
      nft?.collection?.name,
    tokenType: nft?.tokenType || nft?.contract?.tokenType,
    raw: nft,
  }));
}

export function normalizeSingleNft(payload: any): AlchemyNft {
  const nft = payload?.nft ?? payload;
  return {
    contractAddress: nft?.contract?.address || nft?.contractAddress || "",
    tokenId: nft?.tokenId?.toString?.() ?? String(nft?.tokenId ?? ""),
    name: nft?.name || nft?.contract?.name,
    description: nft?.description,
    image: pickImage(nft),
    collectionName:
      nft?.contract?.name ||
      nft?.contractMetadata?.name ||
      nft?.collection?.name,
    tokenType: nft?.tokenType || nft?.contract?.tokenType,
    raw: nft,
  };
}
