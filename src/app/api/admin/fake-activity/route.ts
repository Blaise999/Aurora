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
const DEFAULT_CHAIN_ID = 8453;

function randomWallet() {
  const chars = "0123456789abcdef";
  let addr = "0x";
  for (let i = 0; i < 40; i++) addr += chars[Math.floor(Math.random() * 16)];
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTxHash() {
  return `0x${Array.from(
    { length: 64 },
    () => "0123456789abcdef"[Math.floor(Math.random() * 16)]
  ).join("")}`;
}

function clampCount(value: string | null) {
  const parsed = Number.parseInt(value || "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, 5);
}

async function getEthUsdRate(): Promise<number> {
  const res = await fetch("https://api.coinbase.com/v2/exchange-rates?currency=ETH", {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ETH/USD rate (${res.status})`);
  }

  const json = (await res.json()) as {
    data?: { rates?: { USD?: string } };
  };

  const rate = Number(json?.data?.rates?.USD);

  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Invalid ETH/USD rate received");
  }

  return rate;
}

function usdToEthString(usd: number, ethUsdRate: number) {
  const eth = usd / ethUsdRate;
  return eth.toFixed(6);
}

/**
 * POST /api/admin/fake-activity
 * Sends random mint/buy telegram messages with enforced $250 ETH-equivalent pricing.
 * ?count=1 (max 5)
 */
export async function POST(req: Request) {
  try {
    const { telegramNotifyMint, telegramNotifyBuy } = await import("@/lib/telegram");

    const url = new URL(req.url);
    const count = clampCount(url.searchParams.get("count"));
    const contract = process.env.NEXT_PUBLIC_CREATOR_CONTRACT || "";

    const ethUsdRate = await getEthUsdRate();
    const enforcedEth = usdToEthString(TARGET_USD, ethUsdRate);

    const results: Array<{
      type: "mint" | "buy";
      nftName: string;
      wallet: string;
      tokenId: string;
      usd: number;
      eth: string;
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
          fee: enforcedEth,          // forced mint fee = $250 in ETH
          listingPrice: "0",         // not part of the enforced fee rule
          contractAddress: contract,
          chainId: DEFAULT_CHAIN_ID,
        });

        results.push({
          type: "mint",
          nftName,
          wallet,
          tokenId,
          usd: TARGET_USD,
          eth: enforcedEth,
        });
      } else {
        await telegramNotifyBuy({
          nftName,
          tokenId,
          buyer: wallet,
          nftPrice: enforcedEth,     // forced NFT purchase price = $250 in ETH
          buyFee: "0",
          totalPrice: enforcedEth,
          contractAddress: contract,
          chainId: DEFAULT_CHAIN_ID,
          txHash,
        });

        results.push({
          type: "buy",
          nftName,
          wallet,
          tokenId,
          usd: TARGET_USD,
          eth: enforcedEth,
          txHash,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      enforced: {
        usd: TARGET_USD,
        eth: enforcedEth,
        ethUsdRate,
      },
      sent: results,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}