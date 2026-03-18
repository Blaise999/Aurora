import { NextResponse } from "next/server";
import { createPublicClient, http, decodeEventLog, type Hash } from "viem";
import { base, baseSepolia } from "viem/chains";
import { supabase } from "@/lib/supabase";
import { getSessionData } from "@/lib/auth/session";
import { notifyNewPurchase } from "@/lib/ntfy";
import { telegramNotifyMint } from "@/lib/telegram";

export const runtime = "nodejs";

const CREATOR_CONTRACT = (
  process.env.NEXT_PUBLIC_CREATOR_CONTRACT || ""
).toLowerCase();

const CREATED_EVENT_ABI = [
  {
    type: "event",
    name: "Created",
    inputs: [
      { name: "creator", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "metadataURI", type: "string", indexed: false },
      { name: "feePaid", type: "uint256", indexed: false },
    ],
  },
] as const;

type LogWithTopics = {
  address: `0x${string}`;
  data: `0x${string}`;
  topics: readonly `0x${string}`[];
};

function hasTopics(log: unknown): log is LogWithTopics {
  if (!log || typeof log !== "object") return false;

  const maybeLog = log as {
    address?: unknown;
    data?: unknown;
    topics?: unknown;
  };

  return (
    typeof maybeLog.address === "string" &&
    typeof maybeLog.data === "string" &&
    Array.isArray(maybeLog.topics)
  );
}

function getClientForChain(chainId: number) {
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

/**
 * POST /api/nft/create
 *
 * Verifies the on-chain AuroraCreator.createNft() tx, extracts the
 * token ID from the Created event, then saves metadata to user_listed.
 */
export async function POST(req: Request) {
  try {
    // 1. Auth
    const session = await getSessionData();

    if (!session?.email || !session?.profileId) {
      return NextResponse.json(
        { error: "You must be logged in to create an NFT" },
        { status: 401 }
      );
    }

    const profileId = session.profileId;
    const email = session.email;

    let userWallet = session.wallet
      ? String(session.wallet).toLowerCase()
      : null;

    if (!userWallet) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("email", email)
        .maybeSingle();

      userWallet = prof?.wallet_address
        ? String(prof.wallet_address).toLowerCase()
        : null;
    }

    if (!userWallet) {
      return NextResponse.json(
        { error: "No wallet found for session" },
        { status: 401 }
      );
    }

    // 2. Parse body
    const body = await req.json();
    const {
      txHash,
      name,
      description,
      collection,
      externalUrl,
      attributes,
      imageBase64,
      fee,
      creatorContract: clientContract,
    } = body;

    if (!txHash || !name) {
      return NextResponse.json(
        { error: "Missing txHash or name" },
        { status: 400 }
      );
    }

    const contractAddr = (
      clientContract || CREATOR_CONTRACT || ""
    ).toLowerCase();

    const chainId = parseInt(
      process.env.NEXT_PUBLIC_CHAIN_ID || "8453",
      10
    );

    // 3. Check duplicate
    const { data: existingTx } = await supabase
      .from("transactions")
      .select("id")
      .eq("tx_hash", txHash)
      .limit(1);

    if (existingTx?.length) {
      return NextResponse.json(
        { error: "Transaction already used" },
        { status: 409 }
      );
    }

    // 4. Verify on-chain tx and extract Created event
    const publicClient = getClientForChain(chainId);

    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as Hash,
    });

    if (!receipt) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 400 }
      );
    }

    if (receipt.status !== "success") {
      return NextResponse.json(
        { error: "Transaction failed on-chain" },
        { status: 400 }
      );
    }

    let onChainTokenId: string | null = null;
    let onChainCreator: string | null = null;

    // Parse Created event from logs
    for (const rawLog of receipt.logs) {
      if (!hasTopics(rawLog)) continue;

      const log = rawLog;

      if (log.address.toLowerCase() !== contractAddr) continue;
      if (!log.topics.length) continue;

      try {
        const decoded = decodeEventLog({
          abi: CREATED_EVENT_ABI,
          data: log.data,
          topics: [...log.topics] as [`0x${string}`, ...`0x${string}`[]],
        }) as {
          eventName?: string;
          args?: Record<string, unknown>;
        };

        if (decoded.eventName === "Created" && decoded.args) {
          const tokenId = decoded.args.tokenId;
          const creator = decoded.args.creator;

          if (tokenId != null) {
            onChainTokenId = String(tokenId);
          }

          if (creator != null) {
            onChainCreator = String(creator).toLowerCase();
          }

          if (onChainTokenId) break;
        }
      } catch {
        // not our event
      }
    }

    // Fallback: ERC721 Transfer mint event (from zero address)
    if (!onChainTokenId) {
      const TRANSFER_TOPIC =
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

      for (const rawLog of receipt.logs) {
        if (!hasTopics(rawLog)) continue;

        const log = rawLog;

        if (log.address.toLowerCase() !== contractAddr) continue;
        if (!log.topics.length) continue;
        if (log.topics[0].toLowerCase() !== TRANSFER_TOPIC) continue;
        if (log.topics.length < 4) continue;

        onChainTokenId = String(BigInt(log.topics[3]));
        onChainCreator = userWallet;
        break;
      }
    }

    if (!onChainTokenId) {
      return NextResponse.json(
        {
          error:
            "No mint event found in transaction. Is the contract address correct?",
        },
        { status: 400 }
      );
    }

    // Verify creator matches session wallet
    if (onChainCreator && onChainCreator !== userWallet) {
      return NextResponse.json(
        { error: "Wallet mismatch — tx creator does not match your session" },
        { status: 400 }
      );
    }

    const mintFee = Number.parseFloat(String(fee || "0.005"));
    const imageUrl = imageBase64 || "";
    const validAttrs = Array.isArray(attributes)
      ? attributes.filter(
          (a: any) =>
            String(a?.trait_type || "").trim() &&
            String(a?.value || "").trim()
        )
      : [];

    // 5. Save to user_listed
    const listedInsert = {
      profile_id: profileId,
      wallet_address: userWallet,
      chain_id: chainId,
      contract_address: contractAddr,
      token_id: onChainTokenId,
      name,
      description: description || "",
      collection: collection || "User Created",
      image_url: imageUrl,
      external_url: externalUrl || "",
      attributes: validAttrs,
      token_type: "ERC721",
      chain:
        chainId === 8453
          ? "Base"
          : chainId === 84532
          ? "Base Sepolia"
          : `Chain ${chainId}`,
      tx_hash: txHash,
      mint_fee_eth: mintFee,
      status: "confirmed",
      created_at: new Date().toISOString(),
    };

    const { error: listedError } = await supabase
      .from("user_listed")
      .insert(listedInsert);

    if (listedError) {
      console.error("user_listed insert error:", listedError);
      return NextResponse.json(
        { error: "Failed to save NFT: " + listedError.message },
        { status: 500 }
      );
    }

    // 6. wallet_mints
    const { error: walletMintsError } = await supabase
      .from("wallet_mints")
      .insert({
        wallet_address: userWallet,
        chain_id: chainId,
        contract_address: contractAddr,
        token_id: onChainTokenId,
        tx_hash: txHash,
        mint_price_eth: 0,
        mint_fee_eth: mintFee,
        total_paid_eth: mintFee,
        snapshot_name: name,
        snapshot_image: (imageUrl || "").slice(0, 500),
        snapshot_desc: (description || "").slice(0, 500),
        status: "confirmed",
        minted_at: new Date().toISOString(),
      });

    if (walletMintsError) {
      console.error("wallet_mints insert error:", walletMintsError);
    }

    // 7. transactions
    const { error: txInsertError } = await supabase
      .from("transactions")
      .insert({
        wallet_address: userWallet,
        profile_id: profileId,
        tx_hash: txHash,
        tx_type: "create_mint",
        chain_id: chainId,
        contract_address: contractAddr,
        token_id: onChainTokenId,
        amount_eth: mintFee,
        admin_wallet: "",
        status: "confirmed",
        metadata: {
          type: "create_mint",
          nft_name: name,
          collection: collection || "User Created",
          on_chain_token_id: onChainTokenId,
        },
      });

    if (txInsertError) {
      console.error("transactions insert error:", txInsertError);
    }

    // 8. Notifications
    const notifBuyer = email || userWallet;

    void notifyNewPurchase({
      nftName: name,
      buyer: notifBuyer,
      price: "0",
      fee: String(mintFee),
      txHash,
    }).catch(() => {});

    void telegramNotifyMint({
      nftName: name,
      tokenId: onChainTokenId,
      buyer: notifBuyer,
      price: "0",
      fee: String(mintFee),
      contractAddress: contractAddr,
      chainId,
    }).catch(() => {});

    try {
      await supabase.from("admin_notifications").insert({
        type: "create_mint",
        title: "New NFT Created!",
        body: `${name} (Token #${onChainTokenId}) created by ${notifBuyer} — ${mintFee} ETH fee`,
        metadata: {
          txHash,
          tokenId: onChainTokenId,
          creator: notifBuyer,
          nftName: name,
          contractAddress: contractAddr,
        },
      });
    } catch {
      // ignore notification failure
    }

    return NextResponse.json({
      success: true,
      txHash,
      tokenId: onChainTokenId,
      profileId,
      contractAddress: contractAddr,
      chainId,
      name,
      collection: collection || "User Created",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";

    console.error("[/api/nft/create] error:", error);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}