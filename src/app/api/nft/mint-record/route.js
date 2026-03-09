import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json({ error: "wallet param required" }, { status: 400 });
  }

  try {
    const sb = getServiceSupabase();

    // Get user's minted NFTs
    const { data: mints, error: mintErr } = await sb
      .from("user_nfts")
      .select("*")
      .eq("owner_address", wallet.toLowerCase())
      .order("minted_at", { ascending: false });

    if (mintErr) throw mintErr;

    // Enrich with cached metadata
    const enriched = await Promise.all(
      (mints || []).map(async (m) => {
        const { data: meta } = await sb
          .from("nft_metadata_cache")
          .select("*")
          .eq("chain_id", m.chain_id)
          .eq("contract_address", m.contract_address)
          .eq("token_id", m.token_id)
          .single();

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
  } catch (err) {
    return NextResponse.json({ nfts: [], error: err.message }, { status: 500 });
  }
}
