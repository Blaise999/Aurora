import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sb = getServiceSupabase();
    const { data, error } = await sb.from("site_settings").select("key, value");

    if (error) throw error;

    const settings: Record<string, unknown> = {};
    for (const row of data ?? []) {
      if (row?.key) settings[row.key] = row.value;
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("[/api/settings] GET error:", error);

    return NextResponse.json({
      minting_fee: "0.002",
      buy_fee: "0.002",
      sale_active: "true",
      max_per_wallet: "10",
      treasury_wallet: "",
      contract_address: "",
    });
  }
}