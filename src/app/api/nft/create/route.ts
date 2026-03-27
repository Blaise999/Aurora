import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Address } from "viem";
import { getSessionData } from "@/lib/auth/session";

export const runtime = "nodejs";

const CREATOR_CONTRACT = (
  process.env.NEXT_PUBLIC_CREATOR_CONTRACT || ""
).toLowerCase();

const MAX_DB_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_DATA_URL_CHARS = 8_000_000;

type AttributeInput = {
  trait_type?: unknown;
  value?: unknown;
};

type ParsedCreateInput = {
  name?: string;
  description?: string;
  collection?: string;
  externalUrl?: string;
  attributes?: AttributeInput[];
  feeEth?: string | number;
  totalPriceEth?: string | number;
  adminCutEth?: string | number;
  listingPriceEth?: string | number;
  creatorContract?: string;
  chainId?: string | number;
  royaltyPercent?: string | number;
  imageUrl?: string;
  imageBase64?: string;
  imageFile?: File | null;
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

function isLikelyDataUrl(value: string) {
  return value.startsWith("data:image/");
}

function normalizeAddress(value: unknown): Address | null {
  const addr = String(value || "").trim().toLowerCase();
  return addr ? (addr as Address) : null;
}

function chainLabel(chainId: number) {
  if (chainId === 8453) return "Base";
  if (chainId === 84532) return "Base Sepolia";
  return `Chain ${chainId}`;
}

async function fileToDataUrl(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mime = file.type || "application/octet-stream";
  return `data:${mime};base64,${base64}`;
}

async function parseRequest(req: Request): Promise<ParsedCreateInput> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();

    const getString = (key: string) => {
      const value = form.get(key);
      return typeof value === "string" ? value : "";
    };

    const rawAttrs = getString("attributes");
    let parsedAttrs: AttributeInput[] = [];

    if (rawAttrs) {
      try {
        const json = JSON.parse(rawAttrs);
        if (Array.isArray(json)) parsedAttrs = json;
      } catch {
        parsedAttrs = [];
      }
    }

    const maybeFile = form.get("imageFile");
    const imageFile = maybeFile instanceof File && maybeFile.size > 0 ? maybeFile : null;

    return {
      name: getString("name"),
      description: getString("description"),
      collection: getString("collection"),
      externalUrl: getString("externalUrl"),
      attributes: parsedAttrs,
      feeEth: getString("feeEth"),
      totalPriceEth: getString("totalPriceEth"),
      adminCutEth: getString("adminCutEth"),
      listingPriceEth: getString("listingPriceEth"),
      creatorContract: getString("creatorContract"),
      chainId: getString("chainId"),
      royaltyPercent: getString("royaltyPercent"),
      imageUrl: getString("imageUrl"),
      imageBase64: getString("imageBase64"),
      imageFile,
    };
  }

  const body = (await req.json()) as ParsedCreateInput;
  return {
    ...body,
    imageFile: null,
  };
}

function sanitizeAttributes(input: AttributeInput[] | undefined, royaltyPercent: number) {
  const clean = Array.isArray(input)
    ? input
        .filter((a) => {
          const trait = String(a?.trait_type || "").trim();
          const value = String(a?.value || "").trim();
          return Boolean(trait && value);
        })
        .map((a) => ({
          trait_type: String(a?.trait_type || "").trim(),
          value: String(a?.value || "").trim(),
        }))
    : [];

  const withoutRoyalty = clean.filter(
    (a) => a.trait_type.toLowerCase() !== "creator royalty"
  );

  if (royaltyPercent > 0) {
    withoutRoyalty.push({
      trait_type: "Creator Royalty",
      value: `${royaltyPercent}%`,
    });
  }

  return withoutRoyalty;
}

async function resolveSessionWallet(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  email: string,
  sessionWallet?: string | null
) {
  let wallet = sessionWallet ? String(sessionWallet).toLowerCase() : null;
  if (wallet) return wallet;

  const { data: prof, error } = await supabase
    .from("profiles")
    .select("wallet_address")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve wallet: ${error.message}`);
  }

  wallet = prof?.wallet_address ? String(prof.wallet_address).toLowerCase() : null;
  return wallet;
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const session = await getSessionData();

    if (!session?.email || !session?.profileId) {
      return NextResponse.json(
        { error: "You must be logged in to create an NFT" },
        { status: 401 }
      );
    }

    const profileId = session.profileId;
    const email = session.email;
    const walletAddress = await resolveSessionWallet(supabase, email, session.wallet);

    if (!walletAddress) {
      return NextResponse.json(
        { error: "No wallet found for session" },
        { status: 401 }
      );
    }

    const body = await parseRequest(req);

    const {
      name,
      description,
      collection,
      externalUrl,
      attributes,
      feeEth,
      listingPriceEth,
      creatorContract,
      chainId,
      royaltyPercent,
      imageUrl,
      imageBase64,
      imageFile,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Missing NFT name" }, { status: 400 });
    }

    const resolvedChainId = parseChainId(
      chainId,
      parseChainId(process.env.NEXT_PUBLIC_CHAIN_ID || "8453", 8453)
    );

    if (resolvedChainId !== 8453 && resolvedChainId !== 84532) {
      return NextResponse.json(
        { error: `Unsupported chainId ${resolvedChainId}` },
        { status: 400 }
      );
    }

    const contractAddr = normalizeAddress(creatorContract || CREATOR_CONTRACT);
    if (!contractAddr) {
      return NextResponse.json(
        { error: "Missing creator contract address" },
        { status: 400 }
      );
    }

    let resolvedImageUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";

    if (imageFile) {
      if (imageFile.size > MAX_DB_IMAGE_BYTES) {
        return NextResponse.json(
          { error: "Image too large for DB storage. Keep it under 4MB." },
          { status: 400 }
        );
      }

      resolvedImageUrl = await fileToDataUrl(imageFile);
    } else if (!resolvedImageUrl && typeof imageBase64 === "string" && imageBase64.trim()) {
      const raw = imageBase64.trim();
      if (isLikelyDataUrl(raw)) {
        resolvedImageUrl = raw;
      }
    }

    if (!resolvedImageUrl) {
      return NextResponse.json({ error: "Missing NFT image" }, { status: 400 });
    }

    if (!isLikelyDataUrl(resolvedImageUrl) && !resolvedImageUrl.startsWith("http")) {
      return NextResponse.json(
        { error: "Image must be a data URL or valid http(s) URL" },
        { status: 400 }
      );
    }

    if (resolvedImageUrl.length > MAX_DATA_URL_CHARS) {
      return NextResponse.json(
        { error: "Encoded image is too large for DB storage." },
        { status: 400 }
      );
    }

    const parsedFeeEth = parseNumber(feeEth, 0);
    const parsedListingPriceEth = parseNumber(listingPriceEth, 0);
    const parsedRoyaltyPercent = clampRoyalty(royaltyPercent);
    const cleanAttributes = sanitizeAttributes(attributes, parsedRoyaltyPercent);

    const mintKey = `mint:${crypto.randomUUID()}`;
    const temporaryTokenId = `pending:${crypto.randomUUID()}`;
    const origin = new URL(req.url).origin;
    const metadataUri = `${origin}/api/nft/token-metadata?key=${encodeURIComponent(mintKey)}`;

    const insertRow = {
      profile_id: profileId,
      wallet_address: walletAddress,
      metadata_key: mintKey,
      chain_id: resolvedChainId,
      contract_address: contractAddr,
      token_id: temporaryTokenId,
      name: name.trim(),
      description: (description || "").trim(),
      collection: (collection || "User Created").trim(),
      image_url: resolvedImageUrl,
      external_url: (externalUrl || "").trim(),
      attributes: cleanAttributes,
      token_type: "ERC721",
      chain: chainLabel(resolvedChainId),
      tx_hash: null,
      mint_fee_eth: parsedFeeEth,
      listing_price_eth: parsedListingPriceEth,
      mint_fee_usd: 0,
      eth_price_at_mint: 0,
      status: "pending",
      created_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from("user_listed")
      .insert(insertRow);

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to save pending NFT: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: "pending",
      mintKey,
      metadataUri,
      contractAddress: contractAddr,
      chainId: resolvedChainId,
      royaltyPercent: parsedRoyaltyPercent,
      listingPriceEth: parsedListingPriceEth,
      mintFeeEth: parsedFeeEth,
      hasImage: Boolean(resolvedImageUrl),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("[/api/nft/create] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}