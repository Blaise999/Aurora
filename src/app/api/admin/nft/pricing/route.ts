import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/admin/nft/pricing
 * Returns all cached NFTs joined with their pricing data for the admin table.
 * Supports: ?search=term&chain=8453&featured=true&listed=true&page=1&limit=50
 */
export async function GET(request: Request) {
  try {
    const { getServiceSupabase } = await import("@/lib/supabase");
    const sb = getServiceSupabase();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(1000, parseInt(searchParams.get("limit") || "200"));
    const offset = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const chain = searchParams.get("chain") || "";
    const featured = searchParams.get("featured");
    const listed = searchParams.get("listed");

    let query = sb
      .from("cached_nfts")
      .select(
        "id, chain_id, contract_address, token_id, name, image_url, collection_name, token_type, synced_at, is_active, nft_pricing(id, mint_price_eth, mint_fee_eth, is_featured, is_listed, updated_at)",
        { count: "exact" }
      )
      .eq("is_active", true)
      .order("collection_name")
      .order("name")
      .range(offset, offset + limit - 1);

    /* Filters */
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,collection_name.ilike.%${search}%,contract_address.ilike.%${search}%,token_id.eq.${search}`
      );
    }
    if (chain) {
      query = query.eq("chain_id", parseInt(chain));
    }

    const { data, error, count } = await query;
    if (error) throw error;

    /* Flatten pricing join */
    let nfts = (data || []).map((row: any) => {
      const p = Array.isArray(row.nft_pricing) ? row.nft_pricing[0] : row.nft_pricing;
      return {
        id: row.id,
        chain_id: row.chain_id,
        contract_address: row.contract_address,
        token_id: row.token_id,
        name: row.name,
        image_url: row.image_url,
        collection_name: row.collection_name,
        token_type: row.token_type,
        synced_at: row.synced_at,
        pricing_id: p?.id || null,
        mint_price_eth: p?.mint_price_eth ?? 0.002,
        mint_fee_eth: p?.mint_fee_eth ?? 0.001,
        is_featured: p?.is_featured ?? false,
        is_listed: p?.is_listed ?? true,
        pricing_updated_at: p?.updated_at || null,
      };
    });

    /* Client-side filter for featured/listed (from pricing join) */
    if (featured === "true") nfts = nfts.filter((n: any) => n.is_featured);
    if (featured === "false") nfts = nfts.filter((n: any) => !n.is_featured);
    if (listed === "true") nfts = nfts.filter((n: any) => n.is_listed);
    if (listed === "false") nfts = nfts.filter((n: any) => !n.is_listed);

    return NextResponse.json({
      nfts,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (e: any) {
    console.error("[/api/admin/nft/pricing GET]", e);
    return NextResponse.json({ error: e?.message, nfts: [] }, { status: 500 });
  }
}

/**
 * POST /api/admin/nft/pricing
 * Update pricing for a single NFT.
 * Body: { cached_nft_id, chain_id, contract_address, token_id, mint_price_eth, mint_fee_eth, is_featured, is_listed }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      cached_nft_id,
      chain_id,
      contract_address,
      token_id,
      mint_price_eth,
      mint_fee_eth,
      is_featured,
      is_listed,
    } = body;

    if (!contract_address || !token_id) {
      return NextResponse.json(
        { error: "contract_address and token_id are required" },
        { status: 400 }
      );
    }

    const { getServiceSupabase } = await import("@/lib/supabase");
    const sb = getServiceSupabase();

    const { data, error } = await sb
      .from("nft_pricing")
      .upsert(
        {
          cached_nft_id: cached_nft_id || null,
          chain_id: chain_id || 8453,
          contract_address: contract_address.toLowerCase(),
          token_id: String(token_id),
          mint_price_eth: parseFloat(mint_price_eth) || 0.002,
          mint_fee_eth: parseFloat(mint_fee_eth) || 0.001,
          is_featured: !!is_featured,
          is_listed: is_listed !== false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "chain_id,contract_address,token_id" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, pricing: data });
  } catch (e: any) {
    console.error("[/api/admin/nft/pricing POST]", e);
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
