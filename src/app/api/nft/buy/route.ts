import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/db/supabase";
import { notifyPurchase, sendPushover } from "@/lib/pushover";

export const runtime = "nodejs";

/**
 * POST /api/nft/buy
 *
 * Server-side mint. No blockchain involved.
 */
export async function POST(req: Request) {
  try {
    const { getSessionData } = await import("@/lib/auth/session");
    const session = await getSessionData();

    if (!session?.email || !session?.profileId) {
      return NextResponse.json(
        { error: "You must be logged in to mint" },
        { status: 401 }
      );
    }

    const profileId = session.profileId;
    const wallet = session.wallet || session.email;
    const email = session.email;

    const body = await req.json();
    const {
      nftId,
      tokenId,
      contractAddress,
      name,
      description,
      imageUrl,
      collection,
      price,
      fee,
    } = body;

    const tid = String(tokenId || nftId || "0");
    const addr = (contractAddress || "").toLowerCase();
    const nftName = name || `NFT #${tid}`;
    const nftDesc = description || "Minted via AuroraNft";
    const nftImage = imageUrl || "";
    const nftPrice = parseFloat(price || "0");
    const mintFee = parseFloat(fee || "0");
    const totalValue = Number((nftPrice + mintFee).toFixed(6));

    if (!addr || !tid) {
      return NextResponse.json(
        { error: "Missing contract address or token ID" },
        { status: 400 }
      );
    }

    const sb = getSupabase();

    const { data: existing } = await sb
      .from("user_collections")
      .select("id")
      .eq("profile_id", profileId)
      .eq("contract_address", addr)
      .eq("token_id", tid)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "You already own this NFT" },
        { status: 409 }
      );
    }

    const { error: collError } = await sb.from("user_collections").insert({
      profile_id: profileId,
      cached_nft_id: nftId ? Number(nftId) : null,
      chain_id: 8453,
      contract_address: addr,
      token_id: tid,
      assigned_by: "mint",
      assigned_at: new Date().toISOString(),
      nft_price_eth: nftPrice,
      mint_fee_eth: mintFee,
      total_value_eth: totalValue,
      pricing_source: "mint",
      name: nftName,
      nft_name: nftName,
      description: nftDesc,
      image_url: nftImage,
      collection: collection || null,
      token_type: "ERC-721",
      chain: "Base",
      attributes: [],
    });

    if (collError) {
      console.error("[buy] user_collections insert error:", collError);
      return NextResponse.json(
        { error: "Failed to save NFT to your collection" },
        { status: 500 }
      );
    }

    try {
      await sb.from("wallet_mints").insert({
        wallet_address: wallet.toLowerCase(),
        cached_nft_id: nftId ? Number(nftId) : null,
        chain_id: 8453,
        contract_address: addr,
        token_id: tid,
        tx_hash: null,
        mint_price_eth: nftPrice,
        mint_fee_eth: mintFee,
        total_paid_eth: totalValue,
        snapshot_name: nftName,
        snapshot_image: nftImage,
        snapshot_desc: nftDesc,
        status: "confirmed",
      });
    } catch (e) {
      console.warn("[buy] wallet_mints insert failed (non-critical):", e);
    }

    const serverTxId = `mint_${profileId}_${tid}_${Date.now()}`;

    try {
      await sb.from("transactions").insert({
        wallet_address: wallet.toLowerCase(),
        profile_id: profileId,
        tx_hash: serverTxId,
        tx_type: "mint",
        chain_id: 8453,
        contract_address: addr,
        token_id: tid,
        amount_eth: totalValue,
        admin_wallet: process.env.NEXT_PUBLIC_TREASURY_WALLET || "",
        status: "confirmed",
        metadata: {
          name: nftName,
          image: nftImage,
          collection: collection || null,
          price: String(nftPrice),
          fee: String(mintFee),
          email,
        },
      });
    } catch (e) {
      console.warn("[buy] transactions insert failed (non-critical):", e);
    }

    const notifBody = `${nftName} minted by ${wallet || email} for ${totalValue} ETH`;

    try {
      await sb.from("admin_notifications").insert({
        type: "mint",
        title: "New Mint!",
        body: notifBody,
        metadata: {
          profileId,
          tokenId: tid,
          contractAddress: addr,
          wallet,
          email,
          total: totalValue,
          name: nftName,
        },
      });
    } catch (e) {
      console.warn("[buy] admin_notifications insert failed:", e);
    }

    try {
      await notifyPurchase({
        nftName,
        buyer: wallet || email || "unknown",
        totalPrice: String(totalValue),
        txHash: serverTxId,
      });
    } catch (e) {
      console.warn("[buy] pushover failed:", e);
    }

    try {
      const { telegramNotifyBuy } = await import("@/lib/telegram");
      await telegramNotifyBuy({
        nftName,
        tokenId: tid,
        buyer: wallet || email || "unknown",
        nftPrice: String(nftPrice),
        buyFee: String(mintFee),
        totalPrice: String(totalValue),
        contractAddress: addr,
        chainId: 8453,
        txHash: serverTxId,
      });
    } catch (e) {
      console.warn("[buy] telegram failed:", e);
    }

    return NextResponse.json({
      ok: true,
      success: true,
      tokenId: tid,
      tokenIds: [tid],
      name: nftName,
    });
  } catch (e: any) {
    console.error("[/api/nft/buy] Unhandled error:", e);

    try {
      await sendPushover({
        title: "❌ Purchase Failed",
        message: `Error: ${e?.message || "Unknown"}`,
        priority: 1,
      });
    } catch {}

    return NextResponse.json(
      { error: e?.message || "Mint failed" },
      { status: 500 }
    );
  }
}