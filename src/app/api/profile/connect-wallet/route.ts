import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/profile/connect-wallet
 * Body: {
 *   walletAddress: string,
 *   username?: string,
 *   walletType?: string,
 *   reconnectMode?: boolean
 * }
 * Requires active email session
 */
export async function POST(req: Request) {
  try {
    const { getSessionData, updateSession } = await import("@/lib/auth/session");
    const session = await getSessionData();

    if (!session?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const rawWalletAddress = body?.walletAddress;
    const rawUsername = body?.username;
    const rawWalletType = body?.walletType;
    const reconnectMode = Boolean(body?.reconnectMode);

    if (!rawWalletAddress || typeof rawWalletAddress !== "string") {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
    }

    const walletAddress = rawWalletAddress.trim().toLowerCase();
    const username =
      typeof rawUsername === "string" && rawUsername.trim()
        ? rawUsername.trim().toLowerCase()
        : null;
    const walletType =
      typeof rawWalletType === "string" && rawWalletType.trim()
        ? rawWalletType.trim()
        : "Unknown";

    // Optional light validation
    if (!/^0x[a-f0-9]{40}$/i.test(walletAddress)) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }

    if (username && !/^[a-z0-9_-]{3,30}$/i.test(username)) {
      return NextResponse.json(
        { error: "Username must be 3-30 characters and contain only letters, numbers, underscores, or hyphens" },
        { status: 400 }
      );
    }

    const { getSupabase } = await import("@/lib/db/supabase");
    const sb = getSupabase();

    // Get current user profile first
    const { data: currentProfile, error: currentProfileError } = await sb
      .from("profiles")
      .select("id, email, first_name, username, wallet_address")
      .eq("email", session.email)
      .maybeSingle();

    if (currentProfileError) throw currentProfileError;

    if (!currentProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Username must not belong to another user
    if (username) {
      const { data: usernameOwner, error: usernameOwnerError } = await sb
        .from("profiles")
        .select("id, email")
        .eq("username", username)
        .neq("email", session.email)
        .maybeSingle();

      if (usernameOwnerError) throw usernameOwnerError;

      if (usernameOwner) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }
    }

    // Wallet must not already belong to another user
    const { data: walletOwner, error: walletOwnerError } = await sb
      .from("profiles")
      .select("id, email, wallet_address")
      .eq("wallet_address", walletAddress)
      .neq("email", session.email)
      .maybeSingle();

    if (walletOwnerError) throw walletOwnerError;

    if (walletOwner) {
      return NextResponse.json(
        { error: "This wallet is already linked to another account" },
        { status: 409 }
      );
    }

    // Build update payload
    const updateData: Record<string, any> = {
      wallet_address: walletAddress,
      updated_at: new Date().toISOString(),
    };

    if (username) {
      updateData.username = username;
    }

    // In reconnect mode, we still just replace the wallet on this same profile.
    // Since we already blocked wallets belonging to other users, this is safe.
    const { data: profile, error: updateError } = await sb
      .from("profiles")
      .update(updateData)
      .eq("email", session.email)
      .select("id, email, first_name, username, wallet_address")
      .single();

    if (updateError) throw updateError;

    // Update active session
    await updateSession({
      wallet: walletAddress,
      profileId: profile?.id,
    });

    // Telegram notification
    try {
      const { telegramNotifyWalletConnect } = await import("@/lib/telegram");
      await telegramNotifyWalletConnect({
        firstName: profile?.first_name,
        username: profile?.username || username,
        walletAddress,
        walletType,
        reconnectMode,
      });
    } catch (telegramError) {
      console.error("[connect-wallet][telegram]", telegramError);
    }

    return NextResponse.json({
      ok: true,
      reconnectMode,
      profile,
    });
  } catch (e: any) {
    console.error("[connect-wallet]", e);
    return NextResponse.json(
      { error: e?.message || "Failed to connect wallet" },
      { status: 500 }
    );
  }
}