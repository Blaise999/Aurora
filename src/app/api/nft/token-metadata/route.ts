import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/nft/token-metadata?contract=0x...&tokenId=123
 *
 * Serves ERC-721 metadata JSON. This is what OpenSea, Blur, and other
 * marketplaces call when they read tokenURI() from the AuroraCreator contract.
 *
 * Returns standard ERC-721 metadata:
 *   { name, description, image, external_url, attributes }
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const contract = (searchParams.get("contract") || "").toLowerCase();
    const tokenId = searchParams.get("tokenId") || "";

    // Handle placeholder/pending requests gracefully
    if (searchParams.get("placeholder") || searchParams.get("pending")) {
      return NextResponse.json({
        name: "Pending NFT",
        description: "This NFT is being minted. Metadata will be available shortly.",
        image: "",
        attributes: [],
      });
    }

    if (!contract || !tokenId) {
      return NextResponse.json(
        { error: "Missing contract or tokenId" },
        { status: 400 }
      );
    }

    const { getSupabase } = await import("@/lib/db/supabase");
    const sb = getSupabase();

    // Look up in user_listed table
    const { data, error } = await sb
      .from("user_listed")
      .select("*")
      .eq("contract_address", contract)
      .eq("token_id", tokenId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("token-metadata lookup error:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Token not found" },
        { status: 404 }
      );
    }

    // Build standard ERC-721 metadata JSON
    // https://docs.opensea.io/docs/metadata-standards
    const metadata: Record<string, unknown> = {
      name: data.name || `Token #${tokenId}`,
      description: data.description || "",
      image: data.image_url || "",
      external_url: data.external_url || "",
      attributes: Array.isArray(data.attributes) ? data.attributes : [],
    };

    // Optional fields
    if (data.collection) {
      metadata.collection = {
        name: data.collection,
      };
    }

    return NextResponse.json(metadata, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "Content-Type": "application/json",
      },
    });
  } catch (e: any) {
    console.error("[/api/nft/token-metadata] error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed" },
      { status: 500 }
    );
  }
}
