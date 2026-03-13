import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** GET /api/auth/session — return current user session */
export async function GET() {
  try {
    const { getSessionData } = await import("@/lib/auth/session");
    const session = await getSessionData();
    if (!session?.email) {
      return NextResponse.json({ authenticated: false });
    }

    // Fetch full profile
    const { getSupabase } = await import("@/lib/db/supabase");
    const sb = getSupabase();
    const { data: profile } = await sb
      .from("profiles")
      .select("id, email, first_name, username, wallet_address, avatar_url, bio")
      .eq("email", session.email)
      .maybeSingle();

    return NextResponse.json({
      authenticated: true,
      session: {
        email: session.email,
        wallet: session.wallet,
        profileId: session.profileId,
        firstName: session.firstName,
      },
      profile: profile || null,
    });
  } catch (e: any) {
    return NextResponse.json({ authenticated: false, error: e?.message }, { status: 500 });
  }
}
