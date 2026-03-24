import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/db/supabase";
import { notifyPurchase, sendPushover } from "@/lib/pushover";

export const runtime = "nodejs";

/**
 * POST /api/nft/buy
 *
 * Server-side mint. No blockchain involved.
 *
 * What it does:
 *   1. Verify user is logged in via session cookie
 *   2. Check they don't already own this NFT
 *   3. Save to user_collections  (user's portfolio)
 *   4. Save to wallet_mints      (mint ledger)
 *   5. Save to transactions      (admin accounting)
 *   6. Insert admin_notification  (in-app notification for admin dashboard)
 *   7. Push ntfy notification     (admin phone)
 *   8. Send telegram message      (admin channel)
 *   9. Return success + tokenId to frontend
 *
 * Body: {
 *   nftId?,          // cached_nfts.id if known
 *   tokenId,         // the NFT token ID string
 *   contractAddress, // the contract address
 *   name,            // display name
 *   description?,    // description
 *   imageUrl?,       // image URL for snapshot
 *   collection?,     // collection name
 *   price,           // NFT price in ETH string, e.g. "0.002"
 *   fee,             // mint fee in ETH string, e.g. "0.001"
 * }
 */
export async function POST(req: Request) {
  try {
    // ── 1. Authenticate ──
    const { getSessionData } = await import("@/lib/auth/session");
    const session = await getSessionData();

    if (!session?.email || !session?.profileId) {
      return NextResponse.json(
        { error: "You must be logged in to mint" },
        { status: 401 }
      );
    }

    const profileId = session.profileId;
    const wallet = session.wallet || session.email; // fallback to email if no wallet connected
    const email = session.email;

    // ── Parse body ──
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

    // ── 2. Check if user already owns this NFT ──
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

    // ── 3. Save to user_collections (the user's portfolio) ──
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

    // ── 4. Save to wallet_mints (mint ledger) ──
    try {
      await sb.from("wallet_mints").insert({
        wallet_address: wallet.toLowerCase(),
        cached_nft_id: nftId ? Number(nftId) : null,
        chain_id: 8453,
        contract_address: addr,
        token_id: tid,
        tx_hash: null, // no blockchain tx
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

    // ── 5. Save to transactions (admin accounting) ──
    // tx_hash is NOT NULL in schema, so generate a unique server-side ID
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

    // ── 6. Admin notification in DB ──
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

    // ── 7. Pushover notification ──
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

    // ── 8. Telegram notification to channel ──
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

    // ── 9. Return success ──
    return NextResponse.json({
      ok: true,
      success: true,
      tokenId: tid,
      tokenIds: [tid],
      name: nftName,
    });
  } catch (e: any) {
    console.error("[/api/nft/buy] Unhandled error:", e);

    // Try to notify admin of the failure
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
