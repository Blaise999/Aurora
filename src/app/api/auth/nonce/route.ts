import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/** GET /api/auth/nonce — returns a random nonce, stores it in a short-lived cookie */
export async function GET() {
  const nonce = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("siwe_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300, // 5 min
    path: "/",
  });
  return NextResponse.json({ nonce });
}
