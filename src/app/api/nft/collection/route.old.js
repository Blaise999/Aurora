import { NextResponse } from "next/server";
import { fetchCollectionNfts } from "@/lib/alchemy";
import { LOCAL_NFTS, AURORA_CONTRACT } from "@/lib/constants";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const contract = searchParams.get("contract") || AURORA_CONTRACT;
  const limit = parseInt(searchParams.get("limit") || "20");

  try {
    if (contract) {
      const nfts = await fetchCollectionNfts(contract, limit);
      if (nfts.length > 0) {
        return NextResponse.json({ nfts, source: "alchemy" });
      }
    }
    return NextResponse.json({ nfts: LOCAL_NFTS.slice(0, limit), source: "local" });
  } catch {
    return NextResponse.json({ nfts: LOCAL_NFTS.slice(0, limit), source: "fallback" });
  }
}
