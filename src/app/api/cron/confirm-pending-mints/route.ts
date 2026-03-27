import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const LOG = "[/api/cron/confirm-pending-mints]";

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

function getInternalSecret() {
  return process.env.NFT_CONFIRM_SECRET || process.env.CRON_SECRET || "";
}

function isAuthorized(req: Request) {
  const secret = getInternalSecret();
  if (!secret) return false;

  const incoming =
    req.headers.get("x-internal-secret") ||
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    new URL(req.url).searchParams.get("secret") ||
    "";

  return Boolean(incoming && incoming === secret);
}

function getBaseUrl(req: Request) {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    "";

  if (envUrl) {
    return envUrl.startsWith("http") ? envUrl : `https://${envUrl}`;
  }

  return new URL(req.url).origin;
}

export async function GET(req: Request) {
  try {
    if (!isAuthorized(req)) {
      console.warn(LOG, "unauthorized cron hit");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const baseUrl = getBaseUrl(req);
    const internalSecret = getInternalSecret();

    const limitParam = Number.parseInt(
      new URL(req.url).searchParams.get("limit") || "25",
      10
    );
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 100)
      : 25;

    console.log(LOG, "starting cron sweep", { baseUrl, limit });

    const { data: rows, error } = await supabase
      .from("user_listed")
      .select("metadata_key, tx_hash, contract_address, chain_id, status, created_at, name")
      .in("status", ["pending", "mint_submitted"])
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error(LOG, "failed to fetch pending rows", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const summary = {
      scanned: rows?.length || 0,
      skippedNoTxHash: 0,
      confirmed: 0,
      stillPending: 0,
      failed: 0,
      errors: 0,
      details: [] as Array<Record<string, unknown>>,
    };

    for (const row of rows || []) {
      const mintKey = String(row.metadata_key || "");
      const txHash = row.tx_hash ? String(row.tx_hash) : "";
      const chainId = row.chain_id ? Number(row.chain_id) : 8453;
      const creatorContract = row.contract_address ? String(row.contract_address) : "";

      console.log(LOG, "processing row", {
        mintKey,
        txHash,
        chainId,
        creatorContract,
        status: row.status,
        name: row.name,
      });

      if (!txHash) {
        summary.skippedNoTxHash += 1;
        summary.details.push({
          mintKey,
          status: row.status,
          result: "skipped_no_tx_hash",
        });
        continue;
      }

      try {
        const res = await fetch(`${baseUrl}/api/nft/create/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": internalSecret,
          },
          body: JSON.stringify({
            mintKey,
            txHash,
            creatorContract,
            chainId,
          }),
        });

        const raw = await res.text();
        let data: any = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          data = { raw };
        }

        console.log(LOG, "confirm call result", {
          mintKey,
          txHash,
          ok: res.ok,
          status: res.status,
          data,
        });

        if (res.ok && data?.success) {
          summary.confirmed += 1;
          summary.details.push({
            mintKey,
            txHash,
            result: "confirmed",
            tokenId: data?.tokenId || null,
          });
          continue;
        }

        if (data?.pending) {
          summary.stillPending += 1;
          summary.details.push({
            mintKey,
            txHash,
            result: "still_pending",
          });
          continue;
        }

        if (res.status === 400 && /failed on-chain/i.test(String(data?.error || ""))) {
          summary.failed += 1;
          summary.details.push({
            mintKey,
            txHash,
            result: "failed_on_chain",
            error: data?.error || null,
          });
          continue;
        }

        summary.errors += 1;
        summary.details.push({
          mintKey,
          txHash,
          result: "confirm_error",
          error: data?.error || raw || "Unknown confirm error",
        });
      } catch (err: any) {
        console.error(LOG, "exception while confirming row", {
          mintKey,
          txHash,
          error: err?.message || String(err),
        });

        summary.errors += 1;
        summary.details.push({
          mintKey,
          txHash,
          result: "exception",
          error: err?.message || String(err),
        });
      }
    }

    console.log(LOG, "cron sweep complete", summary);
    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (error: any) {
    console.error(LOG, "fatal cron error", error);
    return NextResponse.json(
      { error: error?.message || "Unexpected cron error" },
      { status: 500 }
    );
  }
}