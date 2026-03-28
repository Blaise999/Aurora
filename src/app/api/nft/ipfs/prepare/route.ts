import { NextResponse } from "next/server";

export const runtime = "nodejs";

const LOG = "[/api/nft/ipfs/prepare]";

type AttributeInput = {
  trait_type?: unknown;
  value?: unknown;
};

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

async function readJsonSafe(res: Response) {
  const raw = await res.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return { error: raw || "Invalid server response" };
  }
}

function normalizeText(value: unknown, maxLen = 0) {
  const text = String(value ?? "").trim();
  if (!maxLen || text.length <= maxLen) return text;
  return text.slice(0, maxLen).trim();
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

function normalizeGateway(input?: string | null) {
  const raw = String(input || "").trim();
  if (!raw) return "gateway.pinata.cloud";

  return raw
    .replace(/^https?:\/\//i, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function buildGatewayUrl(cid: string, gatewayDomain: string) {
  return `https://${gatewayDomain}/ipfs/${cid}`;
}

function buildSafeSlug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "aurora-nft"
  );
}

async function pinFileToIpfs(args: {
  file: File;
  jwt: string;
  name: string;
}) {
  const data = new FormData();
  data.append("file", args.file, args.file.name || "image");
  data.append(
    "pinataMetadata",
    JSON.stringify({
      name: args.name,
    })
  );
  data.append(
    "pinataOptions",
    JSON.stringify({
      cidVersion: 1,
    })
  );

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.jwt}`,
    },
    body: data,
    cache: "no-store",
  });

  const body = await readJsonSafe(res);

  if (!res.ok || !body?.IpfsHash) {
    throw new Error(body?.error || body?.message || "Image upload failed");
  }

  return {
    cid: String(body.IpfsHash),
    size: Number(body.PinSize || 0),
    isDuplicate: Boolean(body.isDuplicate),
  };
}

async function pinJsonToIpfs(args: {
  content: Record<string, unknown>;
  jwt: string;
  name: string;
}) {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataOptions: {
        cidVersion: 1,
      },
      pinataMetadata: {
        name: args.name,
      },
      pinataContent: args.content,
    }),
    cache: "no-store",
  });

  const body = await readJsonSafe(res);

  if (!res.ok || !body?.IpfsHash) {
    throw new Error(body?.error || body?.message || "Metadata upload failed");
  }

  return {
    cid: String(body.IpfsHash),
    size: Number(body.PinSize || 0),
    isDuplicate: Boolean(body.isDuplicate),
  };
}

export async function POST(req: Request) {
  try {
    const jwt = process.env.PINATA_JWT;
    if (!jwt) {
      return jsonError("Missing PINATA_JWT", 500);
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return jsonError("Invalid form submission", 400);
    }

    const name = normalizeText(form.get("name"), 100);
    const description = normalizeText(form.get("description"), 1000);
    const externalUrl = normalizeText(form.get("externalUrl"), 1000);

    let rawAttrs: unknown = [];
    const attrsRawText = String(form.get("attributes") ?? "").trim();
    if (attrsRawText) {
      try {
        rawAttrs = JSON.parse(attrsRawText);
      } catch {
        return jsonError("Invalid attributes JSON", 400);
      }
    }

    const attributes = normalizeAttributes(rawAttrs);

    if (!name) {
      return jsonError("Missing NFT name", 400);
    }

    const imageFile = form.get("imageFile");
    if (!(imageFile instanceof File) || imageFile.size <= 0) {
      return jsonError("Missing NFT image file", 400);
    }

    const allowed = new Set([
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ]);

    if (!allowed.has(imageFile.type)) {
      return jsonError("Please upload PNG, JPG, GIF, WEBP, or SVG", 400);
    }

    if (imageFile.size > 4 * 1024 * 1024) {
      return jsonError("Image file must be under 4MB", 400);
    }

    const gatewayDomain = normalizeGateway(
      process.env.PINATA_GATEWAY ||
        process.env.NEXT_PUBLIC_PINATA_GATEWAY ||
        "gateway.pinata.cloud"
    );

    const slug = buildSafeSlug(name);

    console.log(LOG, "uploading image to IPFS", {
      name,
      fileName: imageFile.name,
      fileType: imageFile.type,
      size: imageFile.size,
    });

    const imageUpload = await pinFileToIpfs({
      file: imageFile,
      jwt,
      name: `${slug}-image`,
    });

    const imageUri = `ipfs://${imageUpload.cid}`;
    const imageGatewayUrl = buildGatewayUrl(imageUpload.cid, gatewayDomain);

    const metadata = {
      name,
      description: description || "",
      image: imageUri,
      external_url: externalUrl || "",
      attributes,
    };

    console.log(LOG, "uploading metadata to IPFS", {
      imageCid: imageUpload.cid,
      name,
    });

    const metadataUpload = await pinJsonToIpfs({
      content: metadata,
      jwt,
      name: `${slug}-metadata.json`,
    });

    const metadataUri = `ipfs://${metadataUpload.cid}`;
    const metadataGatewayUrl = buildGatewayUrl(
      metadataUpload.cid,
      gatewayDomain
    );

    return NextResponse.json({
      success: true,
      metadataUri,
      metadataCid: metadataUpload.cid,
      metadataGatewayUrl,
      imageUri,
      imageCid: imageUpload.cid,
      imageGatewayUrl,
      gatewayDomain,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error(LOG, "error", error);
    return jsonError(message, 500);
  }
}