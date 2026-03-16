import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/db/supabase";
import { createSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code required" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedCode = String(code).trim();

    const sb = getSupabase();

    const { data: otp, error: otpErr } = await sb
      .from("otp_codes")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("code", normalizedCode)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpErr || !otp) {
      return NextResponse.json(
        { error: "Invalid or expired code" },
        { status: 401 }
      );
    }

    const { error: usedErr } = await sb
      .from("otp_codes")
      .update({ used: true })
      .eq("id", otp.id);

    if (usedErr) throw usedErr;

    const cookieStore = await cookies();
    const signupIntent = cookieStore.get("signup_intent")?.value;

    let isNewUser = false;
    let firstName: string | null = null;
    let username: string | null = null;

    if (signupIntent) {
      try {
        const intent = JSON.parse(signupIntent);
        if (intent.email === normalizedEmail) {
          isNewUser = true;
          firstName = intent.firstName?.trim() || null;
          username = intent.username?.trim() || null;
        }
      } catch (err) {
        console.error("signup_intent parse error:", err);
      }

      cookieStore.delete("signup_intent");
    }

    let profile: any = null;

    if (isNewUser) {
      const { data, error } = await sb
        .from("profiles")
        .insert({
          email: normalizedEmail,
          first_name: firstName,
          username,
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) throw error;
      if (!data?.id) throw new Error("Failed to create profile");

      const { data: freshProfile, error: freshErr } = await sb
        .from("profiles")
        .select("id, email, first_name, username, wallet_address, avatar_url, bio")
        .eq("id", data.id)
        .single();

      if (freshErr) throw freshErr;

      profile = freshProfile;
    } else {
      const { data, error } = await sb
        .from("profiles")
        .select("id, email, first_name, username, wallet_address, avatar_url, bio")
        .eq("email", normalizedEmail)
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

    const walletAddress = profile?.wallet_address
      ? String(profile.wallet_address).toLowerCase()
      : null;

    await createSession({
      email: profile.email,
      profileId: profile.id,
      firstName: profile.first_name || null,
      username: profile.username || null,
      wallet: walletAddress,
    });

    return NextResponse.json({
      success: true,
      isNewUser,
      session: {
        email: profile.email,
        wallet: walletAddress,
        profileId: profile.id,
        firstName: profile.first_name || null,
        username: profile.username || null,
      },
      profile: {
        id: profile.id,
        email: profile.email,
        first_name: profile.first_name,
        username: profile.username,
        wallet_address: walletAddress,
        avatar_url: profile.avatar_url || null,
        bio: profile.bio || null,
      },
    });
  } catch (err) {
    console.error("verify-otp error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}