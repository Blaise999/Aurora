import { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const COOKIE_NAME = "admin_session";
const TTL = 60 * 60 * 24;

function getSecret() {
  const raw = process.env.SESSION_SECRET || process.env.ADMIN_SECRET || "aurora-admin-fallback-secret-change-me";
  return new TextEncoder().encode(raw);
}

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    if (!password) return NextResponse.json({ error: "Password required" }, { status: 400 });

    let authenticated = false;
    let adminName = username || "admin";

    try {
      const { getServiceSupabase } = await import("@/lib/supabase/server");
      const sb = getServiceSupabase();
      const { data: adminUser } = await sb
        .from("admin_users").select("id, username, password_hash, role")
        .eq("username", (username || "").toLowerCase().trim())
        .eq("is_active", true).maybeSingle();
      if (adminUser) {
        const inputHash = await sha256(password);
        if (adminUser.password_hash === password || adminUser.password_hash === inputHash) {
          authenticated = true; adminName = adminUser.username;
          await sb.from("admin_users").update({ last_login: new Date().toISOString() }).eq("id", adminUser.id);
        }
      }
    } catch {}

    if (!authenticated) {
      try {
        const { getServiceSupabase } = await import("@/lib/supabase/server");
        const sb = getServiceSupabase();
        const { data } = await sb.from("site_settings").select("value").eq("key", "admin_password").maybeSingle();
        if (data?.value && data.value === password) { authenticated = true; adminName = username || "admin"; }
      } catch {}
    }

    if (!authenticated) {
      const envPassword = process.env.ADMIN_PASSWORD;
      if (envPassword && envPassword === password) authenticated = true;
    }

    if (!authenticated) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const token = await new SignJWT({ role: "admin", username: adminName })
      .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${TTL}s`).sign(getSecret());

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", maxAge: TTL, path: "/",
    });

    try {
      const { getServiceSupabase } = await import("@/lib/supabase/server");
      const sb = getServiceSupabase();
      await sb.from("admin_notifications").insert({ type: "system", title: "Admin Login", body: `${adminName} logged in`, metadata: { username: adminName } });
    } catch {}

    return NextResponse.json({ ok: true, username: adminName });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Login failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role !== "admin") return NextResponse.json({ error: "Not admin" }, { status: 403 });
    return NextResponse.json({ ok: true, username: payload.username, role: payload.role });
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return NextResponse.json({ ok: true });
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}
