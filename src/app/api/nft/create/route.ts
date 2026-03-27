import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createPublicClient,
  http,
  decodeEventLog,
  type Address,
  type Hash,
} from "viem";
import { base, baseSepolia } from "viem/chains";
import { getSessionData } from "@/lib/auth/session";
import { notifyMint } from "@/lib/pushover";
import { telegramNotifyMint } from "@/lib/telegram";

export const runtime = "nodejs";

const LOG = "[/api/nft/create/confirm]";
const CREATOR_CONTRACT = (process.env.NEXT_PUBLIC_CREATOR_CONTRACT || "").toLowerCase();

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

type ConfirmBody = {
  mintKey?: string;
  txHash?: string;
  creatorContract?: string;
  chainId?: string | number;
  totalPriceEth?: string | number;
  adminCutEth?: string | number;
};

type LogWithTopics = {
  address: Address;
  data: `0x${string}`;
  topics: readonly `0x${string}`[];
};

type AttributeItem = {
  trait_type?: unknown;
  value?: unknown;
};

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase admin environment variables");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function parseNumber(value: unknown, fallback = 0): number {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseChainId(value: unknown, fallback = 8453): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampRoyalty(value: unknown): number {
  const parsed = parseNumber(value, 0);
  return Math.min(30, Math.max(0, parsed));
}

function normalizeAddress(value: unknown): Address | null {
  const addr = String(value || "").trim().toLowerCase();
  return addr ? (addr as Address) : null;
}

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chainLabel(chainId: number) {
  if (chainId === 8453) return "Base";
  if (chainId === 84532) return "Base Sepolia";
  return `Chain ${chainId}`;
}

function isLikelyDataUrl(value: string) {
  return value.startsWith("data:image/");
}

function extractRoyaltyFromAttributes(attributes: unknown): number {
  if (!Array.isArray(attributes)) return 0;

  const found = (attributes as AttributeItem[]).find((item) => {
    return String(item?.trait_type || "").trim().toLowerCase() === "creator royalty";
  });

  if (!found) return 0;

  const raw = String(found.value || "").replace("%", "").trim();
  return clampRoyalty(raw);
}

function getRpcUrls(chainId: number) {
  if (chainId === 8453) {
    return Array.from(
      new Set(
        [
          process.env.BASE_FLASHBLOCKS_RPC_URL,
          process.env.BASE_RPC_URL,
          process.env.BASE_RPC_URL_2,
          "https://mainnet-preconf.base.org",
          "https://mainnet.base.org",
        ].filter(Boolean)
      )
    ) as string[];
  }

  return Array.from(
    new Set(
      [
        process.env.BASE_SEPOLIA_FLASHBLOCKS_RPC_URL,
        process.env.BASE_SEPOLIA_RPC_URL,
        process.env.BASE_SEPOLIA_RPC_URL_2,
        "https://sepolia-preconf.base.org",
        "https://sepolia.base.org",
      ].filter(Boolean)
    )
  ) as string[];
}

function getClientsForChain(chainId: number) {
  const urls = getRpcUrls(chainId);
  const chain = chainId === 8453 ? base : baseSepolia;

  return urls.map((url) =>
    createPublicClient({
      chain,
      transport: http(url, { timeout: 10000 }),
    })
  );
}

async function getReceiptStrong(chainId: number, txHash: Hash) {
  const clients = getClientsForChain(chainId);
  const delays = [0, 600, 1000, 1800, 3000, 5000];

  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) {
      await sleep(delays[i]);
    }

    console.log(LOG, `receipt attempt ${i + 1}/${delays.length}`, {
      chainId,
      txHash,
      clientCount: clients.length,
    });

    const results = await Promise.allSettled(
      clients.map((client) => client.getTransactionReceipt({ hash: txHash }))
    );

    let found = null;

    results.forEach((result, idx) => {
      if (result.status === "fulfilled" && result.value) {
        console.log(LOG, "receipt found from client", {
          idx,
          blockNumber: String(result.value.blockNumber),
          status: result.value.status,
        });
        found = result.value;
      } else if (result.status === "rejected") {
        console.warn(LOG, "receipt lookup failed on one client", {
          idx,
          error: result.reason?.message || String(result.reason),
        });
      }
    });

    if (found) return found;
  }

  console.warn(LOG, "receipt not found after all attempts", { txHash, chainId });
  return null;
}

function decodeMintFromReceipt(receipt: any, contractAddr: string) {
  let onChainTokenId: string | null = null;
  let onChainCreator: string | null = null;
  let onChainFeePaidEth: number | null = null;
  let onChainMetadataUri: string | null = null;

  for (const rawLog of receipt.logs || []) {
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

        if (onChainTokenId) {
          console.log(LOG, "decoded Created event", {
            onChainTokenId,
            onChainCreator,
            onChainFeePaidEth,
            onChainMetadataUri,
          });

          return {
            tokenId: onChainTokenId,
            creator: onChainCreator,
            feePaidEth: onChainFeePaidEth,
            metadataURI: onChainMetadataUri,
          };
        }
      }
    } catch {
      // ignore unrelated logs
    }
  }

  const TRANSFER_TOPIC =
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

  for (const rawLog of receipt.logs || []) {
    if (!hasTopics(rawLog)) continue;

    const log = rawLog;
    if (log.address.toLowerCase() !== contractAddr) continue;
    if (!log.topics.length) continue;
    if (log.topics[0].toLowerCase() !== TRANSFER_TOPIC) continue;
    if (log.topics.length < 4) continue;

    const fallback = {
      tokenId: String(BigInt(log.topics[3])),
      creator: null,
      feePaidEth: null,
      metadataURI: null,
    };

    console.log(LOG, "fallback decoded Transfer event", fallback);
    return fallback;
  }

  console.warn(LOG, "no matching mint logs found in receipt");
  return null;
}

function isInternalConfirmRequest(req: Request) {
  const secret =
    process.env.NFT_CONFIRM_SECRET ||
    process.env.CRON_SECRET ||
    "";

  if (!secret) return false;

  const headerSecret =
    req.headers.get("x-internal-secret") ||
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";

  return Boolean(headerSecret && headerSecret === secret);
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = (await req.json()) as ConfirmBody;
    const isInternal = isInternalConfirmRequest(req);

    console.log(LOG, "incoming request", {
      isInternal,
      body,
    });

    let profileId: string | null = null;
    let email: string | null = null;
    let sessionWallet: string | null = null;

    if (!isInternal) {
      const session = await getSessionData();

      if (!session?.email || !session?.profileId) {
        console.warn(LOG, "unauthorized: missing session");
        return NextResponse.json(
          { error: "You must be logged in to confirm an NFT mint" },
          { status: 401 }
        );
      }

      profileId = String(session.profileId);   // ← FIXED: number → string
      email = session.email;
      sessionWallet = session.wallet || null;
    }

    const mintKey = String(body.mintKey || "").trim();
    const txHash = String(body.txHash || "").trim() as Hash;
    const totalPriceEth = parseNumber(body.totalPriceEth, 0);
    const adminCutEth = parseNumber(body.adminCutEth, 0);

    if (!mintKey) {
      return NextResponse.json({ error: "Missing mintKey" }, { status: 400 });
    }

    if (!txHash || txHash.length !== 66 || !txHash.startsWith("0x")) {
      return NextResponse.json({ error: "Missing or invalid txHash" }, { status: 400 });
    }

    const resolvedChainId = parseChainId(
      body.chainId,
      parseChainId(process.env.NEXT_PUBLIC_CHAIN_ID || "8453", 8453)
    );

    // 🔥 FIX: DB expects chain_id as string
    const dbChainId = String(resolvedChainId);

    if (resolvedChainId !== 8453 && resolvedChainId !== 84532) {
      return NextResponse.json(
        { error: `Unsupported chainId ${resolvedChainId}` },
        { status: 400 }
      );
    }

    let pendingQuery = supabase.from("user_listed").select("*").eq("metadata_key", mintKey);
    if (!isInternal && profileId) {
      pendingQuery = pendingQuery.eq("profile_id", profileId);
    }

    const { data: pendingRow, error: pendingError } = await pendingQuery.maybeSingle();

    if (pendingError) {
      console.error(LOG, "failed loading pending row", pendingError);
      return NextResponse.json(
        { error: `Failed to load mint row: ${pendingError.message}` },
        { status: 500 }
      );
    }

    const contractAddr = normalizeAddress(
      body.creatorContract || pendingRow?.contract_address || CREATOR_CONTRACT
    );

    if (!contractAddr) {
      return NextResponse.json(
        { error: "Missing creator contract address" },
        { status: 400 }
      );
    }

    if (CREATOR_CONTRACT && contractAddr !== CREATOR_CONTRACT) {
      return NextResponse.json(
        { error: "Creator contract does not match the configured contract" },
        { status: 400 }
      );
    }

    console.log(LOG, "loaded pending row", {
      found: Boolean(pendingRow),
      mintKey,
      txHash,
      contractAddr,
      resolvedChainId,
      pendingStatus: pendingRow?.status,
      pendingWallet: pendingRow?.wallet_address,
      pendingTxHash: pendingRow?.tx_hash,
    });

    const { data: existingTransaction } = await supabase
      .from("transactions")
      .select("*")
      .eq("tx_hash", txHash)
      .maybeSingle();

    if (!pendingRow && existingTransaction) {
      console.log(LOG, "pending row missing but transaction already exists", {
        txHash,
        existingStatus: existingTransaction.status,
      });

      return NextResponse.json({
        success: true,
        status: existingTransaction.status || "confirmed",
        mintKey,
        txHash,
        tokenId:
          existingTransaction.token_id ||
          existingTransaction.metadata?.on_chain_token_id ||
          null,
        royaltyPercent: clampRoyalty(existingTransaction.metadata?.royalty_percent || 0),
        totalPriceEth:
          parseNumber(existingTransaction.metadata?.total_price_eth, 0) || totalPriceEth,
      });
    }

    if (!pendingRow) {
      return NextResponse.json({ error: "Mint row not found" }, { status: 404 });
    }

    if (
      pendingRow.status === "confirmed" &&
      pendingRow.tx_hash &&
      String(pendingRow.tx_hash).toLowerCase() !== txHash.toLowerCase()
    ) {
      console.warn(LOG, "confirmed row already tied to different tx hash", {
        mintKey,
        existingTxHash: pendingRow.tx_hash,
        newTxHash: txHash,
      });

      return NextResponse.json(
        { error: "This mint row is already confirmed with a different tx hash" },
        { status: 409 }
      );
    }

    const expectedWallet =
      normalizeAddress(pendingRow.wallet_address) || normalizeAddress(sessionWallet);

    if (pendingRow.status === "confirmed" && pendingRow.tx_hash === txHash) {
      console.log(LOG, "row already confirmed, returning existing result", {
        mintKey,
        txHash,
        tokenId: pendingRow.token_id,
      });

      return NextResponse.json({
        success: true,
        status: "confirmed",
        mintKey,
        txHash,
        tokenId: pendingRow.token_id,
        royaltyPercent: extractRoyaltyFromAttributes(pendingRow.attributes),
        totalPriceEth,
      });
    }

    if (existingTransaction && pendingRow.status !== "confirmed") {
      const repairedTokenId =
        existingTransaction.token_id ||
        existingTransaction.metadata?.on_chain_token_id ||
        pendingRow.token_id;

      console.log(LOG, "repairing pending row from existing transaction", {
        mintKey,
        txHash,
        repairedTokenId,
      });

      await supabase
        .from("user_listed")
        .update({
          token_id: repairedTokenId,
          tx_hash: txHash,
          status: "confirmed",
          chain_id: dbChainId,
          contract_address: contractAddr,
        })
        .eq("metadata_key", mintKey);

      return NextResponse.json({
        success: true,
        status: "confirmed",
        mintKey,
        txHash,
        tokenId: repairedTokenId,
        royaltyPercent:
          clampRoyalty(existingTransaction.metadata?.royalty_percent || 0) ||
          extractRoyaltyFromAttributes(pendingRow.attributes),
        totalPriceEth:
          parseNumber(existingTransaction.metadata?.total_price_eth, 0) || totalPriceEth,
      });
    }

    console.log(LOG, "attaching tx hash to pending row", {
      mintKey,
      txHash,
    });

    const { error: attachError } = await supabase
      .from("user_listed")
      .update({
        tx_hash: txHash,
        status: "mint_submitted",
        chain_id: dbChainId,
        contract_address: contractAddr,
      })
      .eq("metadata_key", mintKey);

    if (attachError) {
      console.error(LOG, "attach tx hash failed", attachError);
      return NextResponse.json(
        { error: `Failed to attach tx hash: ${attachError.message}` },
        { status: 500 }
      );
    }

    const receipt = await getReceiptStrong(resolvedChainId, txHash);

    if (!receipt) {
      console.log(LOG, "receipt not ready yet", { mintKey, txHash });
      return NextResponse.json({
        success: false,
        pending: true,
        status: "mint_submitted",
        mintKey,
        txHash,
        message: "Receipt not ready yet. Tx hash is attached and confirmation can continue.",
      });
    }

    console.log(LOG, "receipt loaded", {
      txHash,
      status: receipt.status,
      blockNumber: String(receipt.blockNumber),
      logsCount: Array.isArray(receipt.logs) ? receipt.logs.length : 0,
    });

    if (receipt.status !== "success") {
      console.warn(LOG, "receipt found but tx reverted", { mintKey, txHash });

      await supabase
        .from("user_listed")
        .update({
          tx_hash: txHash,
          status: "failed",
        })
        .eq("metadata_key", mintKey);

      return NextResponse.json(
        { error: "Transaction failed on-chain" },
        { status: 400 }
      );
    }

    const decoded = decodeMintFromReceipt(receipt, String(contractAddr).toLowerCase());

    if (!decoded?.tokenId) {
      console.warn(LOG, "receipt exists but no mint event found", {
        mintKey,
        txHash,
      });

      return NextResponse.json(
        { error: "No mint event found in transaction receipt" },
        { status: 400 }
      );
    }

    if (decoded.creator && expectedWallet && decoded.creator !== expectedWallet) {
      console.warn(LOG, "creator mismatch", {
        decodedCreator: decoded.creator,
        expectedWallet,
      });

      return NextResponse.json(
        { error: "Wallet mismatch — tx creator does not match the pending mint wallet" },
        { status: 400 }
      );
    }

    const parsedRoyaltyPercent = extractRoyaltyFromAttributes(pendingRow.attributes);
    const listingPriceEth = parseNumber(pendingRow.listing_price_eth, 0);
    const mintFeeEth =
      decoded.feePaidEth !== null && decoded.feePaidEth !== undefined
        ? decoded.feePaidEth
        : parseNumber(pendingRow.mint_fee_eth, 0);

    const finalTotalPaidEth = totalPriceEth > 0 ? totalPriceEth : mintFeeEth;

    console.log(LOG, "marking mint confirmed", {
      mintKey,
      txHash,
      tokenId: decoded.tokenId,
      parsedRoyaltyPercent,
      listingPriceEth,
      mintFeeEth,
      finalTotalPaidEth,
      metadataURI: decoded.metadataURI,
    });

    const { error: confirmError } = await supabase
      .from("user_listed")
      .update({
        token_id: decoded.tokenId,
        tx_hash: txHash,
        chain_id: dbChainId,
        contract_address: contractAddr,
        mint_fee_eth: mintFeeEth,
        status: "confirmed",
      })
      .eq("metadata_key", mintKey);

    if (confirmError) {
      console.error(LOG, "failed marking user_listed confirmed", confirmError);
      return NextResponse.json(
        { error: `Failed to mark NFT confirmed: ${confirmError.message}` },
        { status: 500 }
      );
    }

    const resolvedWallet =
      expectedWallet || String(pendingRow.wallet_address || "").toLowerCase();

    const { data: existingWalletMint } = await supabase
      .from("wallet_mints")
      .select("id")
      .eq("tx_hash", txHash)
      .maybeSingle();

    if (!existingWalletMint) {
      console.log(LOG, "inserting wallet_mints row", { txHash, tokenId: decoded.tokenId });

      const { error: walletMintError } = await supabase.from("wallet_mints").insert({
        wallet_address: resolvedWallet,
        chain_id: dbChainId,
        contract_address: contractAddr,
        token_id: decoded.tokenId,
        tx_hash: txHash,
        mint_price_eth: listingPriceEth,
        mint_fee_eth: mintFeeEth,
        mint_fee_usd: 0,
        eth_price_at_mint: 0,
        total_paid_eth: finalTotalPaidEth,
        snapshot_name: pendingRow.name,
        snapshot_image: String(pendingRow.image_url || "").slice(0, 500),
        snapshot_desc: String(pendingRow.description || "").slice(0, 500),
        status: "confirmed",
        minted_at: new Date().toISOString(),
      });

      if (walletMintError) {
        console.error(LOG, "wallet_mints insert failed", walletMintError);
      }
    } else {
      console.log(LOG, "wallet_mints row already exists", { txHash });
    }

    const { data: transactionRow } = await supabase
      .from("transactions")
      .select("id")
      .eq("tx_hash", txHash)
      .maybeSingle();

    let insertedTransaction = false;

    if (!transactionRow) {
      console.log(LOG, "inserting transactions row", { txHash, tokenId: decoded.tokenId });

      const { error: txInsertError } = await supabase.from("transactions").insert({
        wallet_address: resolvedWallet,
        profile_id: String(pendingRow.profile_id),   // ← FIXED: number → string
        tx_hash: txHash,
        tx_type: "create_mint",
        chain_id: dbChainId,
        contract_address: contractAddr,
        token_id: decoded.tokenId,
        amount_eth: finalTotalPaidEth,
        admin_wallet: "",
        status: "confirmed",
        metadata: {
          type: "create_mint",
          mint_key: mintKey,
          nft_name: pendingRow.name,
          collection: pendingRow.collection || "User Created",
          on_chain_token_id: decoded.tokenId,
          on_chain_metadata_uri: decoded.metadataURI,
          mint_fee_eth: mintFeeEth,
          total_price_eth: finalTotalPaidEth,
          admin_cut_eth: adminCutEth,
          listing_price_eth: listingPriceEth,
          royalty_percent: parsedRoyaltyPercent,
          image_url: pendingRow.image_url,
          image_storage_mode: isLikelyDataUrl(String(pendingRow.image_url || ""))
            ? "db_data_url"
            : "external_url",
        },
      });

      if (txInsertError) {
        console.error(LOG, "transactions insert failed", txInsertError);
        return NextResponse.json(
          { error: `Failed to record transaction: ${txInsertError.message}` },
          { status: 500 }
        );
      }

      insertedTransaction = true;
    } else {
      console.log(LOG, "transactions row already exists", { txHash });
    }

    if (insertedTransaction) {
      const notifBuyer =
        email ||
        resolvedWallet ||
        "unknown";

      console.log(LOG, "sending notifications after confirmed transaction", {
        notifBuyer,
        txHash,
        tokenId: decoded.tokenId,
      });

      void notifyMint({
        nftName: pendingRow.name,
        tokenId: decoded.tokenId,
        creator: notifBuyer,
        fee: String(mintFeeEth),
        mintPrice: "0",
        price: String(listingPriceEth),
        contractAddress: contractAddr,
      }).catch((err) => {
        console.error(LOG, "notifyMint failed", err);
      });

      void telegramNotifyMint({
        nftName: pendingRow.name,
        tokenId: decoded.tokenId,
        buyer: notifBuyer,
        fee: String(mintFeeEth),
        listingPrice: String(listingPriceEth),
        contractAddress: contractAddr,
        chainId: resolvedChainId,
      }).catch((err) => {
        console.error(LOG, "telegramNotifyMint failed", err);
      });

      const { error: adminNotifError } = await supabase
        .from("admin_notifications")
        .insert({
          type: "create_mint",
          title: "New NFT Created!",
          body: `${pendingRow.name} (Token #${decoded.tokenId}) created by ${notifBuyer} — ${parsedRoyaltyPercent}% royalty`,
          metadata: {
            mintKey,
            txHash,
            tokenId: decoded.tokenId,
            creator: notifBuyer,
            nftName: pendingRow.name,
            contractAddress: contractAddr,
            chainId: resolvedChainId,
            chain: chainLabel(resolvedChainId),
            mint_fee_eth: mintFeeEth,
            total_price_eth: finalTotalPaidEth,
            admin_cut_eth: adminCutEth,
            listing_price_eth: listingPriceEth,
            royalty_percent: parsedRoyaltyPercent,
            on_chain_metadata_uri: decoded.metadataURI,
            image_url: pendingRow.image_url,
          },
        });

      if (adminNotifError) {
        console.error(LOG, "admin notification insert failed", adminNotifError);
      }
    }

    return NextResponse.json({
      success: true,
      pending: false,
      status: "confirmed",
      mintKey,
      txHash,
      tokenId: decoded.tokenId,
      profileId: pendingRow.profile_id,
      contractAddress: contractAddr,
      chainId: resolvedChainId,
      chain: chainLabel(resolvedChainId),
      name: pendingRow.name,
      collection: pendingRow.collection || "User Created",
      royaltyPercent: parsedRoyaltyPercent,
      totalPriceEth: finalTotalPaidEth,
      adminCutEth,
      mintFeeEth,
      listingPriceEth,
      hasImage: Boolean(pendingRow.image_url),
      metadataURI: decoded.metadataURI,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error(LOG, "error", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
