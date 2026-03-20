import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export const runtime = "nodejs";

type SupabaseLike = any;

async function verifyAdmin(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_session")?.value;
    if (!token) return null;

    const secret = new TextEncoder().encode(
      process.env.SESSION_SECRET ||
        process.env.ADMIN_SECRET ||
        "aurora-admin-fallback-secret-change-me"
    );

    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== "admin") return null;
    return (payload.username as string) || "admin";
  } catch {
    return null;
  }
}

async function getSettingsMintFee(sb: SupabaseLike): Promise<string> {
  const { data } = await sb
    .from("site_settings")
    .select("value")
    .eq("key", "minting_fee")
    .maybeSingle();

  return data?.value || "0.002";
}

async function getCachedNftById(sb: SupabaseLike, cachedNftId: string | number | null) {
  if (!cachedNftId) return null;
  const { data } = await sb.from("cached_nfts").select("*").eq("id", cachedNftId).single();
  return data || null;
}

function shuffleArray<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomInt(min: number, max: number) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

async function getPricingOverride(sb: SupabaseLike, cachedNftId: number | null) {
  if (!cachedNftId) return null;
  const { data } = await sb
    .from("nft_pricing")
    .select("mint_price_eth, mint_fee_eth")
    .eq("cached_nft_id", cachedNftId)
    .maybeSingle();

  return data || null;
}

async function buildAssignmentPayload(
  sb: SupabaseLike,
  adminUser: string,
  {
    profileId,
    cachedNft,
    chainId,
    contractAddress,
    tokenId,
  }: {
    profileId: number | string;
    cachedNft: any | null;
    chainId?: number;
    contractAddress?: string;
    tokenId?: string | number;
  }
) {
  const defaultMintFee = await getSettingsMintFee(sb);
  const pricingOverride = cachedNft?.id ? await getPricingOverride(sb, cachedNft.id) : null;

  const liveMintFee = parseFloat(pricingOverride?.mint_fee_eth ?? defaultMintFee ?? "0.002");
  const liveNftPrice = parseFloat(pricingOverride?.mint_price_eth ?? defaultMintFee ?? "0.002");

  const safeMintFee = Number.isFinite(liveMintFee) ? liveMintFee : 0.002;
  const safeNftPrice = Number.isFinite(liveNftPrice) ? liveNftPrice : 0.002;
  const safeTotalValue = Number((safeNftPrice + safeMintFee).toFixed(6));

  return {
    profile_id: profileId,
    cached_nft_id: cachedNft?.id ?? null,
    chain_id: cachedNft?.chain_id ?? chainId ?? 8453,
    contract_address: String(cachedNft?.contract_address ?? contractAddress ?? "").toLowerCase(),
    token_id: String(cachedNft?.token_id ?? tokenId ?? ""),
    assigned_by: `admin:${adminUser}`,
    assigned_at: new Date().toISOString(),
    image_url: cachedNft?.image_url ?? "",
    nft_name: cachedNft?.name ?? "Assigned NFT",
    name: cachedNft?.name ?? "Assigned NFT",
    description: cachedNft?.description ?? "",
    collection: cachedNft?.collection_name ?? cachedNft?.collection ?? null,
    token_type: cachedNft?.token_type ?? "ERC-721",
    attributes: cachedNft?.attributes ?? [],
    nft_price_eth: safeNftPrice,
    mint_fee_eth: safeMintFee,
    total_value_eth: safeTotalValue,
    pricing_source: "admin_assign",
  };
}

async function logTransaction(
  sb: SupabaseLike,
  {
    profileId,
    payload,
    adminUser,
    txType = "admin_assign",
  }: {
    profileId: number | string;
    payload: any;
    adminUser: string;
    txType?: string;
  }
) {
  try {
    await sb.from("transactions").insert({
      wallet_address: "admin",
      profile_id: profileId,
      tx_hash: `${txType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tx_type: txType,
      chain_id: payload.chain_id,
      contract_address: payload.contract_address,
      token_id: payload.token_id,
      amount_eth: 0,
      admin_wallet: "admin",
      status: "confirmed",
      metadata: {
        assigned_by: adminUser,
        nft_name: payload.nft_name,
      },
    });
  } catch {}
}

async function chunkedUpsertAssignments(sb: SupabaseLike, rows: any[]) {
  const chunkSize = 500;
  let affected = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    const { data, error } = await sb
      .from("user_collections")
      .upsert(chunk, { onConflict: "profile_id,chain_id,contract_address,token_id" })
      .select("id");

    if (error) throw error;
    affected += data?.length || 0;
  }

  return affected;
}

async function handleSingleAssign(req: Request, adminUser: string) {
  const body = await req.json();
  const { profileId, cachedNftId, chainId, contractAddress, tokenId } = body;

  if (!profileId || !contractAddress || tokenId === undefined || tokenId === null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { getSupabase } = await import("@/lib/db/supabase");
  const sb = getSupabase();

  const cachedNft = await getCachedNftById(sb, cachedNftId || null);

  const payload = await buildAssignmentPayload(sb, adminUser, {
    profileId,
    cachedNft,
    chainId,
    contractAddress,
    tokenId,
  });

  const { data, error } = await sb
    .from("user_collections")
    .upsert(payload, { onConflict: "profile_id,chain_id,contract_address,token_id" })
    .select()
    .single();

  if (error) throw error;

  await logTransaction(sb, { profileId, payload, adminUser });

  return NextResponse.json({ ok: true, assignment: data });
}

async function handleBulkRandomize(req: Request, adminUser: string) {
  const body = await req.json();

  const {
    seededOnly = true,
    profileIds = null,
    minNfts = 20,
    maxNfts = 20,
    nftPoolLimit = 600,
  } = body || {};

  const safeMin = Math.max(1, Number(minNfts) || 20);
  const safeMax = Math.max(safeMin, Number(maxNfts) || safeMin);
  const safePoolLimit = Math.max(50, Math.min(5000, Number(nftPoolLimit) || 600));

  const { getSupabase } = await import("@/lib/db/supabase");
  const sb = getSupabase();

  let profilesQuery = sb
    .from("profiles")
    .select("id, username, first_name, email, is_seeded")
    .eq("is_active", true);

  if (Array.isArray(profileIds) && profileIds.length > 0) {
    profilesQuery = profilesQuery.in("id", profileIds);
  } else if (seededOnly) {
    profilesQuery = profilesQuery.eq("is_seeded", true);
  }

  const { data: profiles, error: profilesError } = await profilesQuery;
  if (profilesError) throw profilesError;

  if (!profiles || profiles.length === 0) {
    return NextResponse.json(
      { error: "No matching profiles found for bulk randomize" },
      { status: 400 }
    );
  }

  const { data: cachedNfts, error: nftsError } = await sb
    .from("cached_nfts")
    .select("*")
    .limit(safePoolLimit);

  if (nftsError) throw nftsError;

  if (!cachedNfts || cachedNfts.length === 0) {
    return NextResponse.json({ error: "No cached NFTs available" }, { status: 400 });
  }

  const defaultMintFee = await getSettingsMintFee(sb);
  const pricingRows = cachedNfts.length
    ? await sb
        .from("nft_pricing")
        .select("cached_nft_id, mint_price_eth, mint_fee_eth")
        .in("cached_nft_id", cachedNfts.map((n: any) => n.id))
    : { data: [] };

  const pricingMap = new Map<number, any>();
  for (const row of pricingRows.data || []) {
    pricingMap.set(row.cached_nft_id, row);
  }

  const rows: any[] = [];
  const txLogs: Array<{ profileId: number | string; payload: any }> = [];
  const perProfileSummary: Array<{ profileId: number | string; assigned: number }> = [];

  for (const profile of profiles) {
    const countForProfile = randomInt(safeMin, safeMax);
    const shuffled = shuffleArray(cachedNfts).slice(0, Math.min(countForProfile, cachedNfts.length));

    let assignedForThisProfile = 0;

    for (const cachedNft of shuffled) {
      const pricingOverride = pricingMap.get(cachedNft.id) || null;

      const liveMintFee = parseFloat(pricingOverride?.mint_fee_eth ?? defaultMintFee ?? "0.002");
      const liveNftPrice = parseFloat(pricingOverride?.mint_price_eth ?? defaultMintFee ?? "0.002");

      const safeMintFee = Number.isFinite(liveMintFee) ? liveMintFee : 0.002;
      const safeNftPrice = Number.isFinite(liveNftPrice) ? liveNftPrice : 0.002;
      const safeTotalValue = Number((safeNftPrice + safeMintFee).toFixed(6));

      const payload = {
        profile_id: profile.id,
        cached_nft_id: cachedNft.id ?? null,
        chain_id: cachedNft.chain_id ?? 8453,
        contract_address: String(cachedNft.contract_address ?? "").toLowerCase(),
        token_id: String(cachedNft.token_id ?? ""),
        assigned_by: `admin:${adminUser}:bulk_randomize`,
        assigned_at: new Date().toISOString(),
        image_url: cachedNft.image_url ?? "",
        nft_name: cachedNft.name ?? "Assigned NFT",
        name: cachedNft.name ?? "Assigned NFT",
        description: cachedNft.description ?? "",
        collection: cachedNft.collection_name ?? cachedNft.collection ?? null,
        token_type: cachedNft.token_type ?? "ERC-721",
        attributes: cachedNft.attributes ?? [],
        nft_price_eth: safeNftPrice,
        mint_fee_eth: safeMintFee,
        total_value_eth: safeTotalValue,
        pricing_source: "admin_bulk_randomize",
      };

      rows.push(payload);
      txLogs.push({ profileId: profile.id, payload });
      assignedForThisProfile += 1;
    }

    perProfileSummary.push({
      profileId: profile.id,
      assigned: assignedForThisProfile,
    });
  }

  const affected = await chunkedUpsertAssignments(sb, rows);

  for (const item of txLogs.slice(0, 2000)) {
    await logTransaction(sb, {
      profileId: item.profileId,
      payload: item.payload,
      adminUser,
      txType: "admin_bulk_assign",
    });
  }

  return NextResponse.json({
    ok: true,
    mode: "bulk_randomize",
    profilesTargeted: profiles.length,
    preparedAssignments: rows.length,
    affectedRows: affected,
    minNfts: safeMin,
    maxNfts: safeMax,
    seededOnly: Boolean(seededOnly),
    summary: perProfileSummary,
  });
}

export async function POST(req: Request) {
  try {
    const adminUser = await verifyAdmin();
    if (!adminUser) {
      return NextResponse.json(
        { error: "Unauthorized — admin login required" },
        { status: 401 }
      );
    }

    const cloned = req.clone();
    const body = await cloned.json().catch(() => ({}));

    if (body?.mode === "bulk_randomize") {
      return handleBulkRandomize(req, adminUser);
    }

    return handleSingleAssign(req, adminUser);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const adminUser = await verifyAdmin();
    if (!adminUser) {
      return NextResponse.json(
        { error: "Unauthorized — admin login required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { profileId, chainId, contractAddress, tokenId } = body;

    if (!profileId || !contractAddress || tokenId === undefined || tokenId === null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { getSupabase } = await import("@/lib/db/supabase");
    const sb = getSupabase();

    const { error } = await sb
      .from("user_collections")
      .delete()
      .eq("profile_id", profileId)
      .eq("chain_id", chainId || 8453)
      .eq("contract_address", String(contractAddress).toLowerCase())
      .eq("token_id", String(tokenId));

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}