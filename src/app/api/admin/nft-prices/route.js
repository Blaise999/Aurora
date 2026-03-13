import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { getServiceSupabase } = await import("@/lib/supabase");
    const sb = getServiceSupabase();
    // Return cached_nfts with their pricing joined
    const { data } = await sb.from("cached_nfts")
      .select("id, name, image_url, collection_name, contract_address, token_id, chain_id, nft_pricing(id, mint_price_eth, mint_fee_eth, is_listed, is_featured)")
      .eq("is_active", true).order("collection_name").limit(500);
    const prices = (data || []).map(nft => {
      const p = Array.isArray(nft.nft_pricing) ? nft.nft_pricing[0] : nft.nft_pricing;
      return {
        nft_id: `${nft.contract_address}_${nft.token_id}`, cached_nft_id: nft.id,
        name: nft.name, image_url: nft.image_url, collection_name: nft.collection_name,
        contract_address: nft.contract_address, token_id: nft.token_id, chain_id: nft.chain_id,
        price_eth: p?.mint_price_eth || 0.002, minting_fee_eth: p?.mint_fee_eth || 0.001,
        is_listed: p?.is_listed !== false, is_featured: p?.is_featured || false,
      };
    });
    return NextResponse.json({ prices });
  } catch (e) { return NextResponse.json({ error: e?.message, prices: [] }, { status: 500 }); }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { getServiceSupabase } = await import("@/lib/supabase");
    const sb = getServiceSupabase();
    // Upsert nft_pricing
    const { data, error } = await sb.from("nft_pricing").upsert({
      cached_nft_id: body.cached_nft_id,
      chain_id: body.chain_id || 8453,
      contract_address: (body.contract_address || "").toLowerCase(),
      token_id: body.token_id || body.nft_id || "0",
      mint_price_eth: parseFloat(body.price_eth) || 0.002,
      mint_fee_eth: parseFloat(body.minting_fee_eth) || 0.001,
      is_listed: body.is_listed !== false,
      is_featured: !!body.is_featured,
      updated_at: new Date().toISOString(),
    }, { onConflict: "chain_id,contract_address,token_id" }).select().single();
    if (error) throw error;
    return NextResponse.json({ price: { ...body, ...data } });
  } catch (e) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
