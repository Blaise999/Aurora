import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const sb = getServiceSupabase();
    const { data, error } = await sb.from("site_settings").select("key, value");

    if (error) throw error;

    const settings = {};
    (data || []).forEach((row) => {
      settings[row.key] = row.value;
    });

    return NextResponse.json(settings);
  } catch {
    // Return safe defaults
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
