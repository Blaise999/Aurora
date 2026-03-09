import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyMessage } from "viem";
import { createSession } from "@/lib/auth/session";

export const runtime = "nodejs";

/**
 * POST /api/auth/verify
 * Body: { message, signature, address }
 *
 * 1. Verify the SIWE message signature matches address
 * 2. Check nonce matches the one we issued
 * 3. Create HttpOnly JWT session cookie
 */
export async function POST(req: Request) {
  try {
    const { message, signature, address } = await req.json();
    if (!message || !signature || !address) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Rate limit: simple in-memory check (use Redis in prod)
    // For now just validate

    // 1. Verify signature
    const addr = address.toLowerCase();
    const valid = await verifyMessage({
      address: addr as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 2. Extract and verify nonce from message
    const nonceMatch = message.match(/Nonce: ([^\n]+)/);
    const msgNonce = nonceMatch?.[1]?.trim();
    const cookieStore = await cookies();
    const storedNonce = cookieStore.get("siwe_nonce")?.value;

    if (!msgNonce || !storedNonce || msgNonce !== storedNonce) {
      return NextResponse.json({ error: "Invalid nonce" }, { status: 401 });
    }

    // Clear nonce cookie
    cookieStore.delete("siwe_nonce");

    // 3. Create session
    await createSession(addr);

    return NextResponse.json({ ok: true, address: addr });
  } catch (e: any) {
    console.error("Auth verify error:", e);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
