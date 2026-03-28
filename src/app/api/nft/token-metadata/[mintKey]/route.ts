import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase admin environment variables");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function buildJson(row: any) {
  return {
    name: row?.name || "Aurora NFT",
    description: row?.description || "",
    image: row?.image_url || "",
    external_url: row?.external_url || "",
    attributes: Array.isArray(row?.attributes) ? row.attributes : [],
  };
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ mintKey: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { mintKey } = await context.params;

    const key = String(mintKey || "").trim();

    if (!key) {
      return NextResponse.json({ error: "Missing mintKey" }, { status: 400 });
    }

    const { data: row, error } = await supabase
      .from("user_listed")
      .select("*")
      .eq("metadata_key", key)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: `Failed to load metadata: ${error.message}` },
        { status: 500 }
      );
    }

    if (!row) {
      return NextResponse.json({ error: "Metadata not found" }, { status: 404 });
    }

    return NextResponse.json(buildJson(row), {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("[/api/nft/token-metadata/[mintKey]] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}