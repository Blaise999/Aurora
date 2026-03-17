import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST() {
  // Destroy the JWT session
  await destroySession();

  // Also nuke any other auth-related cookies
  try {
    const cookieStore = await cookies();
    cookieStore.delete("aurora_session");
    cookieStore.delete("admin_session");
  } catch (_) {}

  const res = NextResponse.json({ ok: true });

  // Belt-and-suspenders: set expired cookies in response headers too
  res.headers.append(
    "Set-Cookie",
    "aurora_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax"
  );
  res.headers.append(
    "Set-Cookie",
    "admin_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax"
  );

  return res;
}
