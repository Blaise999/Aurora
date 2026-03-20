import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (!q) {
      const { data, error } = await supabase
        .from("public_profiles")
        .select("id, username, display_name, avatar_url, bio, created_at")
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) throw error;

      return NextResponse.json({ users: data || [] });
    }

    const { data, error } = await supabase
      .from("public_profiles")
      .select("id, username, display_name, avatar_url, bio, created_at")
      .or(`username.ilike.%${q}%,first_name.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(20);

    if (error) throw error;

    return NextResponse.json({ users: data || [] });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to search users" },
      { status: 500 }
    );
  }
}