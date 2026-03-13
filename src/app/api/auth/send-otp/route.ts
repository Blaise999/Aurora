import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const { getSupabase } = await import("@/lib/db/supabase");
    const { generateOtp, sendOtpEmail } = await import("@/lib/resend");
    const sb = getSupabase();

    // Generate 6-digit OTP
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    // Invalidate old codes for this email
    await sb.from("otp_codes").update({ used: true }).eq("email", email.toLowerCase()).eq("used", false);

    // Store new code
    await sb.from("otp_codes").insert({
      email: email.toLowerCase(),
      code,
      expires_at: expiresAt,
    });

    // Send via Resend
    const sent = await sendOtpEmail(email, code);
    if (!sent) {
      return NextResponse.json({ error: "Failed to send email. Check Resend config." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "OTP sent" });
  } catch (e: any) {
    console.error("[send-otp]", e);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
