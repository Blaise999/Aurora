import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/admin/nft/pricing
 * Returns all cached NFTs joined with their pricing data for the admin table.
 * Supports: ?search=term&chain=8453&featured=true&listed=true&page=1&limit=50
 */
export async function GET(request) {
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
    let nfts = (data || []).map((row) => {
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
    if (featured === "true") nfts = nfts.filter((n) => n.is_featured);
    if (featured === "false") nfts = nfts.filter((n) => !n.is_featured);
    if (listed === "true") nfts = nfts.filter((n) => n.is_listed);
    if (listed === "false") nfts = nfts.filter((n) => !n.is_listed);

    return NextResponse.json({
      nfts,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (e) {
    console.error("[/api/admin/nft/pricing GET]", e);
    return NextResponse.json(
      { error: e?.message || "Unknown error", nfts: [] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/nft/pricing
 * Update pricing for a single NFT.
 * Body: { cached_nft_id, chain_id, contract_address, token_id, mint_price_eth, mint_fee_eth, is_featured, is_listed }
 */
export async function POST(request) {
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
  } catch (e) {
    console.error("[/api/admin/nft/pricing POST]", e);
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
/**
 * PUT /api/admin/nft/pricing
 * Bulk-update pricing for all (or filtered) NFTs.
 * Body: {
 *   min_price_eth, max_price_eth,     — random price in this range
 *   mint_fee_eth,                      — flat fee for all
 *   filter_chain_id?,                  — optional: only this chain
 *   filter_collection?,                — optional: only matching collection
 *   filter_featured?,                  — optional: true/false
 * }
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      min_price_eth,
      max_price_eth,
      mint_fee_eth,
      filter_chain_id,
      filter_collection,
      filter_featured,
    } = body;

    if (min_price_eth == null || max_price_eth == null) {
      return NextResponse.json(
        { error: "min_price_eth and max_price_eth are required" },
        { status: 400 }
      );
    }

    const minP = parseFloat(min_price_eth);
    const maxP = parseFloat(max_price_eth);
    if (isNaN(minP) || isNaN(maxP) || minP < 0 || maxP < minP) {
      return NextResponse.json(
        { error: "Invalid price range" },
        { status: 400 }
      );
    }

    const fee = mint_fee_eth != null ? parseFloat(mint_fee_eth) : null;

    const { getServiceSupabase } = await import("@/lib/supabase");
    const sb = getServiceSupabase();

    // 1. Get matching cached_nfts IDs
    let query = sb
      .from("cached_nfts")
      .select("id, chain_id, contract_address, token_id, collection_name")
      .eq("is_active", true);

    if (filter_chain_id) query = query.eq("chain_id", parseInt(filter_chain_id));
    if (filter_collection) query = query.ilike("collection_name", `%${filter_collection}%`);

    const { data: nfts, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    if (!nfts || nfts.length === 0) {
      return NextResponse.json({ ok: true, updated: 0, message: "No NFTs matched filters" });
    }

    // 2. If filter_featured is set, we need to check existing pricing
    let targetNfts = nfts;
    if (filter_featured === "true" || filter_featured === "false") {
      const ids = nfts.map(n => n.id);
      const { data: pricingRows } = await sb
        .from("nft_pricing")
        .select("cached_nft_id, is_featured")
        .in("cached_nft_id", ids);

      const featuredSet = new Set();
      (pricingRows || []).forEach(p => {
        if (filter_featured === "true" && p.is_featured) featuredSet.add(p.cached_nft_id);
        if (filter_featured === "false" && !p.is_featured) featuredSet.add(p.cached_nft_id);
      });
      targetNfts = nfts.filter(n => featuredSet.has(n.id));
    }

    if (targetNfts.length === 0) {
      return NextResponse.json({ ok: true, updated: 0, message: "No NFTs matched filters" });
    }

    // 3. Build upsert rows with random price in range
    const rows = targetNfts.map(n => {
      const randomPrice = minP === maxP
        ? minP
        : Math.round((minP + Math.random() * (maxP - minP)) * 10000) / 10000;

      const row = {
        cached_nft_id: n.id,
        chain_id: n.chain_id,
        contract_address: n.contract_address.toLowerCase(),
        token_id: String(n.token_id),
        mint_price_eth: randomPrice,
        updated_at: new Date().toISOString(),
      };
      if (fee !== null) row.mint_fee_eth = fee;
      return row;
    });

    // 4. Upsert in batches of 200
    let updated = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const batch = rows.slice(i, i + 200);
      const { error: upsertErr } = await sb
        .from("nft_pricing")
        .upsert(batch, { onConflict: "chain_id,contract_address,token_id" });
      if (upsertErr) {
        console.error("[BULK PRICING] batch error:", upsertErr);
      } else {
        updated += batch.length;
      }
    }

    return NextResponse.json({
      ok: true,
      updated,
      total: targetNfts.length,
      priceRange: `${minP} - ${maxP} ETH`,
      fee: fee !== null ? `${fee} ETH` : "unchanged",
    });
  } catch (e) {
    console.error("[/api/admin/nft/pricing PUT]", e);
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
