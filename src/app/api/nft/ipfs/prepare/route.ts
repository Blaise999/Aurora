import { NextResponse } from "next/server";
import { pinata } from "@/utils/pinata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG = "[/api/nft/ipfs/prepare]";
const MAX_FILE_SIZE = 4 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

function getErrorMessage(error, fallback = "Internal Server Error") {
  if (!error) return fallback;

  if (typeof error === "string") return error || fallback;

  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === "object") {
    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }

    if (typeof error.error === "string" && error.error.trim()) {
      return error.error;
    }

    if (
      error.error &&
      typeof error.error === "object" &&
      typeof error.error.message === "string" &&
      error.error.message.trim()
    ) {
      return error.error.message;
    }

    try {
      return JSON.stringify(error, null, 2);
    } catch {
      return fallback;
    }
  }

  return String(error);
}

function jsonError(message, status = 400, extra = {}) {
  return NextResponse.json(
    {
      success: false,
      error: String(message || "Request failed"),
      ...extra,
    },
    { status }
  );
}

function normalizeText(value, maxLen = 0) {
  const text = String(value ?? "").trim();
  if (!maxLen || text.length <= maxLen) return text;
  return text.slice(0, maxLen).trim();
}

function safeJsonParse(value, fallback) {
  if (typeof value !== "string" || !value.trim()) return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function sanitizeExternalUrl(value) {
  const raw = normalizeText(value, 1000);
  if (!raw) return "";

  try {
    const url = new URL(raw);
    return url.toString();
  } catch {
    return "";
  }
}

function buildAttributes(value) {
  const parsed = safeJsonParse(value, []);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => ({
      trait_type: normalizeText(item?.trait_type, 100),
      value: normalizeText(item?.value, 200),
    }))
    .filter((item) => item.trait_type && item.value);
}

function getExtension(file) {
  const byType = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
  };

  if (byType[file.type]) return byType[file.type];

  const fromName = String(file?.name || "").split(".").pop();
  return fromName ? fromName.toLowerCase() : "bin";
}

function fileNameBase(value) {
  const clean = normalizeText(value, 100)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return clean || "nft";
}

export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return jsonError("Expected multipart/form-data", 400);
    }

    const form = await request.formData();

    const imageFile = form.get("imageFile");
    if (!(imageFile instanceof File)) {
      return jsonError("Missing image file.", 400);
    }

    if (!ALLOWED_TYPES.has(imageFile.type)) {
      return jsonError("Please upload PNG, JPG, GIF, WEBP, or SVG.", 400);
    }

    if (imageFile.size > MAX_FILE_SIZE) {
      return jsonError("File must be under 4MB.", 400);
    }

    const name = normalizeText(form.get("name"), 100);
    const description = normalizeText(form.get("description"), 1000);
    const collection = normalizeText(form.get("collection"), 100) || "User Created";
    const externalUrl = sanitizeExternalUrl(form.get("externalUrl"));
    const attributes = buildAttributes(form.get("attributes"));

    if (!name) {
      return jsonError("NFT name is required.", 400);
    }

    const baseName = fileNameBase(name);
    const imageExt = getExtension(imageFile);

    const imageUpload = await pinata.upload.public
      .file(imageFile)
      .name(`${baseName}.${imageExt}`)
      .keyvalues({
        app: "aurora-nft",
        type: "nft-image",
        nftName: name.slice(0, 100),
      });

    if (!imageUpload?.cid) {
      throw new Error("Pinata did not return an image CID.");
    }

    const imageCid = String(imageUpload.cid);
    const imageUri = `ipfs://${imageCid}`;
    const imageGatewayUrl = await pinata.gateways.public.convert(imageUri);

    const metadata = {
      name,
      description,
      image: imageUri,
      external_url: externalUrl || undefined,
      attributes,
      collection,
    };

    const metadataUpload = await pinata.upload.public
      .json(metadata)
      .name(`${baseName}-metadata.json`)
      .keyvalues({
        app: "aurora-nft",
        type: "nft-metadata",
        nftName: name.slice(0, 100),
      });

    if (!metadataUpload?.cid) {
      throw new Error("Pinata did not return a metadata CID.");
    }

    const metadataCid = String(metadataUpload.cid);
    const metadataUri = `ipfs://${metadataCid}`;
    const metadataGatewayUrl = await pinata.gateways.public.convert(metadataUri);

    return NextResponse.json(
      {
        success: true,
        imageCid,
        metadataCid,
        imageUri,
        metadataUri,
        imageGatewayUrl,
        metadataGatewayUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = getErrorMessage(error, "Failed to prepare NFT metadata.");
    console.error(LOG, error);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}