import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json(
      { error: "wallet param required" },
      { status: 400 }
    );
  }

  try {
    const sb = getServiceSupabase();

    const { data: mints, error: mintErr } = await sb
      .from("user_nfts")
      .select("*")
      .eq("owner_address", wallet.toLowerCase())
      .order("minted_at", { ascending: false });

    if (mintErr) throw mintErr;

    const enriched = await Promise.all(
      (mints || []).map(async (m) => {
        const { data: meta } = await sb
          .from("nft_metadata_cache")
          .select("*")
          .eq("chain_id", m.chain_id)
          .eq("contract_address", m.contract_address)
          .eq("token_id", m.token_id)
          .maybeSingle();

        return {
          contractAddress: m.contract_address,
          tokenId: m.token_id,
          name: meta?.name || `NFT #${m.token_id}`,
          description: meta?.description || "",
          image: meta?.image_url || "",
          attributes: meta?.attributes || [],
          txHash: m.tx_hash,
          mintedAt: m.minted_at,
          status: m.status,
          source: "database",
        };
      })
    );

    return NextResponse.json({ nfts: enriched });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";

    return NextResponse.json(
      { nfts: [], error: message },
      { status: 500 }
    );
  }
}