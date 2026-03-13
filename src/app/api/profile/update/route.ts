import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/profile/update
 * Body: { firstName, username, bio, avatarUrl }
 */
export async function POST(req: Request) {
  try {
    const { getSessionData, updateSession } = await import("@/lib/auth/session");
    const session = await getSessionData();
    if (!session?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { getSupabase } = await import("@/lib/db/supabase");
    const sb = getSupabase();

    const updateData: any = { updated_at: new Date().toISOString() };
    if (body.firstName !== undefined) updateData.first_name = body.firstName;
    if (body.username !== undefined) updateData.username = body.username?.toLowerCase() || null;
    if (body.bio !== undefined) updateData.bio = body.bio;
    if (body.avatarUrl !== undefined) updateData.avatar_url = body.avatarUrl;

    // Username uniqueness check
    if (updateData.username) {
      const { data: existing } = await sb
        .from("profiles")
        .select("id")
        .eq("username", updateData.username)
        .neq("email", session.email)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: "Username taken" }, { status: 409 });
      }
    }

    const { data: profile, error } = await sb
      .from("profiles")
      .update(updateData)
      .eq("email", session.email)
      .select()
      .single();

    if (error) throw error;

    if (body.firstName) {
      await updateSession({ firstName: body.firstName });
    }

    return NextResponse.json({ ok: true, profile });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
