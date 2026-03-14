import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/db/supabase";
import { getSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    // getSession returns email string
    const email = await getSession();

    if (!email) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const address: string = body.address;

    // Ethereum wallet validation
    const walletRegex = /^0x[a-fA-F0-9]{40}$/;

    if (!address || !walletRegex.test(address)) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from("profiles")
      .update({
        wallet_address: address.toLowerCase(),
        updated_at: new Date().toISOString(),
      })
      .eq("email", email);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      walletAddress: address.toLowerCase(),
    });

  } catch (error) {
    console.error("wallet connect error:", error);

    return NextResponse.json(
      { error: "Failed to link wallet" },
      { status: 500 }
    );
  }
}