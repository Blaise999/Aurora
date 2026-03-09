import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { getServiceSupabase } = await import("@/lib/supabase");
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from("cache_sync_log")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(5);
    if (error) throw error;
    return NextResponse.json({ logs: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message, logs: [] }, { status: 500 });
  }
}
