import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/** Verify admin session cookie — returns admin username or null */
async function verifyAdmin(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session")?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(
      process.env.SESSION_SECRET || process.env.ADMIN_SECRET || "aurora-admin-fallback-secret-change-me"
    );
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== "admin") return null;
    return (payload.username as string) || "admin";
  } catch {
    return null;
  }
}

async function getSettingsMintFee(sb: any): Promise<string> {
  const { data } = await sb
    .from("site_settings")
    .select("value")
    .eq("key", "minting_fee")
    .maybeSingle();
  return data?.value || "0.002";
}

async function getCachedNftById(sb: any, cachedNftId: string | number | null) {
  if (!cachedNftId) return null;
  const { data } = await sb.from("cached_nfts").select("*").eq("id", cachedNftId).single();
  return data || null;
}

/**
 * POST /api/admin/assign-collection
 * Body: { profileId, cachedNftId, chainId, contractAddress, tokenId }
 * REQUIRES admin session cookie.
 */
export async function POST(req: Request) {
  try {
    const adminUser = await verifyAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized — admin login required" }, { status: 401 });
    }

    const body = await req.json();
    const { profileId, cachedNftId, chainId, contractAddress, tokenId } = body;

    if (!profileId || !contractAddress || tokenId === undefined || tokenId === null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { getSupabase } = await import("@/lib/db/supabase");
    const sb = getSupabase();

    const cachedNft = await getCachedNftById(sb, cachedNftId || null);
    const defaultMintFee = await getSettingsMintFee(sb);

    // Check for nft_pricing override
    let pricingOverride: any = null;
    if (cachedNft?.id) {
      const { data: pData } = await sb
        .from("nft_pricing")
        .select("mint_price_eth, mint_fee_eth")
        .eq("cached_nft_id", cachedNft.id)
        .maybeSingle();
      if (pData) pricingOverride = pData;
    }

    const liveMintFee = parseFloat(pricingOverride?.mint_fee_eth ?? defaultMintFee ?? "0.002");
    const liveNftPrice = parseFloat(pricingOverride?.mint_price_eth ?? defaultMintFee ?? "0.002");
    const safeMintFee = Number.isFinite(liveMintFee) ? liveMintFee : 0.002;
    const safeNftPrice = Number.isFinite(liveNftPrice) ? liveNftPrice : 0.002;
    const safeTotalValue = Number((safeNftPrice + safeMintFee).toFixed(6));

    const payload = {
      profile_id: profileId,
      cached_nft_id: cachedNft?.id ?? cachedNftId ?? null,
      chain_id: cachedNft?.chain_id ?? chainId ?? 8453,
      contract_address: String(cachedNft?.contract_address ?? contractAddress ?? "").toLowerCase(),
      token_id: String(cachedNft?.token_id ?? tokenId ?? ""),
      assigned_by: `admin:${adminUser}`,
      assigned_at: new Date().toISOString(),
      image_url: cachedNft?.image_url ?? "",
      nft_name: cachedNft?.name ?? "Assigned NFT",
      name: cachedNft?.name ?? "Assigned NFT",
      description: cachedNft?.description ?? "",
      collection: cachedNft?.collection_name ?? null,
      token_type: cachedNft?.token_type ?? "ERC-721",
      attributes: cachedNft?.attributes ?? [],
      nft_price_eth: safeNftPrice,
      mint_fee_eth: safeMintFee,
      total_value_eth: safeTotalValue,
      pricing_source: "admin_assign",
    };

    const { data, error } = await sb
      .from("user_collections")
      .upsert(payload, { onConflict: "profile_id,chain_id,contract_address,token_id" })
      .select()
      .single();

    if (error) throw error;

    // Log activity in transactions table
    try {
      await sb.from("transactions").insert({
        wallet_address: "admin",
        profile_id: profileId,
        tx_hash: `admin-assign-${Date.now()}`,
        tx_type: "admin_assign",
        chain_id: payload.chain_id,
        contract_address: payload.contract_address,
        token_id: payload.token_id,
        amount_eth: 0,
        admin_wallet: "admin",
        status: "confirmed",
        metadata: { assigned_by: adminUser, nft_name: payload.nft_name },
      });
    } catch {}

    return NextResponse.json({ ok: true, assignment: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/assign-collection
 * REQUIRES admin session cookie.
 */
export async function DELETE(req: Request) {
  try {
    const adminUser = await verifyAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized — admin login required" }, { status: 401 });
    }

    const body = await req.json();
    const { profileId, chainId, contractAddress, tokenId } = body;

    if (!profileId || !contractAddress || tokenId === undefined || tokenId === null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { getSupabase } = await import("@/lib/db/supabase");
    const sb = getSupabase();

    const { error } = await sb
      .from("user_collections")
      .delete()
      .eq("profile_id", profileId)
      .eq("chain_id", chainId || 8453)
      .eq("contract_address", String(contractAddress).toLowerCase())
      .eq("token_id", String(tokenId));

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
