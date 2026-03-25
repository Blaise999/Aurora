import { NextResponse } from "next/server";

export const runtime = "nodejs";

const NFT_NAMES = [
  "Celestial Fragment", "Void Resonance", "Temporal Echo", "Quantum Whisper",
  "Nebula Core", "Phantom Signal", "Astral Prism", "Dark Matter Bloom",
  "Ether Cascade", "Mythic Shard", "Genesis Pulse", "Shadow Lattice",
  "Drift Protocol", "Neon Relic", "Spectral Drift", "Arcane Nexus",
  "Binary Sunset", "Crystal Matrix", "Flux Memory", "Neural Bloom",
  "Pixel Requiem", "Sonic Artifact", "Tidal Node", "Umbral Seed",
  "Cosmic Dreamer", "Solar Flare", "Obsidian Wave", "Aurora Veil",
  "Prism Walker", "Echo Chamber", "Radiant Core", "Frozen Light",
  "Digital Mirage", "Stellar Dust", "Neon Pulse", "Iron Bloom",
  "Glass Horizon", "Velvet Storm", "Chrome Heart", "Silk Thread",
];

const TARGET_USD = 250;
const CHAIN_ID = 8453;

function randomWallet() {
  const chars = "0123456789abcdef";
  let addr = "0x";
  for (let i = 0; i < 40; i++) addr += chars[Math.floor(Math.random() * 16)];
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function randomTxHash() {
  const chars = "0123456789abcdef";
  let hash = "0x";
  for (let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * 16)];
  return hash;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clampCount(value: string | null) {
  const parsed = Number.parseInt(value || "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, 5);
}

async function getEthUsdFromLocalPricingRoute(req: Request): Promise<number> {
  const url = new URL(req.url);
  const pricingUrl = new URL("/api/pricing/eth-usd", url.origin);

  const res = await fetch(pricingUrl.toString(), {
    method: "GET",
    cache: "no-store",
    signal: AbortSignal.timeout(7000),
  });

  if (!res.ok) {
    throw new Error(`Pricing route failed (${res.status})`);
  }

  const json = (await res.json()) as {
    success?: boolean;
    usd?: number;
    error?: string;
  };

  if (!json?.success || !Number.isFinite(Number(json?.usd)) || Number(json.usd) <= 0) {
    throw new Error(json?.error || "Invalid ETH/USD price from pricing route");
  }

  return Number(json.usd);
}

function usdToEth(usdAmount: number, ethUsd: number) {
  return (usdAmount / ethUsd).toFixed(6);
}

/**
 * POST /api/admin/fake-activity
 * Sends random mint/buy telegram messages.
 * Enforces all fake mint fees and fake buy prices to equal $250 in live ETH equivalent.
 * ?count=1 (max 5)
 */
export async function POST(req: Request) {
  try {
    const { telegramNotifyMint, telegramNotifyBuy } = await import("@/lib/telegram");

    const url = new URL(req.url);
    const count = clampCount(url.searchParams.get("count"));
    const contract = process.env.NEXT_PUBLIC_CREATOR_CONTRACT || "";

    const ethUsd = await getEthUsdFromLocalPricingRoute(req);
    const enforcedEth = usdToEth(TARGET_USD, ethUsd);

    const results: Array<{
      type: "mint" | "buy";
      nftName: string;
      wallet: string;
      tokenId: string;
      eth: string;
      usd: number;
      txHash?: string;
    }> = [];

    for (let i = 0; i < count; i++) {
      const isMint = Math.random() > 0.4;
      const wallet = randomWallet();
      const tokenId = String(Math.floor(Math.random() * 9000 + 1000));
      const nftName = `${pick(NFT_NAMES)} #${tokenId}`;
      const txHash = randomTxHash();

      if (isMint) {
        await telegramNotifyMint({
          nftName,
          tokenId,
          buyer: wallet,
          fee: enforcedEth,
          listingPrice: "0",
          contractAddress: contract,
          chainId: CHAIN_ID,
        });

        results.push({
          type: "mint",
          nftName,
          wallet,
          tokenId,
          eth: enforcedEth,
          usd: TARGET_USD,
        });
      } else {
        await telegramNotifyBuy({
          nftName,
          tokenId,
          buyer: wallet,
          nftPrice: enforcedEth,
          buyFee: "0",
          totalPrice: enforcedEth,
          contractAddress: contract,
          chainId: CHAIN_ID,
          txHash,
        });

        results.push({
          type: "buy",
          nftName,
          wallet,
          tokenId,
          eth: enforcedEth,
          usd: TARGET_USD,
          txHash,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      pricing: {
        usdTarget: TARGET_USD,
        ethUsd,
        enforcedEth,
      },
      sent: results,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}