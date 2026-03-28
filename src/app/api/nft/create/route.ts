import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSessionData } from "@/lib/auth/session";

export const runtime = "nodejs";

const LOG = "[/api/nft/create]";
const CREATOR_CONTRACT = (
  process.env.NEXT_PUBLIC_CREATOR_CONTRACT || ""
).toLowerCase();

type AttributeInput = {
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

function normalizeAddress(value: unknown): `0x${string}` | null {
  const addr = String(value || "").trim().toLowerCase();
  return addr ? (addr as `0x${string}`) : null;
}

function isLikelyDataUrl(value: string) {
  return value.startsWith("data:image/");
}

function normalizeAttributes(raw: unknown): Array<{ trait_type: string; value: string }> {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const attr = item as AttributeInput;
      return {
        trait_type: String(attr?.trait_type || "").trim(),
        value: String(attr?.value || "").trim(),
      };
    })
    .filter((item) => item.trait_type && item.value);
}

function enforceMinRoyalty30(
  attrs: Array<{ trait_type: string; value: string }>,
  royaltyInput: unknown
) {
  let royalty = parseNumber(royaltyInput, 0);

  const existingRoyalty = attrs.find(
    (a) => a.trait_type.trim().toLowerCase() === "creator royalty"
  );

  if (existingRoyalty) {
    royalty = Math.max(royalty, parseNumber(existingRoyalty.value, 0));
  }

  royalty = Math.max(30, royalty);
  royalty = Math.min(30, royalty);

  const filtered = attrs.filter(
    (a) => a.trait_type.trim().toLowerCase() !== "creator royalty"
  );

  return {
    royaltyPercent: royalty,
    attributes: [
      ...filtered,
      {
        trait_type: "Creator Royalty",
        value: `${royalty}%`,
      },
    ],
  };
}

function chainLabel(chainId: number) {
  if (chainId === 8453) return "Base";
  if (chainId === 84532) return "Base Sepolia";
  return `Chain ${chainId}`;
}

function buildMintKey() {
  return `mint_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const session = await getSessionData();

    if (!session?.email || !session?.profileId) {
      return jsonError("You must be logged in to create an NFT", 401);
    }

    const profileId = String(session.profileId);
    const email = session.email;

    let userWallet = session.wallet ? String(session.wallet).toLowerCase() : null;

    if (!userWallet) {
      const { data: prof, error: profError } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("email", email)
        .maybeSingle();

      if (profError) {
        console.error(LOG, "profile wallet lookup failed", profError);
        return jsonError(`Failed to resolve wallet: ${profError.message}`, 500);
      }

      userWallet = prof?.wallet_address
        ? String(prof.wallet_address).toLowerCase()
        : null;
    }

    if (!userWallet) {
      return jsonError("No wallet found for session", 401);
    }

    let form: FormData;

    try {
      form = await req.formData();
    } catch (err) {
      console.error(LOG, "failed to parse form data", err);
      return jsonError("Invalid form submission", 400);
    }

    const name = String(form.get("name") || "").trim();
    const description = String(form.get("description") || "").trim();
    const collection = String(form.get("collection") || "User Created").trim();
    const externalUrl = String(form.get("externalUrl") || "").trim();
    const listingPriceEth = parseNumber(form.get("listingPriceEth"), 0);
    const feeEth = parseNumber(form.get("feeEth"), 0);
    const feeUsd = parseNumber(form.get("feeUsd"), 0);
    const ethPriceAtMint = parseNumber(form.get("ethPriceAtMint"), 0);
    const royaltyPercentInput = form.get("royaltyPercent");
    const chainId = parseChainId(
      form.get("chainId"),
      parseChainId(process.env.NEXT_PUBLIC_CHAIN_ID || "8453", 8453)
    );
    const walletAddressFromClient = normalizeAddress(form.get("walletAddress"));
    const contractAddr = normalizeAddress(
      form.get("creatorContract") || CREATOR_CONTRACT
    );
    const mintKey = String(form.get("mintKey") || "").trim() || buildMintKey();

    console.log(LOG, "incoming form payload", {
      name,
      collection,
      chainId,
      mintKey,
      contractAddr,
      walletAddressFromClient,
    });

    if (!name) return jsonError("Missing NFT name", 400);
    if (!contractAddr) return jsonError("Missing creator contract address", 400);

    if (CREATOR_CONTRACT && contractAddr !== CREATOR_CONTRACT) {
      return jsonError("Creator contract does not match the configured contract", 400, {
        provided: contractAddr,
        expected: CREATOR_CONTRACT,
      });
    }

    if (chainId !== 8453 && chainId !== 84532) {
      return jsonError(`Unsupported chainId ${chainId}`, 400);
    }

    if (walletAddressFromClient && walletAddressFromClient !== userWallet) {
      return jsonError("Wallet mismatch — form wallet does not match your session", 400, {
        formWallet: walletAddressFromClient,
        sessionWallet: userWallet,
      });
    }

    let rawAttrs: unknown = [];
    const attrsRawText = String(form.get("attributes") || "").trim();

    if (attrsRawText) {
      try {
        rawAttrs = JSON.parse(attrsRawText);
      } catch (err) {
        console.error(LOG, "invalid attributes json", {
          attrsRawText,
          error: err instanceof Error ? err.message : String(err),
        });
        return jsonError("Invalid attributes JSON", 400);
      }
    }

    const normalizedAttrs = normalizeAttributes(rawAttrs);
    const royaltyData = enforceMinRoyalty30(normalizedAttrs, royaltyPercentInput);

    const imageFile = form.get("imageFile");
    let imageUrl = "";

    if (imageFile instanceof File && imageFile.size > 0) {
      console.log(LOG, "received image file", {
        name: imageFile.name,
        type: imageFile.type,
        size: imageFile.size,
      });

      if (imageFile.size > 4 * 1024 * 1024) {
        return jsonError("Image file must be under 4MB", 400);
      }

      imageUrl = await fileToDataUrl(imageFile);
    } else {
      imageUrl = String(form.get("imageBase64") || form.get("imageUrl") || "").trim();
    }

    if (!imageUrl) {
      return jsonError("Missing NFT image", 400);
    }

    const { data: existingRow, error: existingError } = await supabase
      .from("user_listed")
      .select("*")
      .eq("profile_id", profileId)
      .eq("metadata_key", mintKey)
      .maybeSingle();

    if (existingError) {
      console.error(LOG, "existing row lookup failed", existingError);
      return jsonError(`Failed to check existing mint row: ${existingError.message}`, 500);
    }

    const baseUrl = getBaseUrl(req);
    const metadataUri = `${baseUrl}/api/nft/token-metadata/${mintKey}`;

    const rowPayload = {
      profile_id: profileId,
      metadata_key: mintKey,
      wallet_address: userWallet,
      chain_id: String(chainId),
      contract_address: contractAddr,
      token_id: null,
      name,
      description,
      collection,
      image_url: imageUrl,
      external_url: externalUrl,
      attributes: royaltyData.attributes,
      token_type: "ERC721",
      chain: chainLabel(chainId),
      tx_hash: null,
      mint_fee_eth: feeEth,
      listing_price_eth: listingPriceEth,
      mint_fee_usd: feeUsd,
      eth_price_at_mint: ethPriceAtMint,
      status: existingRow?.status || "pending_metadata",
      created_at: existingRow?.created_at || new Date().toISOString(),
    };

    if (!existingRow) {
      const { error: insertError } = await supabase
        .from("user_listed")
        .insert(rowPayload);

      if (insertError) {
        console.error(LOG, "pending metadata insert failed", insertError);
        return jsonError(`Failed to save pending mint: ${insertError.message}`, 500);
      }
    } else {
      const { error: updateError } = await supabase
        .from("user_listed")
        .update(rowPayload)
        .eq("profile_id", profileId)
        .eq("metadata_key", mintKey);

      if (updateError) {
        console.error(LOG, "pending metadata update failed", updateError);
        return jsonError(`Failed to update pending mint: ${updateError.message}`, 500);
      }
    }

    console.log(LOG, "pending metadata saved successfully", {
      mintKey,
      metadataUri,
      chainId,
      contractAddr,
      royaltyPercent: royaltyData.royaltyPercent,
      imageStorageMode: isLikelyDataUrl(imageUrl) ? "db_data_url" : "external_url",
    });

    return NextResponse.json({
      success: true,
      status: "pending_metadata",
      mintKey,
      metadataUri,
      profileId,
      walletAddress: userWallet,
      contractAddress: contractAddr,
      chainId,
      chain: chainLabel(chainId),
      name,
      collection,
      royaltyPercent: royaltyData.royaltyPercent,
      mintFeeUsd: feeUsd,
      mintFeeEth: feeEth,
      ethPriceAtMint,
      listingPriceEth,
      hasImage: Boolean(imageUrl),
      imageStorageMode: isLikelyDataUrl(imageUrl) ? "db_data_url" : "external_url",
      message: "Metadata saved. Proceed to wallet mint transaction.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error(LOG, "error", error);
    return jsonError(message, 500);
  }
}