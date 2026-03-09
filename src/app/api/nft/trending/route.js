import { NextResponse } from "next/server";
import { LOCAL_NFTS } from "@/lib/constants";
export const runtime = "nodejs";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "12");
  try {
    const { getServiceSupabase } = await import("@/lib/supabase");
    const sb = getServiceSupabase();
    const { data, error } = await sb.from("cached_nfts").select("*")
      .eq("is_active", true).not("image_url", "is", null).neq("image_url", "")
      .order("synced_at", { ascending: false }).limit(limit * 3);
    if (error) throw error;
    if (!data?.length) throw new Error("Empty cache");
    const shuffled = data.sort(() => Math.random() - 0.5).slice(0, limit);
    return NextResponse.json({ nfts: shuffled.map(r => ({
      contractAddress: r.contract_address, tokenId: r.token_id,
      name: r.name || `#${r.token_id}`, description: r.description || "",
      image: r.image_url || "", collection: r.collection_name,
      attributes: r.attributes || [], source: "cache",
    })), source: "cache" });
  } catch {
    return NextResponse.json({ nfts: [...LOCAL_NFTS].sort(() => Math.random() - 0.5).slice(0, limit), source: "local" });
  }
}
