import { NextResponse } from "next/server";
import {
  createPublicClient,
  http,
  decodeEventLog,
  type Address,
  type Hash,
} from "viem";
import { base, baseSepolia } from "viem/chains";
import { supabase } from "@/lib/supabase";
import { getSessionData } from "@/lib/auth/session";
import { notifyMint } from "@/lib/pushover";
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
  address: Address;
  data: `0x${string}`;
  topics: readonly `0x${string}`[];
};

type AttributeInput = {
  trait_type?: unknown;
  value?: unknown;
};

type CreateBody = {
  txHash?: string;
  name?: string;
  description?: string;
  collection?: string;
  externalUrl?: string;
  attributes?: AttributeInput[];
  imageUrl?: string;
  imageBase64?: string; // kept only for detection/logging; not stored
  feeUsd?: string | number;
  feeEth?: string | number;
  ethPriceAtMint?: string | number;
  listingPriceEth?: string | number;
  creatorContract?: string;
  chainId?: string | number;
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

type AppPublicClient = ReturnType<typeof getClientForChain>;

function parseNumber(value: unknown, fallback = 0): number {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseChainId(value: unknown, fallback = 8453): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logStep(label: string, extra?: Record<string, unknown>) {
  if (extra) {
    console.log(`[NFT CREATE] ${label}`, extra);
  } else {
    console.log(`[NFT CREATE] ${label}`);
  }
}

function isLikelyBase64Image(value: string) {
  return (
    value.startsWith("data:image/") ||
    value.length > 5000 ||
    (!value.startsWith("http://") &&
      !value.startsWith("https://") &&
      !value.startsWith("/") &&
      value.includes("base64"))
  );
}

/** Retry getTransactionReceipt with bounded backoff */
async function getReceiptWithRetry(
  publicClient: AppPublicClient,
  txHash: Hash,
  maxAttempts = 5,
  initialDelayMs = 1500
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logStep("receipt attempt", { attempt, txHash });
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
      if (receipt) {
        logStep("receipt found", {
          attempt,
          txHash,
          status: receipt.status,
          blockNumber: receipt.blockNumber?.toString?.() || null,
          logs: receipt.logs?.length ?? 0,
        });
        return receipt;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const isNotFound =
        message.includes("could not be found") ||
        message.includes("not found") ||
        message.includes("not yet been processed") ||
        message.includes("transaction receipt") ||
        message.includes("Receipt");

      logStep("receipt attempt failed", {
        attempt,
        txHash,
        message,
        retrying: isNotFound && attempt < maxAttempts,
      });

      if (!isNotFound || attempt === maxAttempts) {
        throw err;
      }
    }

    const delay = Math.round(initialDelayMs * Math.pow(1.35, attempt - 1));
    logStep("receipt backoff", { attempt, delayMs: delay });
    await sleep(delay);
  }

  return null;
}

/**
 * POST /api/nft/create
 *
 * Verifies the on-chain AuroraCreator.createNft() tx, extracts the
 * token ID from the Created event, then saves metadata to user_listed.
 */
export async function POST(req: Request) {
  const startedAt = Date.now();

  try {
    logStep("request received");

    console.time("[NFT CREATE] getSessionData");
    const session = await getSessionData();
    console.timeEnd("[NFT CREATE] getSessionData");

    if (!session?.email || !session?.profileId) {
      logStep("unauthorized: missing email/profileId", {
        hasEmail: Boolean(session?.email),
        hasProfileId: Boolean(session?.profileId),
      });

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

    logStep("session resolved", {
      email,
      profileId,
      sessionWallet: userWallet,
    });

    if (!userWallet) {
      console.time("[NFT CREATE] profile wallet lookup");
      const { data: prof, error: profError } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("email", email)
        .maybeSingle();
      console.timeEnd("[NFT CREATE] profile wallet lookup");

      if (profError) {
        logStep("profile wallet lookup error", {
          message: profError.message,
        });
      }

      userWallet = prof?.wallet_address
        ? String(prof.wallet_address).toLowerCase()
        : null;
    }

    if (!userWallet) {
      logStep("unauthorized: no wallet found", { email, profileId });
      return NextResponse.json(
        { error: "No wallet found for session" },
        { status: 401 }
      );
    }

    console.time("[NFT CREATE] req.json");
    const body = (await req.json()) as CreateBody;
    console.timeEnd("[NFT CREATE] req.json");

    const {
      txHash,
      name,
      description,
      collection,
      externalUrl,
      attributes,
      imageUrl,
      imageBase64,
      feeUsd,
      feeEth,
      ethPriceAtMint,
      listingPriceEth,
      creatorContract: clientContract,
      chainId: clientChainId,
    } = body;

    logStep("body parsed", {
      txHash,
      name,
      hasDescription: Boolean(description),
      hasCollection: Boolean(collection),
      hasExternalUrl: Boolean(externalUrl),
      hasAttributes: Array.isArray(attributes),
      attributeCount: Array.isArray(attributes) ? attributes.length : 0,
      hasImageUrl: Boolean(imageUrl),
      hasImageBase64: Boolean(imageBase64),
      clientChainId,
      clientContract,
      bodyKeys: Object.keys(body || {}),
    });

    if (!txHash || !name) {
      logStep("bad request: missing txHash or name", { txHash, name });
      return NextResponse.json(
        { error: "Missing txHash or name" },
        { status: 400 }
      );
    }

    const normalizedTxHash = txHash as Hash;

    const chainId = parseChainId(
      clientChainId,
      parseChainId(process.env.NEXT_PUBLIC_CHAIN_ID || "8453", 8453)
    );

    const contractAddr = (
      clientContract || CREATOR_CONTRACT || ""
    ).toLowerCase();

    if (!contractAddr) {
      logStep("bad request: missing creator contract");
      return NextResponse.json(
        { error: "Missing creator contract address" },
        { status: 400 }
      );
    }

    if (chainId !== 8453 && chainId !== 84532) {
      logStep("bad request: unsupported chain", { chainId });
      return NextResponse.json(
        { error: `Unsupported chainId ${chainId}` },
        { status: 400 }
      );
    }

    let resolvedImageUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";

    if (!resolvedImageUrl && typeof imageBase64 === "string" && imageBase64.trim()) {
      const raw = imageBase64.trim();

      logStep("imageBase64 detected", {
        approxLength: raw.length,
        startsWithDataImage: raw.startsWith("data:image/"),
      });

      if (isLikelyBase64Image(raw)) {
        return NextResponse.json(
          {
            error:
              "Do not send imageBase64 to /api/nft/create. Upload the image first and send imageUrl instead.",
          },
          { status: 400 }
        );
      }

      resolvedImageUrl = raw;
    }

    if (resolvedImageUrl && isLikelyBase64Image(resolvedImageUrl)) {
      logStep("bad request: imageUrl is actually base64", {
        approxLength: resolvedImageUrl.length,
      });

      return NextResponse.json(
        {
          error:
            "imageUrl looks like a base64 payload. Upload the image first and send a real URL/path.",
        },
        { status: 400 }
      );
    }

    logStep("verification target", {
      chainId,
      txHash,
      contractAddr,
      userWallet,
      resolvedImageUrlPreview: resolvedImageUrl
        ? resolvedImageUrl.slice(0, 120)
        : "",
    });

    console.time("[NFT CREATE] duplicate tx lookup");
    const { data: existingTx, error: existingTxError } = await supabase
      .from("transactions")
      .select("id")
      .eq("tx_hash", txHash)
      .limit(1);
    console.timeEnd("[NFT CREATE] duplicate tx lookup");

    if (existingTxError) {
      logStep("duplicate tx lookup error", {
        message: existingTxError.message,
      });
    }

    if (existingTx?.length) {
      logStep("duplicate tx detected", { txHash });
      return NextResponse.json(
        { error: "Transaction already used" },
        { status: 409 }
      );
    }

    const publicClient = getClientForChain(chainId);

    console.time("[NFT CREATE] getReceiptWithRetry");
    const receipt = await getReceiptWithRetry(publicClient, normalizedTxHash, 5, 1500);
    console.timeEnd("[NFT CREATE] getReceiptWithRetry");

    if (!receipt) {
      logStep("receipt not found after retry", { txHash, chainId });
      return NextResponse.json(
        {
          error:
            "Transaction receipt not found after retries. Check the chainId/RPC and try again.",
        },
        { status: 400 }
      );
    }

    if (receipt.status !== "success") {
      logStep("receipt found but tx failed", {
        txHash,
        chainId,
        status: receipt.status,
      });

      return NextResponse.json(
        { error: "Transaction failed on-chain" },
        { status: 400 }
      );
    }

    let onChainTokenId: string | null = null;
    let onChainCreator: string | null = null;
    let onChainFeePaidEth: number | null = null;
    let onChainMetadataUri: string | null = null;

    logStep("decoding receipt logs", {
      logCount: receipt.logs.length,
      contractAddr,
    });

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
          const feePaid = decoded.args.feePaid;
          const metadataURI = decoded.args.metadataURI;

          if (tokenId != null) onChainTokenId = String(tokenId);
          if (creator != null) onChainCreator = String(creator).toLowerCase();
          if (metadataURI != null) onChainMetadataUri = String(metadataURI);

          if (feePaid != null) {
            try {
              onChainFeePaidEth = Number(feePaid) / 1e18;
            } catch {
              onChainFeePaidEth = null;
            }
          }

          logStep("created event decoded", {
            tokenId: onChainTokenId,
            creator: onChainCreator,
            feePaidEth: onChainFeePaidEth,
            metadataURI: onChainMetadataUri,
          });

          if (onChainTokenId) break;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logStep("log decode skipped", { message });
      }
    }

    if (!onChainTokenId) {
      const TRANSFER_TOPIC =
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

      logStep("created event not found, falling back to transfer log");

      for (const rawLog of receipt.logs) {
        if (!hasTopics(rawLog)) continue;

        const log = rawLog;

        if (log.address.toLowerCase() !== contractAddr) continue;
        if (!log.topics.length) continue;
        if (log.topics[0].toLowerCase() !== TRANSFER_TOPIC) continue;
        if (log.topics.length < 4) continue;

        onChainTokenId = String(BigInt(log.topics[3]));
        onChainCreator = userWallet;

        logStep("transfer fallback resolved token", {
          tokenId: onChainTokenId,
          creator: onChainCreator,
        });

        break;
      }
    }

    if (!onChainTokenId) {
      logStep("verification failed: no mint event found", {
        txHash,
        contractAddr,
        chainId,
        receiptLogCount: receipt.logs.length,
      });

      return NextResponse.json(
        {
          error:
            "No mint event found in transaction. Check contract address, chainId, and RPC.",
        },
        { status: 400 }
      );
    }

    if (onChainCreator && onChainCreator !== userWallet) {
      logStep("wallet mismatch", {
        sessionWallet: userWallet,
        onChainCreator,
        txHash,
      });

      return NextResponse.json(
        { error: "Wallet mismatch — tx creator does not match your session" },
        { status: 400 }
      );
    }

    const parsedFeeEth = parseNumber(feeEth, 0);
    const parsedFeeUsd = parseNumber(feeUsd, 0);
    const parsedEthPriceAtMint = parseNumber(ethPriceAtMint, 0);
    const parsedListingPriceEth = parseNumber(listingPriceEth, 0);

    const mintFeeEth =
      onChainFeePaidEth !== null ? onChainFeePaidEth : parsedFeeEth;

    const mintFeeUsd = parsedFeeUsd;
    const ethPriceSnapshot = parsedEthPriceAtMint;

    const validAttrs = Array.isArray(attributes)
      ? attributes.filter((a) => {
          const attr = a as AttributeInput;
          return (
            String(attr?.trait_type || "").trim() &&
            String(attr?.value || "").trim()
          );
        })
      : [];

    const listedInsert = {
      profile_id: profileId,
      wallet_address: userWallet,
      chain_id: chainId,
      contract_address: contractAddr,
      token_id: onChainTokenId,
      name,
      description: description || "",
      collection: collection || "User Created",
      image_url: resolvedImageUrl,
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
      mint_fee_eth: mintFeeEth,
      listing_price_eth: parsedListingPriceEth,
      mint_fee_usd: mintFeeUsd,
      eth_price_at_mint: ethPriceSnapshot,
      status: "confirmed",
      created_at: new Date().toISOString(),
    };

    logStep("prepared user_listed insert", {
      profileId,
      wallet_address: userWallet,
      token_id: onChainTokenId,
      contract_address: contractAddr,
      tx_hash: txHash,
      hasImageUrl: Boolean(resolvedImageUrl),
      attributeCount: validAttrs.length,
      metadataURI: onChainMetadataUri,
    });

    console.time("[NFT CREATE] user_listed insert");
    const { error: listedError } = await supabase
      .from("user_listed")
      .insert(listedInsert);
    console.timeEnd("[NFT CREATE] user_listed insert");

    if (listedError) {
      logStep("user_listed insert error", {
        code: listedError.code,
        message: listedError.message,
        details: listedError.details,
        hint: listedError.hint,
      });

      return NextResponse.json(
        { error: "Failed to save NFT: " + listedError.message },
        { status: 500 }
      );
    }

    console.time("[NFT CREATE] wallet_mints insert");
    const { error: walletMintsError } = await supabase
      .from("wallet_mints")
      .insert({
        wallet_address: userWallet,
        chain_id: chainId,
        contract_address: contractAddr,
        token_id: onChainTokenId,
        tx_hash: txHash,
        mint_price_eth: 0,
        mint_fee_eth: mintFeeEth,
        mint_fee_usd: mintFeeUsd,
        eth_price_at_mint: ethPriceSnapshot,
        total_paid_eth: mintFeeEth,
        snapshot_name: name,
        snapshot_image: (resolvedImageUrl || "").slice(0, 500),
        snapshot_desc: (description || "").slice(0, 500),
        status: "confirmed",
        minted_at: new Date().toISOString(),
      });
    console.timeEnd("[NFT CREATE] wallet_mints insert");

    if (walletMintsError) {
      logStep("wallet_mints insert error", {
        code: walletMintsError.code,
        message: walletMintsError.message,
        details: walletMintsError.details,
        hint: walletMintsError.hint,
      });
    }

    console.time("[NFT CREATE] transactions insert");
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
        amount_eth: mintFeeEth,
        admin_wallet: "",
        status: "confirmed",
        metadata: {
          type: "create_mint",
          nft_name: name,
          collection: collection || "User Created",
          on_chain_token_id: onChainTokenId,
          on_chain_metadata_uri: onChainMetadataUri,
          mint_fee_usd: mintFeeUsd,
          mint_fee_eth: mintFeeEth,
          eth_price_at_mint: ethPriceSnapshot,
          listing_price_eth: parsedListingPriceEth,
          image_url: resolvedImageUrl,
        },
      });
    console.timeEnd("[NFT CREATE] transactions insert");

    if (txInsertError) {
      logStep("transactions insert error", {
        code: txInsertError.code,
        message: txInsertError.message,
        details: txInsertError.details,
        hint: txInsertError.hint,
      });
    }

    const notifBuyer = email || userWallet;

    void notifyMint({
      nftName: name,
      tokenId: onChainTokenId,
      creator: notifBuyer,
      fee: String(mintFeeEth),
      mintPrice: "0",
      price: String(parsedListingPriceEth),
      contractAddress: contractAddr,
    }).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      logStep("notifyMint failed", { message });
    });

    void telegramNotifyMint({
      nftName: name,
      tokenId: onChainTokenId,
      buyer: notifBuyer,
      fee: String(mintFeeEth),
      listingPrice: String(parsedListingPriceEth),
      contractAddress: contractAddr,
      chainId,
    }).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      logStep("telegramNotifyMint failed", { message });
    });

    console.time("[NFT CREATE] admin_notifications insert");
    try {
      const { error: adminNotifError } = await supabase
        .from("admin_notifications")
        .insert({
          type: "create_mint",
          title: "New NFT Created!",
          body: `${name} (Token #${onChainTokenId}) created by ${notifBuyer} — $${mintFeeUsd} / ${mintFeeEth} ETH fee`,
          metadata: {
            txHash,
            tokenId: onChainTokenId,
            creator: notifBuyer,
            nftName: name,
            contractAddress: contractAddr,
            mint_fee_usd: mintFeeUsd,
            mint_fee_eth: mintFeeEth,
            eth_price_at_mint: ethPriceSnapshot,
            listing_price_eth: parsedListingPriceEth,
            on_chain_metadata_uri: onChainMetadataUri,
            image_url: resolvedImageUrl,
          },
        });

      if (adminNotifError) {
        logStep("admin_notifications insert error", {
          code: adminNotifError.code,
          message: adminNotifError.message,
          details: adminNotifError.details,
          hint: adminNotifError.hint,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logStep("admin_notifications insert threw", { message });
    }
    console.timeEnd("[NFT CREATE] admin_notifications insert");

    logStep("success", {
      txHash,
      tokenId: onChainTokenId,
      chainId,
      contractAddress: contractAddr,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      txHash,
      tokenId: onChainTokenId,
      profileId,
      contractAddress: contractAddr,
      chainId,
      name,
      collection: collection || "User Created",
      imageUrl: resolvedImageUrl,
      metadataURI: onChainMetadataUri,
      mintFeeUsd,
      mintFeeEth,
      ethPriceAtMint: ethPriceSnapshot,
      listingPriceEth: parsedListingPriceEth,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unexpected error";

    logStep("fatal error", {
      message,
      durationMs: Date.now() - startedAt,
    });

    console.error("[/api/nft/create] error:", error);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}