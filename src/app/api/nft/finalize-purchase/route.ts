import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getSessionData } from "@/lib/auth/session";
import { notifyPurchase } from "@/lib/pushover";
import { telegramNotifyBuy } from "@/lib/telegram";

const ADMIN_WALLET = (process.env.NEXT_PUBLIC_ADMIN_WALLET || "").toLowerCase();

type FinalizePurchaseBody = {
  txHash?: string;
  nft?: {
    dbId?: string | number | null;
    chainId?: string | number;
    chain?: string | null;
    contractAddress?: string;
    tokenId?: string | number;
    totalPrice?: string | number;
    nftPrice?: string | number;
    mintFee?: string | number;
    name?: string | null;
    image?: string | null;
    description?: string | null;
    collection?: string | null;
    tokenType?: string | null;
    attributes?: unknown[];
  };
};

/**
 * POST /api/nft/finalize-purchase
 *
 * App-only buy flow — NO blockchain verification.
 * Frontend already confirmed the tx was mined via wagmi's useWaitForTransactionReceipt.
 * This just saves the purchase to the database.
 *
 * Flow: user wallet sends ETH to admin wallet → wagmi confirms → this endpoint saves to DB.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as FinalizePurchaseBody;
    const { txHash, nft } = body || {};

    if (!txHash || !nft) {
      return NextResponse.json(
        { error: "Missing txHash or nft payload" },
        { status: 400 }
      );
    }

    // ── Auth ──
    const session = await getSessionData();

    if (!session?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userWallet = session.wallet ? String(session.wallet).toLowerCase() : null;

    if (!userWallet) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("email", session.email)
        .maybeSingle();
      userWallet = prof?.wallet_address ? String(prof.wallet_address).toLowerCase() : null;
    }

    if (!userWallet) {
      return NextResponse.json({ error: "No wallet found for session" }, { status: 401 });
    }

    // ── Parse NFT data ──
    const chainId = Number(nft.chainId || 8453);
    const contractAddress = String(nft.contractAddress || "").toLowerCase();
    const tokenId = String(nft.tokenId || "");

    if (!contractAddress || !tokenId) {
      return NextResponse.json({ error: "Invalid NFT identity" }, { status: 400 });
    }

    // ── Get profile ──
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, wallet_address, email")
      .eq("email", session.email)
      .single();

    if (profileError || !profile?.id) {
      return NextResponse.json({ error: "Profile not found" }, { status: 400 });
    }

    const profileId = profile.id;

    // ── Check duplicate ──
    const { data: existingCollection } = await supabase
      .from("user_collections")
      .select("id")
      .eq("profile_id", profileId)
      .eq("contract_address", contractAddress)
      .eq("token_id", tokenId)
      .limit(1);

    if (existingCollection?.length) {
      return NextResponse.json(
        { error: "You already own this NFT" },
        { status: 409 }
      );
    }

    // ── Save to DB ──
    const nftPrice = Number(nft.nftPrice || 0);
    const mintFee = Number(nft.mintFee || 0);
    const totalPrice = Number(nft.totalPrice || 0);

    const collectionInsert = {
      profile_id: profileId,
      cached_nft_id: nft.dbId || null,
      chain_id: chainId,
      contract_address: contractAddress,
      token_id: tokenId,
      assigned_by: "purchase",
      assigned_at: new Date().toISOString(),
      nft_price_eth: nftPrice,
      mint_fee_eth: mintFee,
      total_value_eth: totalPrice,
      pricing_source: "wallet_payment",
      attributes: nft.attributes || [],
      collection: nft.collection || null,
      description: nft.description || null,
      name: nft.name || null,
      image_url: nft.image || null,
      nft_name: nft.name || null,
      token_type: nft.tokenType || "ERC721",
      chain: nft.chain || null,
    };

    const { error: collectionInsertError } = await supabase
      .from("user_collections")
      .insert(collectionInsert);

    if (collectionInsertError) {
      return NextResponse.json(
        { error: collectionInsertError.message },
        { status: 500 }
      );
    }

    // wallet_mints
    const { error: walletMintInsertError } = await supabase
      .from("wallet_mints")
      .insert({
        wallet_address: userWallet,
        cached_nft_id: nft.dbId || null,
        chain_id: chainId,
        contract_address: contractAddress,
        token_id: tokenId,
        tx_hash: txHash,
        mint_price_eth: nftPrice,
        mint_fee_eth: mintFee,
        total_paid_eth: totalPrice,
        snapshot_name: nft.name || null,
        snapshot_image: nft.image || null,
        snapshot_desc: nft.description || null,
        status: "confirmed",
        minted_at: new Date().toISOString(),
      });

    if (walletMintInsertError) {
      console.error("wallet_mints insert error:", walletMintInsertError);
    }

    // transactions
    const { error: transactionInsertError } = await supabase
      .from("transactions")
      .insert({
        wallet_address: userWallet,
        profile_id: profileId,
        tx_hash: txHash,
        tx_type: "buy",
        chain_id: chainId,
        contract_address: contractAddress,
        token_id: tokenId,
        amount_eth: totalPrice,
        admin_wallet: ADMIN_WALLET,
        status: "confirmed",
        metadata: {
          cached_nft_id: nft.dbId || null,
          nft_name: nft.name || null,
          image_url: nft.image || null,
          description: nft.description || null,
          collection: nft.collection || null,
          token_type: nft.tokenType || "ERC721",
          attributes: nft.attributes || [],
          chain: nft.chain || null,
        },
      });

    if (transactionInsertError) {
      console.error("transactions insert error:", transactionInsertError);
    }

    // Update profile wallet if needed
    if (
      !profile.wallet_address ||
      String(profile.wallet_address).toLowerCase() !== userWallet
    ) {
      await supabase
        .from("profiles")
        .update({ wallet_address: userWallet })
        .eq("id", profileId);
    }

    // ── Notifications ──
    const notifNftName = nft.name || `Token #${tokenId}`;
    const notifBuyer = session.email || userWallet;

    void Promise.resolve(
      notifyPurchase({
        nftName: notifNftName,
        buyer: notifBuyer,
        totalPrice: String(totalPrice),
        txHash,
      })
    ).catch((err: unknown) => {
      console.error("[PUSHOVER] notification failed:", err);
    });

    void Promise.resolve(
      telegramNotifyBuy({
        nftName: notifNftName,
        tokenId,
        buyer: notifBuyer,
        nftPrice: String(nftPrice),
        buyFee: String(mintFee),
        totalPrice: String(totalPrice),
        contractAddress,
        chainId,
        txHash,
      })
    ).catch((err: unknown) => {
      console.error("[TELEGRAM] notification failed:", err);
    });

    void (async () => {
      try {
        await supabase.from("admin_notifications").insert({
          type: "purchase",
          title: "New Purchase!",
          body: `${notifNftName} purchased by ${notifBuyer} for ${totalPrice} ETH`,
          metadata: {
            txHash,
            tokenId,
            buyer: notifBuyer,
            contractAddress,
            nftName: notifNftName,
          },
        });
      } catch (err) {
        console.error("[ADMIN_NOTIFICATION] insert failed:", err);
      }
    })();

    return NextResponse.json({
      success: true,
      txHash,
      tokenId,
      profileId,
      contractAddress,
      chainId,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
