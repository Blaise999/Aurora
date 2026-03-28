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

type MetadataJson = {
  name?: unknown;
  description?: unknown;
  image?: unknown;
  external_url?: unknown;
  attributes?: unknown;
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
    } catch {}
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

function normalizeText(value: unknown, maxLen = 0) {
  const text = String(value ?? "").trim();
  if (!maxLen || text.length <= maxLen) return text;
  return text.slice(0, maxLen).trim();
}

function toJsonSafe(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();

  if (Array.isArray(value)) {
    return value.map((item) => toJsonSafe(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        toJsonSafe(val),
      ])
    );
  }

  return value;
}

function normalizeGateway(input?: string | null) {
  const raw = String(input || "").trim();
  if (!raw) return "gateway.pinata.cloud";

  return raw
    .replace(/^https?:\/\//i, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function extractIpfsCid(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (raw.startsWith("ipfs://")) {
    return raw
      .replace(/^ipfs:\/\//i, "")
      .replace(/^ipfs\//i, "")
      .replace(/^\/+/, "")
      .split(/[?#]/)[0]
      .replace(/\/+$/, "");
  }

  const match = raw.match(/\/ipfs\/([^/?#]+)/i);
  if (match?.[1]) return match[1];

  return "";
}

function buildGatewayUrlFromCid(cid: string, gatewayDomain: string) {
  return cid ? `https://${gatewayDomain}/ipfs/${cid}` : "";
}

function buildGatewayUrlFromUri(value: unknown, gatewayDomain: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  const cid = extractIpfsCid(raw);
  if (!cid) return "";

  return buildGatewayUrlFromCid(cid, gatewayDomain);
}

async function fetchMetadataJson(url: string): Promise<MetadataJson | null> {
  if (!url) return null;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data || typeof data !== "object") return null;

    return data as MetadataJson;
  } catch {
    return null;
  }
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

async function syncMintedNftToCatalog({
  supabase,
  chainId,
  contractAddr,
  tokenId,
  name,
  description,
  collection,
  imageUrl,
  attributes,
  externalUrl,
  txHash,
  metadataKey,
  listingPriceEth,
  mintFeeEth,
  metadataUri,
  updatedBy,
}: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  chainId: number;
  contractAddr: string;
  tokenId: string;
  name: string;
  description: string;
  collection: string;
  imageUrl: string;
  attributes: Array<{ trait_type: string; value: string }>;
  externalUrl: string;
  txHash: string;
  metadataKey: string;
  listingPriceEth: number;
  mintFeeEth: number;
  metadataUri: string;
  updatedBy: string;
}) {
  const rawMetadata = toJsonSafe({
    name,
    description,
    image: imageUrl,
    image_url: imageUrl,
    external_url: externalUrl || "",
    attributes,
    token_type: "ERC721",
    chain: chainLabel(chainId),
    tx_hash: txHash,
    metadata_key: metadataKey,
    metadata_uri: metadataUri,
    listing_price_eth: listingPriceEth,
    mint_fee_eth: mintFeeEth,
    source: "minted",
  });

  const { data: existingCachedRows, error: existingCachedError } = await supabase
    .from("cached_nfts")
    .select("id")
    .eq("chain_id", chainId)
    .eq("contract_address", contractAddr)
    .eq("token_id", tokenId)
    .limit(1);

  if (existingCachedError) {
    throw new Error(`Failed checking cached NFT: ${existingCachedError.message}`);
  }

  let cachedNftId: number | null = existingCachedRows?.[0]?.id ?? null;

  const cachedPayload = {
    chain_id: chainId,
    contract_address: contractAddr,
    token_id: tokenId,
    name,
    description,
    image_url: imageUrl,
    collection_name: collection || "User Created",
    token_type: "ERC721",
    attributes,
    raw_metadata: rawMetadata,
    is_active: true,
    synced_at: new Date().toISOString(),
    batch_id: `minted_${metadataKey}`,
  };

  if (cachedNftId) {
    const { error: updateCachedError } = await supabase
      .from("cached_nfts")
      .update(cachedPayload)
      .eq("id", cachedNftId);

    if (updateCachedError) {
      throw new Error(`Failed updating cached NFT: ${updateCachedError.message}`);
    }
  } else {
    const { data: insertedCached, error: insertCachedError } = await supabase
      .from("cached_nfts")
      .insert(cachedPayload)
      .select("id")
      .single();

    if (insertCachedError) {
      throw new Error(`Failed inserting cached NFT: ${insertCachedError.message}`);
    }

    cachedNftId = insertedCached?.id ?? null;
  }

  const { data: existingPricingRows, error: existingPricingError } = await supabase
    .from("nft_pricing")
    .select("id")
    .eq("chain_id", chainId)
    .eq("contract_address", contractAddr)
    .eq("token_id", tokenId)
    .limit(1);

  if (existingPricingError) {
    throw new Error(`Failed checking NFT pricing: ${existingPricingError.message}`);
  }

  const existingPricingId = existingPricingRows?.[0]?.id ?? null;

  const pricingPayload = {
    cached_nft_id: cachedNftId,
    chain_id: chainId,
    contract_address: contractAddr,
    token_id: tokenId,
    mint_price_eth: listingPriceEth,
    mint_fee_eth: mintFeeEth,
    is_featured: false,
    is_listed: listingPriceEth > 0,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };

  if (existingPricingId) {
    const { error: updatePricingError } = await supabase
      .from("nft_pricing")
      .update(pricingPayload)
      .eq("id", existingPricingId);

    if (updatePricingError) {
      throw new Error(`Failed updating NFT pricing: ${updatePricingError.message}`);
    }
  } else {
    const { error: insertPricingError } = await supabase
      .from("nft_pricing")
      .insert(pricingPayload);

    if (insertPricingError) {
      throw new Error(`Failed inserting NFT pricing: ${insertPricingError.message}`);
    }
  }
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const session = await getSessionData();

    if (!session?.email || !session?.profileId) {
      return jsonError("You must be logged in to create an NFT", 401);
    }

    const profileId = Number(session.profileId);
    if (!Number.isFinite(profileId)) {
      return jsonError("Invalid profile id in session", 400);
    }

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
    const chainId = parseChainId(
      form.get("chainId"),
      parseChainId(process.env.NEXT_PUBLIC_CHAIN_ID || "8453", 8453)
    );
    const contractAddr = normalizeAddress(
      form.get("creatorContract") || CREATOR_CONTRACT
    );
    const walletAddressFromClient = normalizeAddress(form.get("walletAddress"));
    const expectedMetadataUri = normalizeText(form.get("metadataUri"), 2000);
    const metadataKey =
      extractIpfsCid(expectedMetadataUri) ||
      normalizeText(form.get("mintKey"), 255);

    const gatewayDomain = normalizeGateway(
      process.env.PINATA_GATEWAY ||
        process.env.NEXT_PUBLIC_PINATA_GATEWAY ||
        "gateway.pinata.cloud"
    );

    const metadataGatewayUrlFromClient =
      normalizeText(form.get("ipfsMetadataUrl"), 2000) ||
      buildGatewayUrlFromUri(expectedMetadataUri, gatewayDomain);

    const imageIpfsUriFromClient = normalizeText(form.get("ipfsImageUri"), 2000);
    const imageGatewayUrlFromClient =
      normalizeText(form.get("ipfsImageUrl"), 2000) ||
      buildGatewayUrlFromUri(imageIpfsUriFromClient, gatewayDomain);

    if (!txHash || txHash.length !== 66 || !txHash.startsWith("0x")) {
      return jsonError("Missing or invalid txHash", 400);
    }

    if (!contractAddr) {
      return jsonError("Missing creator contract address", 400);
    }

    if (!expectedMetadataUri) {
      return jsonError("Missing metadataUri", 400);
    }

    if (!metadataKey) {
      return jsonError("Could not derive metadata key from metadataUri", 400, {
        metadataUri: expectedMetadataUri,
      });
    }

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

    const metadataFromGateway = await fetchMetadataJson(metadataGatewayUrlFromClient);

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
      await syncMintedNftToCatalog({
        supabase,
        chainId: Number(existingByTx.chain_id || chainId),
        contractAddr: String(existingByTx.contract_address || contractAddr).toLowerCase(),
        tokenId: String(existingByTx.token_id || ""),
        name: String(existingByTx.name || "Untitled NFT"),
        description: String(existingByTx.description || ""),
        collection: String(existingByTx.collection || "User Created"),
        imageUrl: String(existingByTx.image_url || ""),
        attributes: normalizeAttributes(existingByTx.attributes),
        externalUrl: String(existingByTx.external_url || ""),
        txHash,
        metadataKey: String(existingByTx.metadata_key || metadataKey),
        listingPriceEth: parseNumber(existingByTx.listing_price_eth, 0),
        mintFeeEth: parseNumber(existingByTx.mint_fee_eth, 0),
        metadataUri: expectedMetadataUri,
        updatedBy: email || userWallet,
      });

      return NextResponse.json({
        success: true,
        status: "confirmed",
        txHash,
        mintKey: existingByTx.metadata_key,
        metadataKey: existingByTx.metadata_key,
        tokenId: existingByTx.token_id,
        royaltyPercent: extractRoyaltyFromAttributes(existingByTx.attributes),
        mintFeeEth: parseNumber(existingByTx.mint_fee_eth, 0),
        listingPriceEth: parseNumber(existingByTx.listing_price_eth, 0),
        metadataURI: expectedMetadataUri,
      });
    }

    const { data: existingByKey, error: existingByKeyError } = await supabase
      .from("user_listed")
      .select("*")
      .eq("profile_id", profileId)
      .eq("metadata_key", metadataKey)
      .maybeSingle();

    if (existingByKeyError) {
      return jsonError(
        `Failed to check existing mint row: ${existingByKeyError.message}`,
        500
      );
    }

    const name =
      normalizeText(form.get("name"), 100) ||
      normalizeText(metadataFromGateway?.name, 100);

    const description =
      normalizeText(form.get("description"), 1000) ||
      normalizeText(metadataFromGateway?.description, 1000);

    const collection =
      normalizeText(form.get("collection"), 100) || "User Created";

    const externalUrl =
      normalizeText(form.get("externalUrl"), 1000) ||
      normalizeText(metadataFromGateway?.external_url, 1000);

    const listingPriceEth = Math.max(0, parseNumber(form.get("listingPriceEth"), 0));
    const feeEthFromClient = Math.max(0, parseNumber(form.get("feeEth"), 0));

    if (!name) {
      return jsonError("Missing NFT name", 400);
    }

    let rawAttrs: unknown = [];
    const attrsRawText = String(form.get("attributes") ?? "").trim();

    if (attrsRawText) {
      try {
        rawAttrs = JSON.parse(attrsRawText);
      } catch {
        return jsonError("Invalid attributes JSON", 400);
      }
    } else if (metadataFromGateway?.attributes) {
      rawAttrs = metadataFromGateway.attributes;
    }

    const royaltyPercent = clampRoyalty(form.get("royaltyPercent") ?? 0);
    const attributes = upsertRoyaltyAttribute(
      normalizeAttributes(rawAttrs),
      royaltyPercent
    );

    const metadataImageUri =
      imageIpfsUriFromClient ||
      normalizeText(metadataFromGateway?.image, 2000);

    const imageUrl =
      imageGatewayUrlFromClient ||
      buildGatewayUrlFromUri(metadataImageUri, gatewayDomain) ||
      String(existingByKey?.image_url || "").trim();

    if (!imageUrl) {
      return jsonError("Missing NFT image URL", 400);
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

    const resolvedMetadataUri = decoded.metadataURI || expectedMetadataUri;

    const rowPayload = {
      profile_id: profileId,
      metadata_key: metadataKey,
      wallet_address: userWallet,
      chain_id: chainId,
      contract_address: contractAddr,
      token_id: String(decoded.tokenId),
      name,
      description,
      collection,
      image_url: imageUrl,
      external_url: externalUrl || "",
      attributes,
      token_type: "ERC721",
      chain: chainLabel(chainId),
      tx_hash: txHash,
      mint_fee_eth: mintFeeEth,
      listing_price_eth: listingPriceEth,
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      last_confirm_check_at: new Date().toISOString(),
      confirm_attempts: (existingByKey?.confirm_attempts || 0) + 1,
      last_confirm_error: null,
      receipt_json: toJsonSafe({
        ...receipt,
        app_metadata: {
          metadata_uri: resolvedMetadataUri,
          metadata_gateway_url: metadataGatewayUrlFromClient,
          image_ipfs_uri: metadataImageUri || "",
          image_gateway_url: imageUrl,
          gateway_domain: gatewayDomain,
        },
      }),
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
        .eq("metadata_key", metadataKey);

      if (updateError) {
        return jsonError(`Failed to update minted NFT: ${updateError.message}`, 500);
      }
    }

    await syncMintedNftToCatalog({
      supabase,
      chainId,
      contractAddr,
      tokenId: String(decoded.tokenId),
      name,
      description,
      collection,
      imageUrl,
      attributes,
      externalUrl,
      txHash,
      metadataKey,
      listingPriceEth,
      mintFeeEth,
      metadataUri: resolvedMetadataUri,
      updatedBy: email || userWallet,
    });

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
        profile_id: String(profileId),
        tx_hash: txHash,
        tx_type: "create_mint",
        chain_id: String(chainId),
        contract_address: contractAddr,
        token_id: decoded.tokenId,
        amount_eth: mintFeeEth,
        admin_wallet: "",
        status: "confirmed",
        metadata: toJsonSafe({
          type: "create_mint",
          metadata_key: metadataKey,
          nft_name: name,
          collection,
          on_chain_token_id: decoded.tokenId,
          on_chain_metadata_uri: resolvedMetadataUri,
          mint_fee_eth: mintFeeEth,
          listing_price_eth: listingPriceEth,
          royalty_percent: royaltyPercent,
          image_url: imageUrl,
          image_ipfs_uri: metadataImageUri || "",
          metadata_gateway_url: metadataGatewayUrlFromClient,
          image_storage_mode: "ipfs_gateway",
        }),
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
        mintPrice: String(listingPriceEth),
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
          metadata: toJsonSafe({
            metadataKey,
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
            on_chain_metadata_uri: resolvedMetadataUri,
            metadata_gateway_url: metadataGatewayUrlFromClient,
            image_ipfs_uri: metadataImageUri || "",
            image_url: imageUrl,
          }),
        });

      if (adminNotifError) {
        console.error(LOG, "admin notification insert failed", adminNotifError);
      }
    }

    return NextResponse.json({
      success: true,
      status: "confirmed",
      txHash,
      mintKey: metadataKey,
      metadataKey,
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
      imageUrl,
      metadataURI: resolvedMetadataUri,
      metadataGatewayUrl: metadataGatewayUrlFromClient,
      usedTransferFallback: decoded.usedFallback,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error(LOG, "error", error);
    return jsonError(message, 500);
  }
}