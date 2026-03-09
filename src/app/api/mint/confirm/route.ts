import { NextResponse } from "next/server";
import { createPublicClient, http, decodeEventLog } from "viem";
import { base, baseSepolia } from "viem/chains";
import { getSession } from "@/lib/auth/session";
import { getSupabase } from "@/lib/db/supabase";
import { AURORA_NFT_ABI } from "@/lib/web3/contract";
import { notifyNewMint } from "@/lib/ntfy";

export const runtime = "nodejs";

function getChain() {
  const id = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532", 10);
  return id === 8453 ? base : baseSepolia;
}

/**
 * POST /api/mint/confirm
 * Body: { txHash }
 *
 * 1. Require session → wallet address
 * 2. Fetch tx receipt from RPC (server-side, don't trust client)
 * 3. Validate receipt: status, contract, Transfer logs
 * 4. Extract tokenId(s)
 * 5. Upsert nft_metadata_cache + user_nfts
 * 6. Push ntfy notification to admin
 */
export async function POST(req: Request) {
  try {
    const wallet = await getSession();
    if (!wallet) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { txHash } = await req.json();
    if (!txHash || typeof txHash !== "string") {
      return NextResponse.json({ error: "Missing txHash" }, { status: 400 });
    }

    const contractAddress = (
      process.env.NEXT_PUBLIC_AURORA_CONTRACT || ""
    ).toLowerCase();
    if (!contractAddress) {
      return NextResponse.json(
        { error: "Contract not configured" },
        { status: 500 }
      );
    }

    const chain = getChain();
    const rpcUrl = process.env.BASE_RPC_URL || chain.rpcUrls.default.http[0];

    const client = createPublicClient({ chain, transport: http(rpcUrl) });

    const receipt = await client.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (receipt.status !== "success") {
      return NextResponse.json(
        { error: "Transaction failed on-chain" },
        { status: 400 }
      );
    }

    if (receipt.to?.toLowerCase() !== contractAddress) {
      return NextResponse.json(
        { error: "Transaction not to our contract" },
        { status: 400 }
      );
    }

    // Parse Transfer events
    const transferLogs: Array<{ tokenId: string; to: string }> = [];
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== contractAddress) continue;
      try {
        const decoded = decodeEventLog({
          abi: AURORA_NFT_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "Transfer") {
          const args = decoded.args as any;
          transferLogs.push({
            tokenId: args.tokenId.toString(),
            to: (args.to as string).toLowerCase(),
          });
        }
      } catch {
        // not a Transfer log
      }
    }

    if (transferLogs.length === 0) {
      return NextResponse.json(
        { error: "No Transfer events found" },
        { status: 400 }
      );
    }

    const userTransfers = transferLogs.filter(
      (t) => t.to === wallet.toLowerCase()
    );
    if (userTransfers.length === 0) {
      return NextResponse.json(
        { error: "Transfer not to your wallet" },
        { status: 403 }
      );
    }

    // Write to DB
    const supabase = getSupabase();
    const chainId = chain.id;

    // Fetch price for ntfy notification
    let mintPrice = "?";
    try {
      const { data: settingRow } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "minting_fee")
        .single();
      if (settingRow?.value) mintPrice = settingRow.value;
    } catch {}

    for (const transfer of userTransfers) {
      await supabase.from("nft_metadata_cache").upsert(
        {
          chain_id: chainId,
          contract_address: contractAddress,
          token_id: transfer.tokenId,
          name: `AuroraNft #${transfer.tokenId}`,
          description: "AuroraNft collection piece",
          image_url: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "chain_id,contract_address,token_id" }
      );

      await supabase.from("user_nfts").upsert(
        {
          chain_id: chainId,
          contract_address: contractAddress,
          token_id: transfer.tokenId,
          owner_address: wallet.toLowerCase(),
          minter_address: wallet.toLowerCase(),
          tx_hash: txHash.toLowerCase(),
          minted_at: new Date().toISOString(),
          status: "confirmed",
        },
        { onConflict: "chain_id,contract_address,token_id" }
      );

      // Log admin notification
      await supabase.from("admin_notifications").insert({
        type: "mint",
        title: "New Mint!",
        body: `Token #${transfer.tokenId} minted by ${wallet.slice(0, 10)}…`,
        metadata: { txHash, tokenId: transfer.tokenId, wallet },
      });

      // Push ntfy to admin phone
      await notifyNewMint({
        tokenId: transfer.tokenId,
        minter: wallet,
        price: mintPrice,
      });
    }

    return NextResponse.json({
      ok: true,
      contractAddress,
      tokenIds: userTransfers.map((t) => t.tokenId),
      count: userTransfers.length,
    });
  } catch (e: any) {
    console.error("Mint confirm error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed" },
      { status: 500 }
    );
  }
}
