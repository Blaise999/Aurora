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

function randomWallet() {
  const chars = "0123456789abcdef";
  let addr = "0x";
  for (let i = 0; i < 40; i++) addr += chars[Math.floor(Math.random() * 16)];
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function randomPrice(min: number, max: number) {
  return (Math.random() * (max - min) + min).toFixed(4);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * POST /api/admin/fake-activity
 * Sends random mint/buy telegram messages. For simulating activity.
 * ?count=1 (max 5)
 */
export async function POST(req: Request) {
  try {
    const { telegramNotifyMint, telegramNotifyBuy } = await import("@/lib/telegram");
    const url = new URL(req.url);
    const count = Math.min(parseInt(url.searchParams.get("count") || "1"), 5);
    const contract = process.env.NEXT_PUBLIC_CREATOR_CONTRACT || "";
    const results: any[] = [];

    for (let i = 0; i < count; i++) {
      const isMint = Math.random() > 0.4;
      const wallet = randomWallet();
      const tokenId = String(Math.floor(Math.random() * 9000 + 1000));
      const nftName = `${pick(NFT_NAMES)} #${tokenId}`;
      const txHash = `0x${Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`;

      if (isMint) {
        const fee = randomPrice(0.001, 0.015);
        const lp = Math.random() > 0.3 ? randomPrice(0.01, 0.4) : "0";
        await telegramNotifyMint({ nftName, tokenId, buyer: wallet, fee, listingPrice: lp, contractAddress: contract, chainId: 8453 });
        results.push({ type: "mint", nftName, wallet });
      } else {
        const tp = randomPrice(0.005, 0.25);
        await telegramNotifyBuy({ nftName, tokenId, buyer: wallet, nftPrice: tp, buyFee: "0", totalPrice: tp, contractAddress: contract, chainId: 8453, txHash });
        results.push({ type: "buy", nftName, wallet });
      }
    }

    return NextResponse.json({ ok: true, sent: results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
