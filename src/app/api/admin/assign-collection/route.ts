import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/admin/assign-collection
 * Body: { profileId, cachedNftId, chainId, contractAddress, tokenId }
 * Assigns an NFT to a user's collection
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profileId, cachedNftId, chainId, contractAddress, tokenId } = body;

    if (!profileId || !contractAddress || !tokenId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { getSupabase } = await import("@/lib/db/supabase");
    const sb = getSupabase();

    const { data, error } = await sb.from("user_collections").upsert(
      {
        profile_id: profileId,
        cached_nft_id: cachedNftId || null,
        chain_id: chainId || 8453,
        contract_address: contractAddress.toLowerCase(),
        token_id: String(tokenId),
        assigned_by: "admin",
        assigned_at: new Date().toISOString(),
      },
      { onConflict: "profile_id,chain_id,contract_address,token_id" }
    ).select().single();

    if (error) throw error;

    return NextResponse.json({ ok: true, assignment: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/assign-collection
 * Body: { profileId, chainId, contractAddress, tokenId }
 */
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { profileId, chainId, contractAddress, tokenId } = body;

    const { getSupabase } = await import("@/lib/db/supabase");
    const sb = getSupabase();

    await sb.from("user_collections")
      .delete()
      .eq("profile_id", profileId)
      .eq("chain_id", chainId || 8453)
      .eq("contract_address", contractAddress.toLowerCase())
      .eq("token_id", String(tokenId));

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
