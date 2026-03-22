import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/user/collections
 * Returns all NFTs in the logged-in user's collection.
 * Also supports ?profileId=X for admin usage.
 */

export async function GET(req: Request) {
  try {
    const { getSessionData } = await import("@/lib/auth/session");
    const { getSupabase } = await import("@/lib/db/supabase");
    const sb = getSupabase();

    const url = new URL(req.url);
    const adminProfileId = url.searchParams.get("profileId");

    let profileId: number | null = null;
    let resolvedWallet: string | null = null;

    if (adminProfileId) {
      const { cookies } = await import("next/headers");
      const { jwtVerify } = await import("jose");
      const cookieStore = await cookies();
      const adminToken = cookieStore.get("admin_session")?.value;

      if (adminToken) {
        try {
          const secret = new TextEncoder().encode(
            process.env.SESSION_SECRET ||
              process.env.ADMIN_SECRET ||
              "aurora-admin-fallback-secret-change-me"
          );
          const { payload } = await jwtVerify(adminToken, secret);

          if (payload.role === "admin") {
            profileId = Number(adminProfileId);
          }
        } catch (err) {
          console.error("admin session verify failed:", err);
        }
      }
    }

    if (!profileId) {
      const session = await getSessionData();

      if (!session) {
        return NextResponse.json(
          { error: "Unauthorized", nfts: [] },
          { status: 401 }
        );
      }

      resolvedWallet = session.wallet
        ? String(session.wallet).toLowerCase()
        : null;

      if (session.profileId) {
        profileId = Number(session.profileId);
      }

      if (!profileId && session.email) {
        const { data: profileByEmail, error: emailLookupError } = await sb
          .from("profiles")
          .select("id, wallet_address")
          .eq("email", session.email)
          .maybeSingle();

        if (emailLookupError) {
          console.error("profiles email lookup error:", emailLookupError);
        }

        if (profileByEmail?.id) {
          profileId = Number(profileByEmail.id);
          resolvedWallet =
            resolvedWallet ||
            (profileByEmail.wallet_address
              ? String(profileByEmail.wallet_address).toLowerCase()
              : null);
        }
      }

      if (!profileId && resolvedWallet) {
        const { data: profileByWallet, error: walletLookupError } = await sb
          .from("profiles")
          .select("id, wallet_address")
          .ilike("wallet_address", resolvedWallet)
          .maybeSingle();

        if (walletLookupError) {
          console.error("profiles wallet lookup error:", walletLookupError);
        }

        if (profileByWallet?.id) {
          profileId = Number(profileByWallet.id);
          resolvedWallet =
            resolvedWallet ||
            (profileByWallet.wallet_address
              ? String(profileByWallet.wallet_address).toLowerCase()
              : null);
        }
      }
    }

    if (!profileId) {
      return NextResponse.json(
        { error: "Profile not found", nfts: [] },
        { status: 404 }
      );
    }

    // ── 1. Fetch user_collections ──
    const { data, error } = await sb
      .from("user_collections")
      .select(`
        id,
        profile_id,
        cached_nft_id,
        chain_id,
        contract_address,
        token_id,
        assigned_at,
        assigned_by,
        nft_price_eth,
        mint_fee_eth,
        total_value_eth,
        pricing_source,
        attributes,
        collection,
        description,
        name,
        image_url,
        nft_name,
        token_type,
        chain
      `)
      .eq("profile_id", profileId)
      .order("assigned_at", { ascending: false });

    if (error) {
      console.error("user_collections query error:", error);
      return NextResponse.json(
        { error: error.message, nfts: [] },
        { status: 500 }
      );
    }

    // ── 2. Fetch pricing from nft_pricing for all cached_nft_ids ──
    // The user_collections table often has NULL prices (admin-assigned NFTs),
    // but the nft_pricing table holds the actual mint_price_eth & mint_fee_eth.
    const cachedIds = (data || [])
      .map((r: any) => r.cached_nft_id)
      .filter(Boolean);

    let pricingMap: Record<number, { mint_price_eth: number; mint_fee_eth: number }> = {};

    if (cachedIds.length > 0) {
      const { data: pricingRows, error: pricingErr } = await sb
        .from("nft_pricing")
        .select("cached_nft_id, mint_price_eth, mint_fee_eth")
        .in("cached_nft_id", cachedIds);

      if (pricingErr) {
        console.error("nft_pricing lookup error:", pricingErr);
      } else if (pricingRows) {
        for (const row of pricingRows) {
          pricingMap[row.cached_nft_id] = {
            mint_price_eth: parseFloat(row.mint_price_eth || 0),
            mint_fee_eth: parseFloat(row.mint_fee_eth || 0),
          };
        }
      }
    }

    // ── 3. Merge prices: user_collections prices → nft_pricing fallback ──
    const nfts = (data || []).map((item: any) => {
      const pricing = item.cached_nft_id ? pricingMap[item.cached_nft_id] : null;

      // Resolve price: prefer user_collections, fallback to nft_pricing
      const nftPrice = parseFloat(item.nft_price_eth || 0) > 0
        ? parseFloat(item.nft_price_eth)
        : pricing?.mint_price_eth || 0;

      const mintFee = parseFloat(item.mint_fee_eth || 0) > 0
        ? parseFloat(item.mint_fee_eth)
        : pricing?.mint_fee_eth || 0;

      const totalValue = parseFloat(item.total_value_eth || 0) > 0
        ? parseFloat(item.total_value_eth)
        : (nftPrice + mintFee) > 0
        ? nftPrice + mintFee
        : 0;

      return {
        id: item.id,
        profile_id: item.profile_id,
        cached_nft_id: item.cached_nft_id,
        chain_id: item.chain_id,
        contract_address: item.contract_address,
        token_id: item.token_id,
        assigned_at: item.assigned_at,
        assigned_by: item.assigned_by,
        nft_price_eth: nftPrice,
        mint_fee_eth: mintFee,
        total_value_eth: totalValue,
        pricing_source: item.pricing_source || (pricing ? "nft_pricing" : null),
        attributes: item.attributes || [],
        collection: item.collection || "Collection",
        description: item.description || "",
        name: item.name || item.nft_name || `#${item.token_id}`,
        image_url: item.image_url || "",
        nft_name: item.nft_name || item.name || `#${item.token_id}`,
        token_type: item.token_type || "ERC-721",
        chain:
          item.chain ||
          (item.chain_id === 8453
            ? "Base"
            : item.chain_id === 84532
            ? "Base Sepolia"
            : `Chain ${item.chain_id}`),

        // aliases for frontend compatibility
        contractAddress: item.contract_address,
        tokenId: item.token_id,
        chainId: item.chain_id,
        image: item.image_url || "",
        collection_name: item.collection || "",
      };
    });

    return NextResponse.json({
      nfts,
      count: nfts.length,
      profileId,
      wallet: resolvedWallet,
    });

  } catch (e: any) {
    console.error("user/collections error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed", nfts: [] },
      { status: 500 }
    );
  }
}