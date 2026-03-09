import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/db/supabase";
import { sendNtfyNotification } from "@/lib/ntfy";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    let wallet: string | null = null;
    try { const { getSession } = await import("@/lib/auth/session"); wallet = await getSession(); } catch {}

    const body = await req.json();
    const { txHash, nftId, contractAddress, tokenId, pricePaid, priceEth, mintingFeeEth, name, description, imageUrl, ownerAddress } = body;
    wallet = wallet || ownerAddress || "";
    if (!wallet) return NextResponse.json({ error: "No wallet" }, { status: 401 });
    if (!txHash) return NextResponse.json({ error: "Missing txHash" }, { status: 400 });

    const sb = getSupabase();
    const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532", 10);
    const addr = (contractAddress || process.env.NEXT_PUBLIC_AURORA_CONTRACT || "").toLowerCase();
    const tid = tokenId || nftId || "0";
    const price = priceEth || pricePaid || "0";
    const fee = mintingFeeEth || "0";
    const total = (parseFloat(price) + parseFloat(fee)).toFixed(6);

    // 1. Write to wallet_mints (new system - snapshots data at mint time)
    await sb.from("wallet_mints").upsert({
      wallet_address: wallet.toLowerCase(), cached_nft_id: null,
      chain_id: chainId, contract_address: addr, token_id: tid,
      tx_hash: txHash.toLowerCase(),
      mint_price_eth: parseFloat(price) || 0, mint_fee_eth: parseFloat(fee) || 0,
      total_paid_eth: parseFloat(total) || 0,
      snapshot_name: name || `NFT #${tid}`,
      snapshot_image: imageUrl || "",
      snapshot_desc: description || "Minted via AuroraNft",
      status: "confirmed", minted_at: new Date().toISOString(),
    }, { onConflict: "wallet_address,chain_id,contract_address,token_id" });

    // 2. Also write to legacy user_nfts for compat
    await sb.from("user_nfts").upsert({
      chain_id: chainId, contract_address: addr, token_id: tid,
      owner_address: wallet.toLowerCase(), minter_address: wallet.toLowerCase(),
      tx_hash: txHash.toLowerCase(), minted_at: new Date().toISOString(), status: "confirmed",
    }, { onConflict: "tx_hash" });

    // 3. Cache metadata
    if (name || imageUrl) {
      await sb.from("nft_metadata_cache").upsert({
        chain_id: chainId, contract_address: addr, token_id: tid,
        name: name || `NFT #${tid}`, description: description || "",
        image_url: imageUrl || "", updated_at: new Date().toISOString(),
      }, { onConflict: "chain_id,contract_address,token_id" });
    }

    // 4. Admin notification
    await sb.from("admin_notifications").insert({
      type: "mint", title: "New Purchase!",
      body: `NFT #${tid} (${name || "—"}) bought by ${wallet.slice(0,10)}… for ${total} ETH`,
      metadata: { txHash, tokenId: tid, wallet, total },
    });

    // 5. Ntfy push
    await sendNtfyNotification({
      title: "💰 New NFT Purchase!",
      message: `NFT #${tid} (${name || "—"}) by ${wallet}\nTotal: ${total} ETH\nTx: ${txHash}`,
      priority: "high", tags: ["money_with_wings", "tada"], click: "/admin",
    });

    return NextResponse.json({ ok: true, success: true, tokenId: tid, txHash });
  } catch (e: any) {
    console.error("[/api/nft/buy]", e);
    try { await sendNtfyNotification({ title: "❌ Purchase Failed", message: `Error: ${e?.message}`, priority: "high", tags: ["warning"] }); } catch {}
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
