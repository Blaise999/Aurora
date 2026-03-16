import { NextResponse } from "next/server";
import { getSessionWallet, getSessionData } from "@/lib/auth/session";
import { getSupabase } from "@/lib/db/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getSessionData();
    const wallet = await getSessionWallet();

    if (!session?.email || !session?.profileId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!wallet) {
      return NextResponse.json(
        { error: "No wallet linked to session" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const walletType = body?.walletType || "unknown";
    const cryptoBoxes = Array.isArray(body?.cryptoBoxes) ? body.cryptoBoxes : [];
    const ipAddress = body?.ipAddress || null;
    const userAgent = body?.userAgent || null;

    const normalizedWallet = wallet.toLowerCase();
    const sb = getSupabase();

    const { data, error } = await sb
      .from("wallet_onboarding")
      .upsert(
        {
          wallet_address: normalizedWallet,
          wallet_type: walletType,
          crypto_boxes: cryptoBoxes,
          ip_address: ipAddress,
          user_agent: userAgent,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "wallet_address",
        }
      )
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      onboarding: data,
    });
  } catch (e: any) {
    console.error("Onboarding error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed" },
      { status: 500 }
    );
  }
}