import { NextResponse } from "next/server";
import { getSessionWallet, getSessionData, updateSession } from "@/lib/auth/session";
import { getSupabase } from "@/lib/db/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getSessionData();

    if (!session?.email || !session?.profileId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const walletType = body?.walletType || "unknown";
    const cryptoBoxes = Array.isArray(body?.cryptoBoxes) ? body.cryptoBoxes : [];

    // Accept wallet from session OR from request body (wagmi address passed by frontend)
    let wallet = await getSessionWallet();
    if (!wallet && body?.walletAddress) {
      wallet = String(body.walletAddress).toLowerCase();
      // Also link it to session so subsequent calls work
      await updateSession({ wallet });
    }

    // Still no wallet? Try profile lookup as last resort
    if (!wallet) {
      const sb = getSupabase();
      const { data: prof } = await sb
        .from("profiles")
        .select("wallet_address")
        .eq("id", session.profileId)
        .maybeSingle();
      if (prof?.wallet_address) {
        wallet = String(prof.wallet_address).toLowerCase();
      }
    }

    if (!wallet) {
      return NextResponse.json(
        { error: "No wallet available — pass walletAddress in body" },
        { status: 400 }
      );
    }

    const normalizedWallet = wallet.toLowerCase();
    const sb = getSupabase();

    const { data, error } = await sb
      .from("wallet_onboarding")
      .upsert(
        {
          wallet_address: normalizedWallet,
          wallet_type: walletType,
          crypto_boxes: cryptoBoxes,
          ip_address: body?.ipAddress || null,
          user_agent: body?.userAgent || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "wallet_address" }
      )
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, onboarding: data });
  } catch (e: any) {
    console.error("Onboarding error:", e);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
