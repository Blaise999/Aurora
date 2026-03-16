import { NextResponse } from "next/server";
import { createPublicClient, http, parseEther } from "viem";
import { base, baseSepolia } from "viem/chains";
import { supabase } from "@/lib/supabase";
import { getSessionData } from "@/lib/auth/session";

const ADMIN_WALLET = (process.env.NEXT_PUBLIC_ADMIN_WALLET || "").toLowerCase();

function getClientForChain(chainId) {
  if (chainId === 8453) {
    return createPublicClient({
      chain: base,
      transport: http(process.env.BASE_RPC_URL),
    });
  }

  return createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL),
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { txHash, nft } = body || {};

    if (!txHash || !nft) {
      return NextResponse.json(
        { error: "Missing txHash or nft payload" },
        { status: 400 }
      );
    }

    const session = await getSessionData();

    if (!session?.email || !session?.wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userWallet = String(session.wallet).toLowerCase();
    const chainId = Number(nft.chainId || 8453);
    const contractAddress = String(nft.contractAddress || "").toLowerCase();
    const tokenId = String(nft.tokenId || "");
    const expectedValue = parseEther(String(nft.totalPrice || "0"));

    if (!contractAddress || !tokenId) {
      return NextResponse.json(
        { error: "Invalid NFT identity" },
        { status: 400 }
      );
    }

    const publicClient = getClientForChain(chainId);

    const [tx, receipt] = await Promise.all([
      publicClient.getTransaction({ hash: txHash }),
      publicClient.getTransactionReceipt({ hash: txHash }),
    ]);

    if (!tx || !receipt) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 400 }
      );
    }

    if (receipt.status !== "success") {
      return NextResponse.json(
        { error: "Transaction failed onchain" },
        { status: 400 }
      );
    }

    if (!tx.from || tx.from.toLowerCase() !== userWallet) {
      return NextResponse.json(
        { error: "Wallet mismatch" },
        { status: 400 }
      );
    }

    if (!tx.to || tx.to.toLowerCase() !== ADMIN_WALLET) {
      return NextResponse.json(
        { error: "Recipient mismatch" },
        { status: 400 }
      );
    }

    if (tx.value !== expectedValue) {
      return NextResponse.json(
        { error: "Incorrect payment amount" },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, wallet_address, email")
      .eq("email", session.email)
      .single();

    if (profileError || !profile?.id) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 400 }
      );
    }

    const profileId = profile.id;

    const { data: existingCollection, error: collectionCheckError } = await supabase
      .from("user_collections")
      .select("id")
      .eq("profile_id", profileId)
      .eq("contract_address", contractAddress)
      .eq("token_id", tokenId)
      .limit(1);

    if (collectionCheckError) {
      return NextResponse.json(
        { error: "Ownership check failed" },
        { status: 500 }
      );
    }

    if (existingCollection?.length) {
      return NextResponse.json(
        { error: "You already own this NFT" },
        { status: 409 }
      );
    }

    const nftPrice = Number(nft.nftPrice || 0);
    const mintFee = Number(nft.mintFee || 0);
    const totalPrice = Number(nft.totalPrice || 0);

    const metadata = {
      cached_nft_id: nft.dbId || null,
      nft_name: nft.name || null,
      image_url: nft.image || null,
      description: nft.description || null,
      collection: nft.collection || null,
      token_type: nft.tokenType || "ERC721",
      attributes: nft.attributes || [],
      chain: nft.chain || null,
    };

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

    const walletMintInsert = {
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
    };

    const transactionInsert = {
      wallet_address: userWallet,
      profile_id: profileId,
      tx_hash: txHash,
      tx_type: "mint",
      chain_id: chainId,
      contract_address: contractAddress,
      token_id: tokenId,
      amount_eth: totalPrice,
      admin_wallet: ADMIN_WALLET,
      status: "confirmed",
      metadata,
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

    const { error: walletMintInsertError } = await supabase
      .from("wallet_mints")
      .insert(walletMintInsert);

    if (walletMintInsertError) {
      return NextResponse.json(
        { error: walletMintInsertError.message },
        { status: 500 }
      );
    }

    const { error: transactionInsertError } = await supabase
      .from("transactions")
      .insert(transactionInsert);

    if (transactionInsertError) {
      return NextResponse.json(
        { error: transactionInsertError.message },
        { status: 500 }
      );
    }

    if (!profile.wallet_address || profile.wallet_address.toLowerCase() !== userWallet) {
      await supabase
        .from("profiles")
        .update({ wallet_address: userWallet })
        .eq("id", profileId);
    }

    return NextResponse.json({
      success: true,
      txHash,
      tokenId,
      profileId,
      contractAddress,
      chainId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unexpected error" },
      { status: 500 }
    );
  }
}