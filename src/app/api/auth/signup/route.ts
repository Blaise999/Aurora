import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/db/supabase";
import { generateOtp, sendOtpEmail } from "@/lib/resend"; // assuming you have these

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { email, firstName, username } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }
    if (!firstName || firstName.trim().length < 2) {
      return NextResponse.json({ error: "First name is required (min 2 chars)" }, { status: 400 });
    }
    // Username optional, but if provided → check uniqueness early
    let finalUsername = null;
    if (username && username.trim()) {
      finalUsername = username.trim().toLowerCase();
      if (finalUsername.length < 3) {
        return NextResponse.json({ error: "Username too short (min 3 chars)" }, { status: 400 });
      }
    }

    const sb = getSupabase();

    // Check if email already exists → if yes, suggest login instead
    const { data: existing } = await sb
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Email already registered. Please log in instead." },
        { status: 409 }
      );
    }

    // Optional: check username uniqueness if provided
    if (finalUsername) {
      const { data: userWithName } = await sb
        .from("profiles")
        .select("id")
        .eq("username", finalUsername)
        .maybeSingle();
      if (userWithName) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }
    }

    // Invalidate old OTPs
    await sb.from("otp_codes").update({ used: true }).eq("email", email.toLowerCase()).eq("used", false);

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await sb.from("otp_codes").insert({
      email: email.toLowerCase(),
      code,
      expires_at: expiresAt,
      // Optional: store temp signup data in the OTP row if you want
      // metadata: { first_name: firstName, username: finalUsername }
    });

    const sent = await sendOtpEmail(email, code);
    if (!sent) {
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    // Temporarily store signup intent in cookie (very short-lived)
    const cookieStore = await cookies();
    cookieStore.set("signup_intent", JSON.stringify({
      email: email.toLowerCase(),
      firstName,
      username: finalUsername,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 min – same as OTP
      path: "/",
    });

    return NextResponse.json({ ok: true, message: "OTP sent – complete signup" });
  } catch (e: any) {
    console.error("[signup]", e);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}