import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/db/supabase";
import { getSessionData, createSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getSessionData();

    if (!session?.email || !session?.profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const normalizedWallet = String(walletAddress).toLowerCase();
    const sb = getSupabase();

    const { data: updated, error } = await sb
      .from("profiles")
      .update({
        wallet_address: normalizedWallet,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.profileId)
      .select("id, email, first_name, username, wallet_address, avatar_url, bio")
      .single();

    if (error) throw error;

    await createSession({
      email: updated.email,
      wallet: updated.wallet_address || null,
      profileId: updated.id,
      firstName: updated.first_name || null,
      username: updated.username || null,
    });

    return NextResponse.json({
      success: true,
      session: {
        email: updated.email,
        wallet: updated.wallet_address || null,
        profileId: updated.id,
        firstName: updated.first_name || null,
        username: updated.username || null,
      },
      profile: {
        id: updated.id,
        email: updated.email,
        first_name: updated.first_name,
        username: updated.username,
        wallet_address: updated.wallet_address || null,
        avatar_url: updated.avatar_url || null,
        bio: updated.bio || null,
      },
    });
  } catch (err) {
    console.error("link-wallet error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}