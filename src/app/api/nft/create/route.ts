import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  createPublicClient,
  http,
  decodeEventLog,
  formatEther,
  type Address,
  type Hash,
  type TransactionReceipt,
} from "viem";
import { base, baseSepolia } from "viem/chains";
import { getSessionData } from "@/lib/auth/session";
import { notifyMint } from "@/lib/pushover";
import { telegramNotifyMint } from "@/lib/telegram";

export const runtime = "nodejs";

const LOG = "[/api/nft/create]";
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

const ERC721_TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ZERO_TOPIC = `0x${"0".repeat(64)}`;

type AttributeInput = {
  trait_type?: unknown;
  value?: unknown;
};

type LogWithTopics = {
  address: Address;
  data: `0x${string}`;
  topics: readonly `0x${string}`[];
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

function jsonError(
  message: string,
  status = 400,
  extra?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(extra || {}),
    },
    { status }
  );
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

function isLikelyDataUrl(value: string) {
  return value.startsWith("data:image/");
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

function normalizeAttributes(
  raw: unknown
): Array<{ trait_type: string; value: string }> {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const attr = item as AttributeInput;
      return {
        trait_type: String(attr?.trait_type ?? "").trim(),
        value: String(attr?.value ?? "").trim(),
      };
    })
    .filter((item) => item.trait_type && item.value);
}

function upsertRoyaltyAttribute(
  attrs: Array<{ trait_type: string; value: string }>,
  royaltyPercent: number
) {
  const filtered = attrs.filter(
    (a) => a.trait_type.trim().toLowerCase() !== "creator royalty"
  );

  if (royaltyPercent <= 0) return filtered;

  return [
    ...filtered,
    {
      trait_type: "Creator Royalty",
      value: `${royaltyPercent}%`,
    },
  ];
}

function extractRoyaltyFromAttributes(attributes: unknown): number {
  if (!Array.isArray(attributes)) return 0;

  const found = (attributes as AttributeInput[]).find((item) => {
    return (
      String(item?.trait_type ?? "").trim().toLowerCase() ===
      "creator royalty"
    );
  });

  if (!found) return 0;

  const raw = String(found.value ?? "").replace("%", "").trim();
  return clampRoyalty(raw);
}

function compactTruthyStrings(values: Array<string | undefined | null>): string[] {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

function getRpcUrls(chainId: number): string[] {
  if (chainId === 8453) {
    return compactTruthyStrings([
      process.env.BASE_FLASHBLOCKS_RPC_URL,
      process.env.BASE_RPC_URL,
      process.env.BASE_RPC_URL_2,
      "https://mainnet-preconf.base.org",
      "https://mainnet.base.org",
    ]);
  }

  return compactTruthyStrings([
    process.env.BASE_SEPOLIA_FLASHBLOCKS_RPC_URL,
    process.env.BASE_SEPOLIA_RPC_URL,
    process.env.BASE_SEPOLIA_RPC_URL_2,
    "https://sepolia-preconf.base.org",
    "https://sepolia.base.org",
  ]);
}

function getClientsForChain(chainId: number) {
  const urls = getRpcUrls(chainId);
  const chain = chainId === 8453 ? base : baseSepolia;

  return urls.map((url) =>
    createPublicClient({
      chain,
      transport: http(url, { timeout: 10_000 }),
    })
  );
}

async function getReceiptStrong(
  chainId: number,
  txHash: Hash
): Promise<TransactionReceipt | null> {
  const clients = getClientsForChain(chainId);
  const delays = [0, 800, 1200, 1800, 3000, 5000, 8000, 12000];

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

    for (const [idx, result] of results.entries()) {
      if (result.status === "fulfilled" && result.value) {
        console.log(LOG, "receipt found from client", {
          idx,
          blockNumber: String(result.value.blockNumber),
          status: result.value.status,
        });
        return result.value;
      }

      if (result.status === "rejected") {
        console.warn(LOG, "receipt lookup failed on one client", {
          idx,
          error:
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
        });
      }
    }
  }

  return null;
}

function decodeMintFromReceipt(
  receipt: TransactionReceipt,
  contractAddr: string
): {
  tokenId: string | null;
  creator: string | null;
  feePaidEth: number | null;
  metadataURI: string | null;
  usedFallback: boolean;
} | null {
  for (const rawLog of receipt.logs || []) {
    if (!hasTopics(rawLog)) continue;
    if (rawLog.address.toLowerCase() !== contractAddr) continue;
    if (!rawLog.topics.length) continue;

    try {
      const decoded = decodeEventLog({
        abi: CREATED_EVENT_ABI,
        data: rawLog.data,
        topics: [...rawLog.topics] as [`0x${string}`, ...`0x${string}`[]],
      }) as {
        eventName?: string;
        args?: Record<string, unknown>;
      };

      if (decoded.eventName === "Created" && decoded.args) {
        const tokenId =
          decoded.args.tokenId != null ? String(decoded.args.tokenId) : null;
        const creator =
          decoded.args.creator != null
            ? String(decoded.args.creator).toLowerCase()
            : null;
        const metadataURI =
          decoded.args.metadataURI != null
            ? String(decoded.args.metadataURI)
            : null;

        let feePaidEth: number | null = null;
        if (decoded.args.feePaid != null) {
          try {
            feePaidEth = Number(
              formatEther(BigInt(String(decoded.args.feePaid)))
            );
          } catch {
            feePaidEth = null;
          }
        }

        if (tokenId) {
          return {
            tokenId,
            creator,
            feePaidEth,
            metadataURI,
            usedFallback: false,
          };
        }
      }
    } catch {
      // ignore unrelated logs
    }
  }

  for (const rawLog of receipt.logs || []) {
    if (!hasTopics(rawLog)) continue;
    if (rawLog.address.toLowerCase() !== contractAddr) continue;
    if (!rawLog.topics.length) continue;
    if (rawLog.topics[0].toLowerCase() !== ERC721_TRANSFER_TOPIC) continue;
    if (rawLog.topics.length < 4) continue;
    if (rawLog.topics[1].toLowerCase() !== ZERO_TOPIC) continue;

    return {
      tokenId: String(BigInt(rawLog.topics[3])),
      creator: null,
      feePaidEth: null,
      metadataURI: null,
      usedFallback: true,
    };
  }

  return null;
}

async function fileToDataUrl(file: File): Promise<string> {
  const arr = await file.arrayBuffer();
  const buffer = Buffer.from(arr);
  const mime = file.type || "application/octet-stream";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function getBaseUrl(req: Request) {
  const url = new URL(req.url);
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const origin = req.headers.get("origin");
  if (origin) return origin;

  return url.origin;
}

function normalizeText(value: unknown, maxLen = 0) {
  const text = String(value ?? "").trim();
  if (!maxLen || text.length <= maxLen) return text;
  return text.slice(0, maxLen).trim();
}

async function resolveUserWallet(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  email: string,
  sessionWallet?: string | null
) {
  const normalizedSessionWallet = normalizeAddress(sessionWallet);
  if (normalizedSessionWallet) return normalizedSessionWallet;

  const { data: prof, error: profError } = await supabase
    .from("profiles")
    .select("wallet_address")
    .eq("email", email)
    .maybeSingle();

  if (profError) {
    throw new Error(`Failed to resolve wallet: ${profError.message}`);
  }

  const wallet = normalizeAddress(prof?.wallet_address);
  if (!wallet) {
    throw new Error("No wallet found for session");
  }

  return wallet;
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const session = await getSessionData();

    if (!session?.email || !session?.profileId) {
      return jsonError("You must be logged in to create an NFT", 401);
    }

    const profileId = String(session.profileId);
    const email = session.email;
    const userWallet = await resolveUserWallet(
      supabase,
      email,
      session.wallet || null
    );

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return jsonError("Invalid form submission", 400);
    }

    const txHash = String(form.get("txHash") || "").trim() as Hash;
    const mintKey = normalizeText(form.get("mintKey"), 200);
    const chainId = parseChainId(
      form.get("chainId"),
      parseChainId(process.env.NEXT_PUBLIC_CHAIN_ID || "8453", 8453)
    );
    const contractAddr = normalizeAddress(
      form.get("creatorContract") || CREATOR_CONTRACT
    );
    const walletAddressFromClient = normalizeAddress(form.get("walletAddress"));
    const expectedMetadataUri =
      normalizeText(form.get("metadataUri"), 1000) ||
      `${getBaseUrl(req)}/api/nft/token-metadata/${encodeURIComponent(mintKey)}`;

    if (!mintKey) return jsonError("Missing mintKey", 400);
    if (!txHash || txHash.length !== 66 || !txHash.startsWith("0x")) {
      return jsonError("Missing or invalid txHash", 400);
    }
    if (!contractAddr) return jsonError("Missing creator contract address", 400);

    if (CREATOR_CONTRACT && contractAddr !== CREATOR_CONTRACT) {
      return jsonError(
        "Creator contract does not match the configured contract",
        400,
        {
          provided: contractAddr,
          expected: CREATOR_CONTRACT,
        }
      );
    }

    if (chainId !== 8453 && chainId !== 84532) {
      return jsonError(`Unsupported chainId ${chainId}`, 400);
    }

    if (walletAddressFromClient && walletAddressFromClient !== userWallet) {
      return jsonError(
        "Wallet mismatch — form wallet does not match your session",
        400,
        {
          formWallet: walletAddressFromClient,
          sessionWallet: userWallet,
        }
      );
    }

    const { data: existingByTx, error: existingByTxError } = await supabase
      .from("user_listed")
      .select("*")
      .eq("tx_hash", txHash)
      .eq("profile_id", profileId)
      .maybeSingle();

    if (existingByTxError) {
      return jsonError(
        `Failed to check existing tx row: ${existingByTxError.message}`,
        500
      );
    }

    if (existingByTx?.status === "confirmed") {
      return NextResponse.json({
        success: true,
        status: "confirmed",
        txHash,
        mintKey: existingByTx.metadata_key,
        tokenId: existingByTx.token_id,
        royaltyPercent: extractRoyaltyFromAttributes(existingByTx.attributes),
        mintFeeEth: parseNumber(existingByTx.mint_fee_eth, 0),
      });
    }

    const { data: existingByKey, error: existingByKeyError } = await supabase
      .from("user_listed")
      .select("*")
      .eq("profile_id", profileId)
      .eq("metadata_key", mintKey)
      .maybeSingle();

    if (existingByKeyError) {
      return jsonError(
        `Failed to check existing mint row: ${existingByKeyError.message}`,
        500
      );
    }

    const name = normalizeText(form.get("name") ?? "", 100);
    const description = normalizeText(form.get("description") ?? "", 1000);
    const collection =
      normalizeText(form.get("collection") ?? "", 100) || "User Created";
    const externalUrl = normalizeText(form.get("externalUrl") ?? "", 1000);

    const listingPriceEth = parseNumber(form.get("listingPriceEth"), 0);
    const feeEthFromClient = parseNumber(form.get("feeEth"), 0);

    if (!name) return jsonError("Missing NFT name", 400);

    let rawAttrs: unknown = [];
    const attrsRawText = String(form.get("attributes") ?? "").trim();

    if (attrsRawText) {
      try {
        rawAttrs = JSON.parse(attrsRawText);
      } catch {
        return jsonError("Invalid attributes JSON", 400);
      }
    }

    const royaltyPercent = clampRoyalty(form.get("royaltyPercent") ?? 0);
    const attributes = upsertRoyaltyAttribute(
      normalizeAttributes(rawAttrs),
      royaltyPercent
    );

    let imageUrl = "";

    const imageFile = form.get("imageFile");
    if (imageFile instanceof File && imageFile.size > 0) {
      if (imageFile.size > 4 * 1024 * 1024) {
        return jsonError("Image file must be under 4MB", 400);
      }
      imageUrl = await fileToDataUrl(imageFile);
    } else if (existingByKey?.image_url) {
      imageUrl = String(existingByKey.image_url).trim();
    }

    if (!imageUrl) {
      return jsonError("Missing NFT image", 400);
    }

    const receipt = await getReceiptStrong(chainId, txHash);

    if (!receipt) {
      return jsonError(
        "Could not verify the transaction receipt from the backend yet. Retry sync.",
        504
      );
    }

    if (receipt.status !== "success") {
      return jsonError("Transaction failed on-chain", 400, { txHash });
    }

    const receiptTo = normalizeAddress(receipt.to);
    const receiptFrom = normalizeAddress(receipt.from);

    if (receiptTo && receiptTo !== contractAddr) {
      return jsonError("Transaction was not sent to the creator contract", 400, {
        txTo: receiptTo,
        expectedContract: contractAddr,
      });
    }

    if (receiptFrom && receiptFrom !== userWallet) {
      return jsonError("Transaction wallet does not match your session wallet", 400, {
        txFrom: receiptFrom,
        sessionWallet: userWallet,
      });
    }

    const decoded = decodeMintFromReceipt(
      receipt,
      String(contractAddr).toLowerCase()
    );

    if (!decoded?.tokenId) {
      return jsonError("No mint event found in the transaction receipt", 400, {
        txHash,
      });
    }

    if (decoded.creator && decoded.creator !== userWallet) {
      return jsonError("Mint creator does not match your session wallet", 400, {
        eventCreator: decoded.creator,
        sessionWallet: userWallet,
      });
    }

    if (decoded.metadataURI && decoded.metadataURI !== expectedMetadataUri) {
      return jsonError(
        "Mint metadata URI does not match the NFT being finalized",
        400,
        {
          expectedMetadataUri,
          eventMetadataUri: decoded.metadataURI,
        }
      );
    }

    const mintFeeEth =
      decoded.feePaidEth !== null && decoded.feePaidEth !== undefined
        ? decoded.feePaidEth
        : feeEthFromClient;

    const rowPayload = {
      profile_id: profileId,
      metadata_key: mintKey,
      wallet_address: userWallet,
      chain_id: String(chainId),
      contract_address: contractAddr,
      token_id: decoded.tokenId,
      name,
      description,
      collection,
      image_url: imageUrl,
      external_url: externalUrl,
      attributes,
      token_type: "ERC721",
      chain: chainLabel(chainId),
      tx_hash: txHash,
      mint_fee_eth: mintFeeEth,
      listing_price_eth: listingPriceEth,
      status: "confirmed",
      created_at: existingByKey?.created_at || new Date().toISOString(),
    };

    if (!existingByKey) {
      const { error: insertError } = await supabase
        .from("user_listed")
        .insert(rowPayload);

      if (insertError) {
        return jsonError(`Failed to save minted NFT: ${insertError.message}`, 500);
      }
    } else {
      const { error: updateError } = await supabase
        .from("user_listed")
        .update(rowPayload)
        .eq("profile_id", profileId)
        .eq("metadata_key", mintKey);

      if (updateError) {
        return jsonError(`Failed to update minted NFT: ${updateError.message}`, 500);
      }
    }

    const { data: existingWalletMint } = await supabase
      .from("wallet_mints")
      .select("id")
      .eq("tx_hash", txHash)
      .maybeSingle();

    if (!existingWalletMint) {
      const { error: walletMintError } = await supabase.from("wallet_mints").insert({
        wallet_address: userWallet,
        chain_id: String(chainId),
        contract_address: contractAddr,
        token_id: decoded.tokenId,
        tx_hash: txHash,
        mint_price_eth: listingPriceEth,
        mint_fee_eth: mintFeeEth,
        mint_fee_usd: 0,
        eth_price_at_mint: 0,
        total_paid_eth: mintFeeEth,
        snapshot_name: name,
        snapshot_image: String(imageUrl).slice(0, 500),
        snapshot_desc: String(description).slice(0, 500),
        status: "confirmed",
        minted_at: new Date().toISOString(),
      });

      if (walletMintError) {
        console.error(LOG, "wallet_mints insert failed", walletMintError);
      }
    }

    const { data: existingTransaction } = await supabase
      .from("transactions")
      .select("id")
      .eq("tx_hash", txHash)
      .maybeSingle();

    let insertedTransaction = false;

    if (!existingTransaction) {
      const { error: txInsertError } = await supabase.from("transactions").insert({
        wallet_address: userWallet,
        profile_id: profileId,
        tx_hash: txHash,
        tx_type: "create_mint",
        chain_id: String(chainId),
        contract_address: contractAddr,
        token_id: decoded.tokenId,
        amount_eth: mintFeeEth,
        admin_wallet: "",
        status: "confirmed",
        metadata: {
          type: "create_mint",
          mint_key: mintKey,
          nft_name: name,
          collection,
          on_chain_token_id: decoded.tokenId,
          on_chain_metadata_uri: decoded.metadataURI || expectedMetadataUri,
          mint_fee_eth: mintFeeEth,
          listing_price_eth: listingPriceEth,
          royalty_percent: royaltyPercent,
          image_url: imageUrl,
          image_storage_mode: isLikelyDataUrl(String(imageUrl || ""))
            ? "db_data_url"
            : "external_url",
        },
      });

      if (txInsertError) {
        return jsonError(`Failed to record transaction: ${txInsertError.message}`, 500);
      }

      insertedTransaction = true;
    }

    if (insertedTransaction) {
      const notifBuyer = email || userWallet || "unknown";

      void notifyMint({
        nftName: name,
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
        nftName: name,
        tokenId: decoded.tokenId,
        buyer: notifBuyer,
        fee: String(mintFeeEth),
        listingPrice: String(listingPriceEth),
        contractAddress: contractAddr,
        chainId,
      }).catch((err) => {
        console.error(LOG, "telegramNotifyMint failed", err);
      });

      const { error: adminNotifError } = await supabase
        .from("admin_notifications")
        .insert({
          type: "create_mint",
          title: "New NFT Created!",
          body: `${name} (Token #${decoded.tokenId}) created by ${notifBuyer} — ${royaltyPercent}% royalty`,
          metadata: {
            mintKey,
            txHash,
            tokenId: decoded.tokenId,
            creator: notifBuyer,
            nftName: name,
            contractAddress: contractAddr,
            chainId,
            chain: chainLabel(chainId),
            mint_fee_eth: mintFeeEth,
            listing_price_eth: listingPriceEth,
            royalty_percent: royaltyPercent,
            on_chain_metadata_uri: decoded.metadataURI || expectedMetadataUri,
            image_url: imageUrl,
          },
        });

      if (adminNotifError) {
        console.error(LOG, "admin notification insert failed", adminNotifError);
      }
    }

    return NextResponse.json({
      success: true,
      status: "confirmed",
      txHash,
      mintKey,
      tokenId: decoded.tokenId,
      profileId,
      contractAddress: contractAddr,
      chainId,
      chain: chainLabel(chainId),
      name,
      description,
      collection,
      royaltyPercent,
      mintFeeEth,
      listingPriceEth,
      hasImage: Boolean(imageUrl),
      metadataURI: decoded.metadataURI || expectedMetadataUri,
      usedTransferFallback: decoded.usedFallback,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error(LOG, "error", error);
    return jsonError(message, 500);
  }
}