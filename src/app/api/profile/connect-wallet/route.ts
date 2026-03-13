import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/profile/connect-wallet
 * Body: { walletAddress, username, walletType }
 * Requires active email session
 */
export async function POST(req: Request) {
  try {
    const { getSessionData, updateSession } = await import("@/lib/auth/session");
    const session = await getSessionData();
    if (!session?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { walletAddress, username, walletType } = await req.json();
    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
    }

    const { getSupabase } = await import("@/lib/db/supabase");
    const sb = getSupabase();

    // Check if username is taken by another user
    if (username) {
      const { data: existing } = await sb
        .from("profiles")
        .select("id")
        .eq("username", username.toLowerCase())
        .neq("email", session.email)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }
    }

    // Update profile with wallet + username
    const updateData: any = {
      wallet_address: walletAddress.toLowerCase(),
      updated_at: new Date().toISOString(),
    };
    if (username) updateData.username = username.toLowerCase();

    const { data: profile, error } = await sb
      .from("profiles")
      .update(updateData)
      .eq("email", session.email)
      .select("id, email, first_name, username, wallet_address")
      .single();

    if (error) throw error;

    // Update session with wallet
    await updateSession({
      wallet: walletAddress.toLowerCase(),
      profileId: profile?.id,
    });

    // Telegram notification
    try {
      const { telegramNotifyWalletConnect } = await import("@/lib/telegram");
      await telegramNotifyWalletConnect({
        firstName: profile?.first_name,
        username: profile?.username || username,
        walletAddress,
        walletType: walletType || "Unknown",
      });
    } catch {}

    return NextResponse.json({ ok: true, profile });
  } catch (e: any) {
    console.error("[connect-wallet]", e);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
