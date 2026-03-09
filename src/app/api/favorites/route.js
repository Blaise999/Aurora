import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "No wallet" }, { status: 400 });
  const { getServiceSupabase } = await import("@/lib/supabase");
  const sb = getServiceSupabase();
  const { data } = await sb.from("wallet_favorites")
    .select("*, cached_nfts(id, name, description, image_url, collection_name, chain_id, contract_address, token_id)")
    .eq("wallet_address", wallet.toLowerCase()).order("created_at", { ascending: false });
  return NextResponse.json({ favorites: data || [] });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { wallet, contractAddress, tokenId, chainId, cachedNftId } = body;
    if (!wallet || !contractAddress || !tokenId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    const { getServiceSupabase } = await import("@/lib/supabase");
    const sb = getServiceSupabase();
    const { data, error } = await sb.from("wallet_favorites").upsert({
      wallet_address: wallet.toLowerCase(), cached_nft_id: cachedNftId || null,
      chain_id: chainId || 8453, contract_address: contractAddress.toLowerCase(), token_id: tokenId,
    }, { onConflict: "wallet_address,chain_id,contract_address,token_id" }).select().single();
    if (error) throw error;
    return NextResponse.json({ ok: true, favorite: data });
  } catch (e) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");
    const contract = searchParams.get("contract");
    const tokenId = searchParams.get("tokenId");
    const chainId = searchParams.get("chainId") || "8453";
    if (!wallet || !contract || !tokenId) return NextResponse.json({ error: "Missing" }, { status: 400 });
    const { getServiceSupabase } = await import("@/lib/supabase");
    const sb = getServiceSupabase();
    await sb.from("wallet_favorites").delete()
      .eq("wallet_address", wallet.toLowerCase()).eq("contract_address", contract.toLowerCase())
      .eq("token_id", tokenId).eq("chain_id", parseInt(chainId));
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
