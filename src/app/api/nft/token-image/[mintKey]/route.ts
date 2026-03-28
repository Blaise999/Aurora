import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

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

function parseDataImage(
  value: string
): { mime: string; bytes: Uint8Array } | null {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) return null;

  const mime = match[1];
  const base64 = match[2];

  try {
    const buffer = Buffer.from(base64, "base64");
    return {
      mime,
      bytes: new Uint8Array(buffer),
    };
  } catch {
    return null;
  }
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url: string, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "AuroraNFT-ImageProxy/1.0",
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ mintKey: string }> }
) {
  try {
    const supabase = getSupabaseAdmin();
    const { mintKey } = await context.params;
    const key = String(mintKey || "").trim();

    if (!key) {
      return new Response("Missing mintKey", { status: 400 });
    }

    const { data: row, error } = await supabase
      .from("user_listed")
      .select("image_url, updated_at")
      .eq("metadata_key", key)
      .maybeSingle();

    if (error) {
      return new Response(`Failed to load image row: ${error.message}`, {
        status: 500,
      });
    }

    if (!row?.image_url) {
      return new Response("Image not found", { status: 404 });
    }

    const raw = String(row.image_url).trim();

    // CASE 1: image stored as data URL in DB
    const parsed = parseDataImage(raw);
    if (parsed) {
      const body = Buffer.from(parsed.bytes);

return new Response(body, {
  status: 200,
  headers: {
    "Content-Type": parsed.mime,
    "Content-Length": String(body.byteLength),
    "Cache-Control": "public, max-age=31536000, immutable",
    "Access-Control-Allow-Origin": "*",
  },
});
    }

    // CASE 2: image stored as external URL in DB -> proxy it
    if (isHttpUrl(raw)) {
      const upstream = await fetchWithTimeout(raw);

      if (!upstream.ok) {
        return new Response(`Failed to fetch upstream image (${upstream.status})`, {
          status: 502,
        });
      }

      const contentType =
        upstream.headers.get("content-type") || "application/octet-stream";

      const bytes = await upstream.arrayBuffer();

      return new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(bytes.byteLength),
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response("Unsupported image format", { status: 415 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error("[/api/nft/token-image/[mintKey]] error:", error);
    return new Response(message, { status: 500 });
  }
}