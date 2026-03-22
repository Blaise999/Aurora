import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/db/supabase";

/**
 * GET /api/settings
 * Public endpoint — returns safe site settings as a flat key->value object.
 * Admin-only writes go through /api/admin/settings.
 */
export async function GET() {
  try {
    const sb = getSupabase();

    const { data, error } = await sb.from("site_settings").select("*");

    if (error) throw error;

    const settings = {};
    (data || []).forEach((row) => {
      settings[row.key] = row.value;
    });

    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to load settings" },
      { status: 500 }
    );
  }
}
