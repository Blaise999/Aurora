import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) {
      return NextResponse.json({ error: "Email and code required" }, { status: 400 });
    }

    const { getSupabase } = await import("@/lib/db/supabase");
    const { createSession } = await import("@/lib/auth/session");
    const sb = getSupabase();

    // Find valid OTP
    const { data: otp, error: otpErr } = await sb
      .from("otp_codes")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("code", code)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpErr || !otp) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
    }

    // Mark OTP as used
    await sb.from("otp_codes").update({ used: true }).eq("id", otp.id);

    // Upsert profile
    const { data: profile } = await sb
      .from("profiles")
      .upsert(
        { email: email.toLowerCase(), updated_at: new Date().toISOString() },
        { onConflict: "email" }
      )
      .select("id, email, first_name, username, wallet_address")
      .single();

    // Create session
    await createSession({
      email: profile?.email || email.toLowerCase(),
      profileId: profile?.id || null,
      firstName: profile?.first_name || null,
      wallet: profile?.wallet_address || null,
    });

    return NextResponse.json({
      ok: true,
      profile: {
        id: profile?.id,
        email: profile?.email,
        firstName: profile?.first_name,
        username: profile?.username,
        walletAddress: profile?.wallet_address,
      },
    });
  } catch (e: any) {
    console.error("[verify-otp]", e);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
