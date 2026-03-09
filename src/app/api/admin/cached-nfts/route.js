import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET() {
  const { getServiceSupabase } = await import("@/lib/supabase");
  const sb = getServiceSupabase();
  const { data, error } = await sb.from("cached_nfts")
    .select("*, nft_pricing(id, mint_price_eth, mint_fee_eth, is_featured, is_listed)")
    .eq("is_active", true).order("collection_name").order("name").limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ nfts: data || [] });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { cached_nft_id, chain_id, contract_address, token_id, mint_price_eth, mint_fee_eth, is_featured, is_listed } = body;
    const { getServiceSupabase } = await import("@/lib/supabase");
    const sb = getServiceSupabase();
    const { data, error } = await sb.from("nft_pricing").upsert({
      cached_nft_id, chain_id, contract_address: contract_address.toLowerCase(), token_id,
      mint_price_eth: parseFloat(mint_price_eth) || 0.002,
      mint_fee_eth: parseFloat(mint_fee_eth) || 0.001,
      is_featured: !!is_featured, is_listed: is_listed !== false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "chain_id,contract_address,token_id" }).select().single();
    if (error) throw error;
    return NextResponse.json({ ok: true, pricing: data });
  } catch (e) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
