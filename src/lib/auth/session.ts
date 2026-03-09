import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "aurora_session";
const TTL_SECONDS = 60 * 60 * 24; // 24 h

function getSecret() {
  const raw = process.env.SESSION_SECRET;
  if (!raw || raw.length < 16) throw new Error("SESSION_SECRET too short");
  return new TextEncoder().encode(raw);
}

/** Create signed JWT and set HttpOnly cookie */
export async function createSession(walletAddress: string) {
  const secret = getSecret();
  const token = await new SignJWT({ wallet: walletAddress.toLowerCase() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TTL_SECONDS,
    path: "/",
  });
  return token;
}

/** Read + verify session cookie → wallet address or null */
export async function getSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, getSecret());
    return (payload.wallet as string) || null;
  } catch {
    return null;
  }
}

/** Delete session cookie */
export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
