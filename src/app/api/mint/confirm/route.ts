import { NextResponse } from "next/server";
import { createPublicClient, http, parseEventLogs, type Hash } from "viem";
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

function getPublicClient() {
  const chain = getChain();
  const rpcUrl =
    chain.id === 8453
      ? process.env.BASE_RPC_URL || chain.rpcUrls.default.http[0]
      : process.env.BASE_SEPOLIA_RPC_URL || chain.rpcUrls.default.http[0];

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

type AppPublicClient = ReturnType<typeof getPublicClient>;

type ParsedTransferLog = {
  args?: {
    from?: `0x${string}`;
    to?: `0x${string}`;
    tokenId?: bigint;
  };
};

/** Retry getTransactionReceipt with exponential backoff */
async function getReceiptWithRetry(
  client: AppPublicClient,
  txHash: Hash,
  maxAttempts = 10,
  initialDelayMs = 2000
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const receipt = await client.getTransactionReceipt({
        hash: txHash,
      });
      if (receipt) return receipt;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const isNotFound =
        message.includes("could not be found") ||
        message.includes("not found") ||
        message.includes("not yet been processed");

      if (!isNotFound || attempt === maxAttempts) {
        throw err;
      }
    }

    const delay = initialDelayMs * Math.pow(1.5, attempt - 1);
    await new Promise((r) => setTimeout(r, delay));
  }

  return null;
}

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
    const client = getPublicClient();

    const receipt = await getReceiptWithRetry(client, txHash as Hash);

    if (!receipt) {
      return NextResponse.json(
        {
          error:
            "Transaction receipt not found after retries. It may still be processing — please try again in a moment.",
        },
        { status: 400 }
      );
    }

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
        url: "",
        url_title: "",
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