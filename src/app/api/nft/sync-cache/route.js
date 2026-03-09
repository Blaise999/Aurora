import { NextResponse } from "next/server";
import { HOME_COLLECTION_SEEDS } from "@/lib/nftSeeds";

export const runtime = "nodejs";
export const maxDuration = 300;

function resolveImage(nft) {
  for (const c of [nft?.image?.cachedUrl, nft?.image?.thumbnailUrl, nft?.image?.pngUrl, nft?.image?.originalUrl, nft?.media?.[0]?.gateway, nft?.raw?.metadata?.image, nft?.metadata?.image]) {
    if (c && typeof c === "string" && c.length > 0) {
      if (c.startsWith("ipfs://")) return c.replace("ipfs://", "https://ipfs.io/ipfs/");
      if (c.startsWith("ar://")) return c.replace("ar://", "https://arweave.net/");
      return c;
    }
  }
  return "";
}

const CHAIN_MAP = {
  "base-mainnet": 8453, "base-sepolia": 84532, "eth-mainnet": 1, "eth-sepolia": 11155111,
};

async function fetchSeed(seed, apiKey) {
  const chain = seed.chain;
  const contractAddress = seed.contract_address || seed.contractAddress;
  const collectionSlug = seed.collection_slug || seed.collectionSlug;
  const limit = seed.fetch_limit || seed.limit || 8;
  const method = seed.fetch_method || seed.method || "contract";
  let url;
  if (method === "slug" && !contractAddress && collectionSlug) {
    url = `https://${chain}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForCollection?collectionSlug=${collectionSlug}&withMetadata=true&limit=${limit}`;
  } else if (contractAddress) {
    url = `https://${chain}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForContract?contractAddress=${contractAddress}&withMetadata=true&limit=${limit}`;
  } else {
    throw new Error(`Seed "${seed.name}" misconfigured`);
  }
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Alchemy ${res.status} for ${seed.name}`);
  const data = await res.json();
  const chainId = CHAIN_MAP[chain] || 8453;
  return (data?.nfts ?? []).map((nft) => ({
    contract_address: (nft?.contract?.address || contractAddress || "").toLowerCase(),
    token_id: String(nft?.tokenId ?? ""),
    name: nft?.name || nft?.raw?.metadata?.name || nft?.contract?.name || `#${nft?.tokenId ?? "?"}`,
    description: nft?.description || nft?.raw?.metadata?.description || "",
    image_url: resolveImage(nft),
    collection_name: nft?.contract?.name || nft?.contract?.openSeaMetadata?.collectionName || seed.name,
    token_type: nft?.tokenType || "ERC721",
    attributes: nft?.raw?.metadata?.attributes || [],
    raw_metadata: { contract: nft?.contract, tokenUri: nft?.tokenUri },
    chain_id: chainId,
  }));
}

export async function POST(request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No ALCHEMY_API_KEY" }, { status: 500 });

  const { getServiceSupabase } = await import("@/lib/supabase");
  const sb = getServiceSupabase();

  /* Try loading seeds from DB first, fall back to hardcoded */
  let seeds;
  try {
    const { data: dbSeeds } = await sb.from("nft_seed_sources").select("*").eq("is_active", true);
    if (dbSeeds?.length) {
      seeds = dbSeeds;
    } else {
      seeds = HOME_COLLECTION_SEEDS.map(s => ({
        name: s.name, chain: s.chain,
        contract_address: s.contractAddress, collection_slug: s.collectionSlug,
        fetch_limit: s.limit, fetch_method: s.method,
      }));
    }
  } catch {
    seeds = HOME_COLLECTION_SEEDS.map(s => ({
      name: s.name, chain: s.chain,
      contract_address: s.contractAddress, collection_slug: s.collectionSlug,
      fetch_limit: s.limit, fetch_method: s.method,
    }));
  }

  const batchId = `sync_${Date.now()}`;
  await sb.from("cache_sync_log").insert({ batch_id: batchId, seeds_total: seeds.length, status: "running" });

  const results = await Promise.allSettled(seeds.map((seed) => fetchSeed(seed, apiKey)));
  let totalInserted = 0;
  const errors = [];

  await sb.from("cached_nfts").update({ is_active: false }).neq("id", 0);

  for (let i = 0; i < results.length; i++) {
    const seed = seeds[i];
    const result = results[i];
    if (result.status === "rejected") { errors.push(`${seed.name}: ${result.reason?.message}`); continue; }
    const nfts = result.value;
    if (!nfts.length) continue;

    const rows = nfts.map((nft) => ({
      chain_id: nft.chain_id, contract_address: nft.contract_address, token_id: nft.token_id,
      name: nft.name, description: nft.description, image_url: nft.image_url,
      collection_name: nft.collection_name, token_type: nft.token_type,
      attributes: nft.attributes, raw_metadata: nft.raw_metadata,
      is_active: true, synced_at: new Date().toISOString(), batch_id: batchId,
    }));
    const { error: err } = await sb.from("cached_nfts").upsert(rows, { onConflict: "chain_id,contract_address,token_id" });
    if (err) errors.push(`${seed.name}: DB ${err.message}`);
    else totalInserted += rows.length;
  }

  /* Ensure nft_pricing rows */
  const { data: allActive } = await sb.from("cached_nfts").select("id, chain_id, contract_address, token_id").eq("is_active", true);
  if (allActive?.length) {
    const { data: existingPricing } = await sb.from("nft_pricing").select("chain_id, contract_address, token_id");
    const existingKeys = new Set((existingPricing || []).map(p => `${p.chain_id}_${p.contract_address}_${p.token_id}`));
    const missing = allActive.filter(n => !existingKeys.has(`${n.chain_id}_${n.contract_address}_${n.token_id}`));
    if (missing.length) {
      const pricingRows = missing.map(n => ({
        cached_nft_id: n.id, chain_id: n.chain_id,
        contract_address: n.contract_address, token_id: n.token_id,
        mint_price_eth: 0.002, mint_fee_eth: 0.001,
      }));
      await sb.from("nft_pricing").upsert(pricingRows, { onConflict: "chain_id,contract_address,token_id" });
    }
  }

  await sb.from("cache_sync_log").update({
    nfts_inserted: totalInserted, errors, status: "completed", completed_at: new Date().toISOString(),
  }).eq("batch_id", batchId);

  await sb.from("admin_notifications").insert({
    type: "sync", title: "NFT Cache Synced",
    body: `${totalInserted} NFTs cached from ${seeds.length} seeds. ${errors.length} errors.`,
    metadata: { batchId, totalInserted, errors: errors.length },
  });

  try {
    const { sendNtfyNotification } = await import("@/lib/ntfy");
    await sendNtfyNotification({ title: "NFT Cache Synced", message: `${totalInserted} NFTs cached. ${errors.length} errors.`, priority: "default", tags: ["package"] });
  } catch {}

  return NextResponse.json({ ok: true, totalInserted, errors, batchId, seedsUsed: seeds.length });
}

export async function GET(request) { return POST(request); }
