import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "aurora_session";
const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret() {
  const raw = process.env.SESSION_SECRET;
  if (!raw || raw.length < 16) throw new Error("SESSION_SECRET too short");
  return new TextEncoder().encode(raw);
}

/** Create signed JWT and set HttpOnly cookie */
export async function createSession(data: {
  email?: string | null;
  wallet?: string | null;
  profileId?: number | null;
  firstName?: string | null;
}) {
  const secret = getSecret();
  const token = await new SignJWT({
    email: data.email || null,
    wallet: data.wallet?.toLowerCase() || null,
    profileId: data.profileId || null,
    firstName: data.firstName || null,
  })
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

/** Update session with new data (merges with existing) */
export async function updateSession(newData: Record<string, any>) {
  const existing = await getSessionData();
  if (!existing) return null;
  return createSession({ ...existing, ...newData });
}

/** Read + verify session cookie → full session object or null */
export async function getSessionData(): Promise<{
  email: string | null;
  wallet: string | null;
  profileId: number | null;
  firstName: string | null;
} | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, getSecret());
    return {
      email: (payload.email as string) || null,
      wallet: (payload.wallet as string) || null,
      profileId: (payload.profileId as number) || null,
      firstName: (payload.firstName as string) || null,
    };
  } catch {
    return null;
  }
}

/** Backwards-compat: get wallet address from session */
export async function getSession(): Promise<string | null> {
  const data = await getSessionData();
  return data?.wallet || null;
}

/** Get email from session */
export async function getSessionEmail(): Promise<string | null> {
  const data = await getSessionData();
  return data?.email || null;
}

/** Delete session cookie */
export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
