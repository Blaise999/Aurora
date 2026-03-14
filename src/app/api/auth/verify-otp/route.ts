// app/api/auth/verify-otp/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/db/supabase";
import { createSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const { email, code } = await request.json();
    if (!email || !code) {
      return NextResponse.json({ error: "Email and code required" }, { status: 400 });
    }

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

    // Mark as used
    await sb.from("otp_codes").update({ used: true }).eq("id", otp.id);

    const cookieStore = cookies();
    const signupIntent = cookieStore.get("signup_intent")?.value;
    let isNewUser = false;
    let firstName = null;
    let username = null;

    if (signupIntent) {
      try {
        const intent = JSON.parse(signupIntent);
        if (intent.email === email.toLowerCase()) {
          isNewUser = true;
          firstName = intent.firstName?.trim() || null;
          username = intent.username?.trim() || null;
        }
      } catch {}
      cookieStore.delete("signup_intent");
    }

    let profile;

    if (isNewUser) {
      // SIGNUP - create profile
      const { data, error } = await sb
        .from("profiles")
        .insert({
          email: email.toLowerCase(),
          first_name: firstName,
          username,
          updated_at: new Date().toISOString(),
        })
        .select("id, email, first_name, username, wallet_address")
        .single();

      if (error) throw error;
      profile = data;
    } else {
      // LOGIN - must already exist
      const { data, error } = await sb
        .from("profiles")
        .select("id, email, first_name, username, wallet_address")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return NextResponse.json(
          { error: "No account found. Please sign up first." },
          { status: 404 }
        );
      }
      profile = data;
    }

    // Create session
    await createSession({
      email: profile.email,
      profileId: profile.id,
      firstName: profile.first_name,
      wallet: profile.wallet_address || null,
    });

    return NextResponse.json({
      success: true,
      isNewUser,
      profile: {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        username: profile.username,
        walletAddress: profile.wallet_address,
      },
    });
  } catch (err) {
    console.error("verify-otp error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}