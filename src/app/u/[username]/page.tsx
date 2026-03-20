import Image from "next/image";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";

async function getProfile(username) {
  const { data, error } = await supabase
    .from("public_profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !data) return null;
  return data;
}

async function getMinted(profileId) {
  const { data, error } = await supabase
    .from("public_user_listed")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

async function getCollected(profileId) {
  const { data, error } = await supabase
    .from("public_user_collections")
    .select("*")
    .eq("profile_id", profileId)
    .order("assigned_at", { ascending: false });

  if (error) return [];
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

function formatDate(date) {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return "";
  }
}

function NftCard({ nft, type = "minted" }) {
  const title = nft.nft_name || nft.name || `Token #${nft.token_id}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
      <div className="relative aspect-square bg-zinc-900">
        {nft.image_url ? (
          <Image
            src={nft.image_url}
            alt={title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">
            No Image
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            {nft.collection ? (
              <p className="mt-1 text-sm text-zinc-400">{nft.collection}</p>
            ) : null}
          </div>

          <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-zinc-300">
            {type === "minted" ? "Minted" : "Collected"}
          </span>
        </div>

        {nft.description ? (
          <p className="mt-3 line-clamp-2 text-sm text-zinc-300">
            {nft.description}
          </p>
        ) : null}

        <div className="mt-4 space-y-1 text-xs text-zinc-400">
          {nft.chain ? <div>Chain: {nft.chain}</div> : null}
          {nft.token_type ? <div>Type: {nft.token_type}</div> : null}
          {nft.token_id ? <div>Token ID: {nft.token_id}</div> : null}
          {type === "minted" && nft.created_at ? (
            <div>Minted: {formatDate(nft.created_at)}</div>
          ) : null}
          {type === "collected" && nft.assigned_at ? (
            <div>Collected: {formatDate(nft.assigned_at)}</div>
          ) : null}
          {nft.tx_hash ? <div>Tx: {shortHash(nft.tx_hash)}</div> : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {nft.external_url ? (
            <a
              href={nft.external_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white hover:bg-white/5"
            >
              Open Link
            </a>
          ) : null}

          {nft.contract_address ? (
            <span className="rounded-xl border border-white/10 px-3 py-2 text-xs text-zinc-300">
              {shortWallet(nft.contract_address)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
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
    description: profile.bio || `View ${profile.username}'s public Aurora NFT profile.`,
  };
}

export default async function PublicProfilePage({ params }) {
  const profile = await getProfile(params.username);

  if (!profile) notFound();

  const [minted, collected] = await Promise.all([
    getMinted(profile.id),
    getCollected(profile.id),
  ]);

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border border-white/10 bg-zinc-900 md:h-28 md:w-28">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name || profile.username}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl font-bold text-zinc-500">
                  {(profile.display_name || profile.username || "U").charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold md:text-3xl">
                {profile.display_name || profile.username}
              </h1>
              <p className="mt-1 text-zinc-400">@{profile.username}</p>

              {profile.bio ? (
                <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300 md:text-base">
                  {profile.bio}
                </p>
              ) : (
                <p className="mt-4 text-sm text-zinc-500">
                  No bio added yet.
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-3 text-sm text-zinc-400">
                {profile.wallet_address ? (
                  <span className="rounded-full border border-white/10 px-3 py-1.5">
                    {shortWallet(profile.wallet_address)}
                  </span>
                ) : null}

                {profile.created_at ? (
                  <span className="rounded-full border border-white/10 px-3 py-1.5">
                    Joined {formatDate(profile.created_at)}
                  </span>
                ) : null}

                <span className="rounded-full border border-white/10 px-3 py-1.5">
                  {minted.length} Minted
                </span>

                <span className="rounded-full border border-white/10 px-3 py-1.5">
                  {collected.length} Collected
                </span>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-12">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Minted NFTs</h2>
            <span className="text-sm text-zinc-500">{minted.length} items</span>
          </div>

          {minted.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6 text-zinc-500">
              No minted NFTs yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {minted.map((nft) => (
                <NftCard key={`minted-${nft.id}`} nft={nft} type="minted" />
              ))}
            </div>
          )}
        </section>

        <section className="mt-14">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Collected NFTs</h2>
            <span className="text-sm text-zinc-500">{collected.length} items</span>
          </div>

          {collected.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-zinc-950 p-6 text-zinc-500">
              No collected NFTs yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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