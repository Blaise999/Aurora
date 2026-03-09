import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

/* ── Chain mapping ─────────────────────────────────── */
const CHAIN_MAP: Record<string, number> = {
  "base-mainnet": 8453,
  "base-sepolia": 84532,
  "eth-mainnet": 1,
  "eth-sepolia": 11155111,
  "polygon-mainnet": 137,
  "arb-mainnet": 42161,
  "opt-mainnet": 10,
};

function chainIdFromLabel(chain: string): number {
  return CHAIN_MAP[chain] ?? 8453;
}

/* ── Image resolution ──────────────────────────────── */
function resolveImage(nft: any): string {
  const candidates = [
    nft?.image?.cachedUrl,
    nft?.image?.thumbnailUrl,
    nft?.image?.pngUrl,
    nft?.image?.originalUrl,
    nft?.media?.[0]?.gateway,
    nft?.media?.[0]?.thumbnail,
    nft?.raw?.metadata?.image,
    nft?.metadata?.image,
  ];
  for (const c of candidates) {
    if (c && typeof c === "string" && c.length > 0) {
      if (c.startsWith("ipfs://"))
        return c.replace("ipfs://", "https://ipfs.io/ipfs/");
      if (c.startsWith("ar://"))
        return c.replace("ar://", "https://arweave.net/");
      return c;
    }
  }
  return "";
}

/* ── Fetch a single seed from Alchemy ──────────────── */
async function fetchSeed(
  seed: {
    name: string;
    chain: string;
    contract_address: string | null;
    collection_slug: string | null;
    fetch_limit: number;
    fetch_method: string;
  },
  apiKey: string
) {
  const { chain, contract_address, collection_slug, fetch_limit, fetch_method } = seed;
  let url: string;

  if (fetch_method === "slug" && !contract_address && collection_slug) {
    url = `https://${chain}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForCollection?collectionSlug=${collection_slug}&withMetadata=true&limit=${fetch_limit}`;
  } else if (contract_address) {
    url = `https://${chain}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForContract?contractAddress=${contract_address}&withMetadata=true&limit=${fetch_limit}`;
  } else {
    throw new Error(`Seed "${seed.name}" misconfigured — no contract_address or collection_slug`);
  }

  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Alchemy ${res.status} for ${seed.name}: ${text}`);
  }
  const data = await res.json();
  const chainId = chainIdFromLabel(chain);

  return (data?.nfts ?? []).map((nft: any) => ({
    chain_id: chainId,
    contract_address: (
      nft?.contract?.address ||
      contract_address ||
      ""
    ).toLowerCase(),
    token_id: String(nft?.tokenId ?? ""),
    name:
      nft?.name ||
      nft?.raw?.metadata?.name ||
      nft?.contract?.name ||
      `#${nft?.tokenId ?? "?"}`,
    description: nft?.description || nft?.raw?.metadata?.description || "",
    image_url: resolveImage(nft),
    collection_name:
      nft?.contract?.name ||
      nft?.contract?.openSeaMetadata?.collectionName ||
      seed.name,
    token_type: nft?.tokenType || "ERC721",
    attributes: nft?.raw?.metadata?.attributes || [],
    raw_metadata: { contract: nft?.contract, tokenUri: nft?.tokenUri },
  }));
}

/* ── POST /api/admin/nft/sync ──────────────────────── */
export async function POST(request: Request) {
  try {
    const apiKey =
      process.env.ALCHEMY_API_KEY || process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "No ALCHEMY_API_KEY" }, { status: 500 });
    }

    const { getServiceSupabase } = await import("@/lib/supabase");
    const sb = getServiceSupabase();

    /* 1) Fetch ALL active seed sources from Supabase */
    const { data: seeds, error: seedErr } = await sb
      .from("nft_seed_sources")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (seedErr) throw new Error(`Failed to load seed sources: ${seedErr.message}`);
    if (!seeds || seeds.length === 0) {
      return NextResponse.json(
        { error: "No active seed sources found in nft_seed_sources" },
        { status: 400 }
      );
    }

    /* 2) Create sync log entry */
    const batchId = `sync_${Date.now()}`;
    await sb.from("cache_sync_log").insert({
      batch_id: batchId,
      seeds_total: seeds.length,
      status: "running",
    });

    /* 3) Fetch from Alchemy in parallel */
    const results = await Promise.allSettled(
      seeds.map((seed: any) =>
        fetchSeed(
          {
            name: seed.name,
            chain: seed.chain,
            contract_address: seed.contract_address,
            collection_slug: seed.collection_slug,
            fetch_limit: seed.fetch_limit || 8,
            fetch_method: seed.fetch_method || "contract",
          },
          apiKey
        )
      )
    );

    /* 4) Mark existing as inactive, then upsert fresh */
    await sb.from("cached_nfts").update({ is_active: false }).neq("id", 0);

    let totalInserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const seed = seeds[i];
      const result = results[i];

      if (result.status === "rejected") {
        errors.push(`${seed.name}: ${result.reason?.message || "Unknown error"}`);
        continue;
      }

      const nfts = result.value;
      if (!nfts.length) continue;

      const rows = nfts.map((nft: any) => ({
        chain_id: nft.chain_id,
        contract_address: nft.contract_address,
        token_id: nft.token_id,
        name: nft.name,
        description: nft.description,
        image_url: nft.image_url,
        collection_name: nft.collection_name,
        token_type: nft.token_type,
        attributes: nft.attributes,
        raw_metadata: nft.raw_metadata,
        is_active: true,
        synced_at: new Date().toISOString(),
        batch_id: batchId,
      }));

      /* Upsert in chunks of 200 */
      for (let j = 0; j < rows.length; j += 200) {
        const chunk = rows.slice(j, j + 200);
        const { error: dbErr } = await sb
          .from("cached_nfts")
          .upsert(chunk, { onConflict: "chain_id,contract_address,token_id" });
        if (dbErr) {
          errors.push(`${seed.name}: DB upsert — ${dbErr.message}`);
        } else {
          totalInserted += chunk.length;
        }
      }
    }

    /* 5) Ensure nft_pricing rows exist for every active cached_nft */
    const { data: allActive } = await sb
      .from("cached_nfts")
      .select("id, chain_id, contract_address, token_id")
      .eq("is_active", true);

    if (allActive?.length) {
      const { data: existingPricing } = await sb
        .from("nft_pricing")
        .select("chain_id, contract_address, token_id");

      const existingKeys = new Set(
        (existingPricing || []).map(
          (p: any) => `${p.chain_id}_${p.contract_address}_${p.token_id}`
        )
      );

      const missingPricing = allActive.filter(
        (nft: any) =>
          !existingKeys.has(`${nft.chain_id}_${nft.contract_address}_${nft.token_id}`)
      );

      if (missingPricing.length > 0) {
        const pricingRows = missingPricing.map((nft: any) => ({
          cached_nft_id: nft.id,
          chain_id: nft.chain_id,
          contract_address: nft.contract_address,
          token_id: nft.token_id,
          mint_price_eth: 0.002,
          mint_fee_eth: 0.001,
          is_featured: false,
          is_listed: true,
        }));

        for (let i = 0; i < pricingRows.length; i += 200) {
          const chunk = pricingRows.slice(i, i + 200);
          await sb
            .from("nft_pricing")
            .upsert(chunk, { onConflict: "chain_id,contract_address,token_id" });
        }
      }
    }

    /* 6) Finish sync log */
    await sb
      .from("cache_sync_log")
      .update({
        nfts_inserted: totalInserted,
        nfts_updated: 0,
        errors: errors,
        status: errors.length > 0 && totalInserted === 0 ? "failed" : "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("batch_id", batchId);

    /* 7) Insert admin notification */
    await sb.from("admin_notifications").insert({
      type: "sync",
      title: "NFT Cache Synced",
      body: `${totalInserted} NFTs cached from ${seeds.length} seed sources. ${errors.length} errors.`,
      metadata: { batchId, totalInserted, seedsUsed: seeds.length, errorCount: errors.length },
    });

    /* 8) Send ntfy push notification */
    try {
      const { sendNtfyNotification } = await import("@/lib/ntfy");
      await sendNtfyNotification({
        title: "NFT Cache Synced",
        message: `${totalInserted} NFTs cached from ${seeds.length} seeds. ${errors.length} errors.`,
        priority: "default",
        tags: ["package", "white_check_mark"],
        click: "/admin",
      });
    } catch {
      /* ntfy is non-blocking */
    }

    return NextResponse.json({
      ok: true,
      batchId,
      seedsUsed: seeds.length,
      totalInserted,
      errors,
    });
  } catch (e: any) {
    console.error("[/api/admin/nft/sync]", e);
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
