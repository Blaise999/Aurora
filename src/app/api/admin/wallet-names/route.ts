import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export const runtime = "nodejs";

/**
 * Verify admin session cookie
 */
async function verifyAdmin(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session")?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(
      process.env.SESSION_SECRET ||
        process.env.ADMIN_SECRET ||
        "aurora-admin-fallback-secret-change-me"
    );

    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== "admin") return null;

    return (payload.username as string) || "admin";
  } catch {
    return null;
  }
}

/**
 * GET /api/admin/wallet-names
 * Returns all active user profiles with wallet info, seeded flag,
 * collection count, and minted count for admin tools.
 */
export async function GET() {
  try {
    const adminUser = await verifyAdmin();
    if (!adminUser) {
      return NextResponse.json(
        { error: "Unauthorized — admin login required", profiles: [] },
        { status: 401 }
      );
    }

    const { getSupabase } = await import("@/lib/db/supabase");
    const sb = getSupabase();

    const { data, error } = await sb
      .from("profiles")
      .select(
        `
          id,
          email,
          first_name,
          username,
          wallet_address,
          created_at,
          updated_at,
          is_active,
          is_seeded,
          seed_batch,
          is_public,
          avatar_url,
          bio
        `
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const profiles = await Promise.all(
      (data || []).map(async (p: any) => {
        const [{ count: collCount }, { count: listedCount }] = await Promise.all([
          sb
            .from("user_collections")
            .select("id", { count: "exact", head: true })
            .eq("profile_id", p.id),

          sb
            .from("user_listed")
            .select("id", { count: "exact", head: true })
            .eq("profile_id", p.id),
        ]);

        return {
          ...p,
          is_seeded: Boolean(p.is_seeded),
          is_public: p.is_public ?? true,
          collectionCount: collCount || 0,
          mintCount: listedCount || 0,
          userType: p.is_seeded ? "seeded" : "regular",
        };
      })
    );

    const seededCount = profiles.filter((p: any) => p.is_seeded).length;
    const regularCount = profiles.length - seededCount;

    return NextResponse.json({
      ok: true,
      profiles,
      total: profiles.length,
      seededCount,
      regularCount,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: e?.message || "Failed to load profiles",
        profiles: [],
        total: 0,
        seededCount: 0,
        regularCount: 0,
      },
      { status: 500 }
    );
  }
}