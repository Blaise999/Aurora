import { NextResponse } from "next/server";
import { HOME_COLLECTION_SEEDS } from "@/lib/nftSeeds";

export const runtime = "nodejs";
export const revalidate = 60; // ISR-style caching

/**
 * Resolve an image URL from an Alchemy NFT object.
 * Tries multiple fallback fields, converts ipfs:// to https.
 */
function resolveImage(nft) {
  const raw =
    nft?.image?.cachedUrl ||
    nft?.image?.thumbnailUrl ||
    nft?.image?.pngUrl ||
    nft?.image?.originalUrl ||
    nft?.raw?.metadata?.image ||
    nft?.metadata?.image ||
    "";
  if (!raw) return "";
  if (raw.startsWith("ipfs://")) return raw.replace("ipfs://", "https://ipfs.io/ipfs/");
  return raw;
}

/**
 * Fetch NFTs for a single seed collection from Alchemy.
 * Uses getNFTsForContract by default; falls back to getNFTsForCollection
 * only when method === "slug" and a collectionSlug exists.
 */
async function fetchSeed(seed, apiKey) {
  const { chain, contractAddress, collectionSlug, limit, method } = seed;

  let url;
  if (method === "slug" && !contractAddress && collectionSlug) {
    // Slug-based fallback
    url = `https://${chain}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForCollection?collectionSlug=${collectionSlug}&withMetadata=true&limit=${limit}`;
  } else if (contractAddress) {
    // Default: contract-based
    url = `https://${chain}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForContract?contractAddress=${contractAddress}&withMetadata=true&limit=${limit}`;
  } else {
    throw new Error(`Seed "${seed.name}" has no contractAddress and method is not slug`);
  }

  const res = await fetch(url, {
    headers: { accept: "application/json" },
    next: { revalidate: 60 },
  });

  if (!res.ok) throw new Error(`Alchemy ${res.status} for ${seed.name}`);

  const data = await res.json();
  const nfts = data?.nfts ?? [];

  // Normalize into a clean, client-safe shape
  const items = nfts.map((nft) => ({
    tokenId: String(nft?.tokenId ?? ""),
    name:
      nft?.name ||
      nft?.raw?.metadata?.name ||
      nft?.contract?.name ||
      `#${nft?.tokenId ?? "?"}`,
    image: resolveImage(nft),
    collection:
      nft?.contract?.name ||
      nft?.contract?.openSeaMetadata?.collectionName ||
      seed.name,
    contractAddress: nft?.contract?.address || contractAddress || "",
  }));

  return items.filter((item) => item.image); // drop items with no image
}

/**
 * GET /api/nft/home-seeds
 * Returns curated homepage NFT collections from the seed list.
 */
export async function GET() {
  const apiKey = process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { collections: [], errors: ["No ALCHEMY_API_KEY configured"] },
      { status: 500 }
    );
  }

  const results = await Promise.allSettled(
    HOME_COLLECTION_SEEDS.map((seed) => fetchSeed(seed, apiKey))
  );

  const collections = [];
  const errors = [];

  results.forEach((result, i) => {
    const seed = HOME_COLLECTION_SEEDS[i];
    if (result.status === "fulfilled") {
      collections.push({
        seed: {
          name: seed.name,
          chain: seed.chain,
          contractAddress: seed.contractAddress,
          collectionSlug: seed.collectionSlug,
        },
        items: result.value,
      });
    } else {
      errors.push(`${seed.name}: ${result.reason?.message || "Unknown error"}`);
    }
  });

  return NextResponse.json(
    { collections, errors },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}
