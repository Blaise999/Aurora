import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ExternalLink,
  Wallet,
  Sparkles,
  Layers3,
  BadgeCheck,
  Grid3X3,
  Trophy,
  Copy,
} from "lucide-react";
import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getProfile(username) {
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("public_profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error || !data) {
    console.error("getProfile error:", error);
    return null;
  }

  return data;
}

async function getMinted(profileId) {
  if (!profileId) return [];

  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("public_user_listed")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getMinted error:", error);
    return [];
  }

  return data || [];
}

async function getCollected(profileId) {
  if (!profileId) return [];

  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("public_user_collections")
    .select("*")
    .eq("profile_id", profileId)
    .order("assigned_at", { ascending: false });

  if (error) {
    console.error("getCollected error:", error);
    return [];
  }

  return data || [];
}

function shortWallet(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function shortHash(hash) {
  if (!hash) return "";
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function getDisplayTitle(nft) {
  return nft.nft_name || nft.name || `Token #${nft.token_id || "—"}`;
}

function getCollectionName(nft) {
  return nft.collection || nft.collection_name || "Aurora Collection";
}

function getImageSrc(nft) {
  return nft.image_url || nft.image || nft.image_original_url || null;
}

function getChainLabel(nft) {
  if (nft.chain) return nft.chain;
  if (nft.chain_name) return nft.chain_name;

  const chainId = Number(nft.chain_id);
  if (chainId === 8453) return "Base";
  if (chainId === 84532) return "Base Sepolia";
  if (chainId === 1) return "Ethereum";
  if (chainId === 137) return "Polygon";

  return null;
}

function getExplorerLink(nft) {
  const address = nft.contract_address;
  const tokenId = nft.token_id;
  const chainId = Number(nft.chain_id);

  if (!address) return null;

  if (chainId === 8453) {
    return tokenId
      ? `https://basescan.org/token/${address}?a=${tokenId}`
      : `https://basescan.org/address/${address}`;
  }

  if (chainId === 84532) {
    return tokenId
      ? `https://sepolia.basescan.org/token/${address}?a=${tokenId}`
      : `https://sepolia.basescan.org/address/${address}`;
  }

  if (chainId === 1) {
    return tokenId
      ? `https://etherscan.io/token/${address}?a=${tokenId}`
      : `https://etherscan.io/address/${address}`;
  }

  if (chainId === 137) {
    return tokenId
      ? `https://polygonscan.com/token/${address}?a=${tokenId}`
      : `https://polygonscan.com/address/${address}`;
  }

  return null;
}

function StatPill({ icon: Icon, label, value }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-sm transition-all duration-300 hover:border-cyan-400/30 hover:bg-white/[0.05]">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-fuchsia-500/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-cyan-300">
          <Icon size={18} />
        </div>
        <div>
          <div className="text-lg font-semibold text-white">{value}</div>
          <div className="text-xs uppercase tracking-[0.18em] text-zinc-400">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950/80 p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(217,70,239,0.10),transparent_30%)]" />
      <div className="relative flex flex-col items-center justify-center py-10 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-cyan-300">
          <Grid3X3 size={24} />
        </div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">{text}</p>
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title, count, subtitle }) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="text-xs uppercase tracking-[0.28em] text-cyan-300/80">
          {eyebrow}
        </div>
        <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-2 text-sm text-zinc-400 md:text-base">{subtitle}</p>
        ) : null}
      </div>

      <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-300">
        <Sparkles size={14} className="text-cyan-300" />
        <span>{count} items</span>
      </div>
    </div>
  );
}

function NftMedia({ nft, title }) {
  const primarySrc = getImageSrc(nft);

  if (!primarySrc) {
    return (
      <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12),transparent_35%),radial-gradient(circle_at_center,rgba(217,70,239,0.10),transparent_60%)]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-400">
          No Preview
        </div>
      </div>
    );
  }

  const backupSrc =
    primarySrc !== nft.image && nft.image ? nft.image : nft.image_url || "";

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={primarySrc}
        alt={title}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        onError={(e) => {
          const img = e.currentTarget;
          if (backupSrc && img.src !== backupSrc) {
            img.src = backupSrc;
            return;
          }
          img.onerror = null;
          img.style.display = "none";
          const parent = img.parentElement;
          if (parent && !parent.querySelector("[data-fallback='true']")) {
            const fallback = document.createElement("div");
            fallback.setAttribute("data-fallback", "true");
            fallback.className =
              "absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12),transparent_35%),radial-gradient(circle_at_center,rgba(217,70,239,0.10),transparent_60%)]";
            fallback.innerHTML =
              '<div class="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-400">No Preview</div>';
            parent.appendChild(fallback);
          }
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
    </>
  );
}

function NftCard({ nft, type = "minted" }) {
  const title = getDisplayTitle(nft);
  const collectionName = getCollectionName(nft);
  const chainLabel = getChainLabel(nft);
  const explorerLink = getExplorerLink(nft);

  return (
    <article className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950/90 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-[0_0_0_1px_rgba(34,211,238,0.12),0_24px_60px_rgba(0,0,0,0.45)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(217,70,239,0.12),transparent_26%)] opacity-70" />

      <div className="relative">
        <div className="relative aspect-[1/1] overflow-hidden border-b border-white/10 bg-black">
          <NftMedia nft={nft} title={title} />

          <div className="absolute left-4 top-4 flex items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] backdrop-blur-sm ${
                type === "minted"
                  ? "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-200"
                  : "border-cyan-400/25 bg-cyan-400/10 text-cyan-200"
              }`}
            >
              {type === "minted" ? "Created ✦" : "Collected"}
            </span>

            {chainLabel ? (
              <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-zinc-300 backdrop-blur-sm">
                {chainLabel}
              </span>
            ) : null}
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-white">{title}</h3>
              <p className="mt-1 truncate text-sm text-zinc-400">{collectionName}</p>
            </div>

            {nft.token_id ? (
              <div className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-300">
                #{nft.token_id}
              </div>
            ) : null}
          </div>

          {nft.description ? (
            <p className="mt-4 line-clamp-3 text-sm leading-6 text-zinc-300">
              {nft.description}
            </p>
          ) : (
            <p className="mt-4 text-sm leading-6 text-zinc-500">
              No description added for this NFT yet.
            </p>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                Standard
              </div>
              <div className="mt-1 truncate text-sm font-medium text-white">
                {nft.token_type || "NFT"}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                Tx Hash
              </div>
              <div className="mt-1 truncate text-sm font-medium text-white">
                {nft.tx_hash ? shortHash(nft.tx_hash) : "Unavailable"}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {nft.external_url ? (
              <a
                href={nft.external_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
              >
                <ExternalLink size={15} />
                View Asset
              </a>
            ) : null}

            {explorerLink ? (
              <a
                href={explorerLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
              >
                <ExternalLink size={15} />
                Explorer
              </a>
            ) : null}

            {nft.contract_address ? (
              <span className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-zinc-300">
                <Wallet size={15} className="text-cyan-300" />
                {shortWallet(nft.contract_address)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export async function generateMetadata({ params }) {
  const profile = await getProfile(params.username);

  if (!profile) {
    return {
      title: "Profile Not Found | Aurora NFT",
    };
  }

  return {
    title: `${profile.display_name || profile.username} | Aurora NFT`,
    description:
      profile.bio || `View ${profile.username}'s public Aurora NFT profile.`,
  };
}

export default async function PublicProfilePage({ params }) {
  const profile = await getProfile(params.username);

  if (!profile) notFound();

  const [minted, collected] = await Promise.all([
    getMinted(profile.id),
    getCollected(profile.id),
  ]);

  const displayName = profile.display_name || profile.username;
  const totalShowcase = minted.length + collected.length;

  return (
    <main className="min-h-screen overflow-hidden bg-black text-white">
      <div className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_20%_30%,rgba(168,85,247,0.10),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(217,70,239,0.10),transparent_24%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent_20%,transparent_80%,rgba(255,255,255,0.02))]" />
      </div>

      <section className="relative mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-zinc-950/85 p-5 shadow-[0_10px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(217,70,239,0.14),transparent_28%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />

          <div className="relative">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[28px] border border-white/10 bg-zinc-900 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] md:h-32 md:w-32">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_40%),radial-gradient(circle_at_bottom,rgba(217,70,239,0.12),transparent_42%)]" />
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={displayName}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-3xl font-bold text-white">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/60 text-cyan-300 backdrop-blur-sm">
                    <BadgeCheck size={16} />
                  </div>
                </div>

                <div className="max-w-3xl">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-cyan-200">
                    <Sparkles size={13} />
                    Aurora Collector Profile
                  </div>

                  <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                    {displayName}
                  </h1>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                    <span>@{profile.username}</span>
                    {profile.wallet_address ? (
                      <>
                        <span className="text-zinc-600">•</span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-zinc-300">
                          <Wallet size={14} className="text-cyan-300" />
                          {shortWallet(profile.wallet_address)}
                        </span>
                      </>
                    ) : null}
                  </div>

                  {profile.bio ? (
                    <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-300 md:text-base">
                      {profile.bio}
                    </p>
                  ) : (
                    <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-500 md:text-base">
                      This collector has not added a bio yet.
                    </p>
                  )}

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href={`/explore?creator=${profile.username}`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm font-medium text-cyan-200 transition hover:border-cyan-400/40 hover:bg-cyan-400/15"
                    >
                      <Sparkles size={16} />
                      Explore NFTs
                    </Link>

                    {profile.wallet_address ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.07]"
                        onClick={() => {}}
                      >
                        <Copy size={16} />
                        Wallet Connected
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[420px]">
                <StatPill icon={Sparkles} label="Created" value={minted.length} />
                <StatPill icon={Layers3} label="Collected" value={collected.length} />
                <StatPill icon={Trophy} label="Showcase" value={totalShowcase} />
              </div>
            </div>
          </div>
        </div>

        <section className="mt-12">
          <SectionHeader
            eyebrow="Creator Vault"
            title="Created NFTs"
            count={minted.length}
            subtitle="Original works this creator brought to life on Aurora."
          />

          {minted.length === 0 ? (
            <EmptyState
              title="No created NFTs yet"
              text="Once this user starts minting, their drops will show up here in a much cleaner collector-style grid."
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {minted.map((nft) => (
                <NftCard key={`minted-${nft.id}`} nft={nft} type="minted" />
              ))}
            </div>
          )}
        </section>

        <section className="mt-16">
          <SectionHeader
            eyebrow="Collector Vault"
            title="Collected NFTs"
            count={collected.length}
            subtitle="Pieces this profile has acquired and added to their on-chain showcase."
          />

          {collected.length === 0 ? (
            <EmptyState
              title="No collected NFTs yet"
              text="Collected pieces will appear here once the wallet starts building out its gallery."
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {collected.map((nft) => (
                <NftCard key={`collected-${nft.id}`} nft={nft} type="collected" />
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}