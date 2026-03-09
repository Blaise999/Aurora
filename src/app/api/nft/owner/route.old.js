import { NextResponse } from "next/server";
import { fetchWalletNfts } from "@/lib/alchemy";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ error: "wallet param required" }, { status: 400 });
  }

  try {
    const nfts = await fetchWalletNfts(wallet);
    return NextResponse.json({ nfts, source: "alchemy" });
  } catch (err) {
    return NextResponse.json({ nfts: [], error: err.message }, { status: 500 });
  }
}
