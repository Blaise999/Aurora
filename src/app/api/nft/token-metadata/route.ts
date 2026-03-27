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

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const url = new URL(req.url);

    const key = url.searchParams.get("key")?.trim() || "";
    const pendingId = url.searchParams.get("pendingId")?.trim() || "";
    const tokenId = url.searchParams.get("tokenId")?.trim() || "";
    const contractAddress = url.searchParams.get("contract")?.trim().toLowerCase() || "";

    let row = null;
    let error = null;

    if (key) {
      const result = await supabase
        .from("user_listed")
        .select("*")
        .eq("metadata_key", key)
        .maybeSingle();

      row = result.data;
      error = result.error;
    } else if (pendingId) {
      const result = await supabase
        .from("user_listed")
        .select("*")
        .eq("token_id", pendingId)
        .maybeSingle();

      row = result.data;
      error = result.error;
    } else if (tokenId) {
      let query = supabase.from("user_listed").select("*").eq("token_id", tokenId);

      if (contractAddress) {
        query = query.eq("contract_address", contractAddress);
      }

      const result = await query.maybeSingle();
      row = result.data;
      error = result.error;
    } else {
      return NextResponse.json({ error: "Missing key or tokenId" }, { status: 400 });
    }

    if (error) {
      return NextResponse.json(
        { error: `Failed to load metadata: ${error.message}` },
        { status: 500 }
      );
    }

    if (!row) {
      return NextResponse.json({ error: "Metadata not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        name: row.name || "Aurora NFT",
        description: row.description || "",
        image: row.image_url || "",
        external_url: row.external_url || "",
        attributes: Array.isArray(row.attributes) ? row.attributes : [],
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=60",
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("[/api/nft/token-metadata] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}