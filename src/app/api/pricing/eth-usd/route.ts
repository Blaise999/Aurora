import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const res = await fetch("https://api.coinbase.com/v2/exchange-rates?currency=ETH", {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Coinbase pricing request failed with status ${res.status}`);
    }

    const json = await res.json();
    const usdRate = json?.data?.rates?.USD;

    if (!usdRate) {
      throw new Error("USD rate missing from pricing response");
    }

    const ethUsd = Number(usdRate);

    if (!Number.isFinite(ethUsd) || ethUsd <= 0) {
      throw new Error("Invalid ETH/USD rate");
    }

    return NextResponse.json({
      ethUsd,
      source: "coinbase",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch ETH/USD price" },
      { status: 500 }
    );
  }
}