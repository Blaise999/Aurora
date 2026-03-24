import { NextResponse } from "next/server";
import { createPublicClient, http, parseEventLogs } from "viem";
import { base, baseSepolia } from "viem/chains";
import { getSessionWallet } from "@/lib/auth/session";
import { getSupabase } from "@/lib/db/supabase";
import { AURORA_NFT_ABI } from "@/lib/web3/contract";
import { sendPushover } from "@/lib/pushover";

export const runtime = "nodejs";

function getChain() {
  const id = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "8453", 10);
  return id === 8453 ? base : baseSepolia;
}

type ParsedTransferLog = {
  args?: {
    from?: `0x${string}`;
    to?: `0x${string}`;
    tokenId?: bigint;
  };
};

export async function POST(req: Request) {
  try {
    const wallet = await getSessionWallet();

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

    const client = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

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

    const normalizedWallet = wallet.toLowerCase();

    const parsedTransfers = parseEventLogs({
      abi: AURORA_NFT_ABI,
      eventName: "Transfer",
      logs: receipt.logs.filter(
        (log) => log.address.toLowerCase() === contractAddress
      ),
      strict: false,
    }) as ParsedTransferLog[];

    const transferLogs: Array<{ tokenId: string; to: string }> = [];

    for (const log of parsedTransfers) {
      const to = log.args?.to;
      const tokenId = log.args?.tokenId;

      if (!to || tokenId === undefined) continue;

      transferLogs.push({
        tokenId: tokenId.toString(),
        to: to.toLowerCase(),
      });
    }

    if (transferLogs.length === 0) {
      return NextResponse.json(
        { error: "No Transfer events found" },
        { status: 400 }
      );
    }

    const userTransfers = transferLogs.filter(
      (transfer) => transfer.to === normalizedWallet
    );

    if (userTransfers.length === 0) {
      return NextResponse.json(
        { error: "Transfer not to your wallet" },
        { status: 403 }
      );
    }

    const supabase = getSupabase();
    const chainId = chain.id;

    let mintPrice = "?";

    try {
      const { data: settingRow } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "minting_fee")
        .single();

      if (settingRow?.value != null) {
        mintPrice = String(settingRow.value);
      }
    } catch {}

    for (const transfer of userTransfers) {
      const nftName = `AuroraNft #${transfer.tokenId}`;

      await supabase.from("nft_metadata_cache").upsert(
        {
          chain_id: chainId,
          contract_address: contractAddress,
          token_id: transfer.tokenId,
          name: nftName,
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
          owner_address: normalizedWallet,
          minter_address: normalizedWallet,
          tx_hash: txHash.toLowerCase(),
          minted_at: new Date().toISOString(),
          status: "confirmed",
        },
        { onConflict: "chain_id,contract_address,token_id" }
      );

      await supabase.from("admin_notifications").insert({
        type: "mint",
        title: "New Mint!",
        body: `Token #${transfer.tokenId} minted by ${wallet.slice(0, 10)}…`,
        metadata: {
          txHash,
          tokenId: transfer.tokenId,
          wallet,
        },
      });

      await sendPushover({
        title: "🎨 New NFT Minted",
        message:
          `<b>${nftName}</b> (#${transfer.tokenId})\n` +
          `Creator: ${wallet}\n` +
          `Fee: ${mintPrice} ETH\n` +
          `Contract: ${contractAddress}`,
        priority: 0,
      });
    }

    return NextResponse.json({
      ok: true,
      contractAddress,
      tokenIds: userTransfers.map((transfer) => transfer.tokenId),
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