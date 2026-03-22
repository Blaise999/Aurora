import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/pricing/eth-usd
 *
 * Returns the current ETH/USD price.
 * Tries CoinGecko first (no API key needed), falls back to backup.
 *
 * Response: { success: true, usd: 2000.50, source: "coingecko", fetchedAt: "..." }
 */
export async function GET() {
  // Try multiple sources in order
  const sources = [
    {
      name: "coingecko",
      url: "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      parse: (json: any) => json?.ethereum?.usd,
    },
    {
      name: "coinbase",
      url: "https://api.coinbase.com/v2/exchange-rates?currency=ETH",
      parse: (json: any) => Number(json?.data?.rates?.USD),
    },
  ];

  for (const src of sources) {
    try {
      const res = await fetch(src.url, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) continue;

      const json = await res.json();
      const price = src.parse(json);
      const usd = Number(price);

      if (!Number.isFinite(usd) || usd <= 0) continue;

      return NextResponse.json({
        success: true,
        usd,
        source: src.name,
        fetchedAt: new Date().toISOString(),
      });
    } catch {
      // try next source
      continue;
    }
  }

  return NextResponse.json(
    { success: false, error: "All price sources failed" },
    { status: 502 }
  );
}
