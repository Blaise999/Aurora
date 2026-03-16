import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/db/supabase";
import { getSessionData, createSession } from "@/lib/auth/session";

export const runtime = "nodejs";

/** GET /api/auth/session — return current user session */
export async function GET() {
  try {
    const session = await getSessionData();

    if (!session?.email || !session?.profileId) {
      return NextResponse.json({
        authenticated: false,
        session: null,
        profile: null,
      });
    }

    const sb = getSupabase();

    const { data: profile, error } = await sb
      .from("profiles")
      .select("id, email, first_name, username, wallet_address, avatar_url, bio")
      .eq("id", session.profileId)
      .maybeSingle();

    if (error) throw error;

    if (!profile) {
      return NextResponse.json({
        authenticated: false,
        session: null,
        profile: null,
      });
    }

    const freshWallet = profile.wallet_address
      ? String(profile.wallet_address).toLowerCase()
      : null;

    const sessionWallet = session.wallet
      ? String(session.wallet).toLowerCase()
      : null;

    if (
      freshWallet !== sessionWallet ||
      (profile.first_name || null) !== (session.firstName || null) ||
      (profile.username || null) !== (session.username || null)
    ) {
      await createSession({
        email: profile.email,
        wallet: freshWallet,
        profileId: profile.id,
        firstName: profile.first_name || null,
        username: profile.username || null,
      });
    }

    return NextResponse.json({
      authenticated: true,
      session: {
        email: profile.email,
        wallet: freshWallet,
        profileId: profile.id,
        firstName: profile.first_name || null,
        username: profile.username || null,
      },
      profile: {
        id: profile.id,
        email: profile.email,
        first_name: profile.first_name,
        username: profile.username,
        wallet_address: freshWallet,
        avatar_url: profile.avatar_url || null,
        bio: profile.bio || null,
      },
    });
  } catch (e: any) {
    console.error("auth/session error:", e);
    return NextResponse.json(
      {
        authenticated: false,
        session: null,
        profile: null,
        error: e?.message,
      },
      { status: 500 }
    );
  }
}