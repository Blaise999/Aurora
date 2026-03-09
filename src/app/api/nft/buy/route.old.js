import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { CHAIN_ID } from "@/lib/constants";

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      contractAddress,
      tokenId,
      ownerAddress,
      minterAddress,
      txHash,
      name,
      description,
      imageUrl,
      attributes,
      nftId,
      priceEth,
      mintingFeeEth,
    } = body;

    if (!ownerAddress || !txHash) {
      return NextResponse.json({ error: "ownerAddress and txHash required" }, { status: 400 });
    }

    const sb = getServiceSupabase();

    // 1. Save to user_nfts
    const { data: mintRecord, error: mintErr } = await sb
      .from("user_nfts")
      .upsert({
        chain_id: CHAIN_ID,
        contract_address: (contractAddress || "").toLowerCase(),
        token_id: tokenId || nftId || "0",
        owner_address: ownerAddress.toLowerCase(),
        minter_address: (minterAddress || ownerAddress).toLowerCase(),
        tx_hash: txHash,
        status: "confirmed",
      }, { onConflict: "tx_hash" })
      .select()
      .single();

    if (mintErr) {
      console.error("user_nfts upsert error:", mintErr);
    }

    // 2. Cache metadata
    if (name || imageUrl) {
      const { error: metaErr } = await sb
        .from("nft_metadata_cache")
        .upsert({
          chain_id: CHAIN_ID,
          contract_address: (contractAddress || "").toLowerCase(),
          token_id: tokenId || nftId || "0",
          name: name || `NFT #${tokenId || nftId}`,
          description: description || "",
          image_url: imageUrl || "",
          attributes: attributes || [],
        }, { onConflict: "chain_id,contract_address,token_id" });

      if (metaErr) {
        console.error("nft_metadata_cache upsert error:", metaErr);
      }
    }

    // 3. Log admin notification
    await sb.from("admin_notifications").insert({
      type: "mint",
      title: `NFT Purchased: ${name || tokenId || nftId}`,
      body: `Wallet ${ownerAddress} purchased NFT for ${priceEth || "?"} ETH. TX: ${txHash}`,
      metadata: { ownerAddress, txHash, nftId, contractAddress, priceEth },
    });

    return NextResponse.json({ success: true, record: mintRecord });
  } catch (err) {
    console.error("buy route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
