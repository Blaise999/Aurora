import PublicUserSearch from "@/components/profile/PublicUserSearch";
import { Users, Sparkles, Search, ShieldCheck, Gem } from "lucide-react";

export const metadata = {
  title: "Collectors | Aurora NFT",
  description: "Search collectors, creators, and public profiles on Aurora NFT.",
};

function FeaturePill({ icon, label }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 backdrop-blur-xl">
      <span className="text-cyan-300">{icon}</span>
      {label}
    </div>
  );
}

function StatCard({ icon, title, text }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 text-cyan-300">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/50">{text}</p>
    </div>
  );
}

export default function CollectorsPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] top-[80px] h-[280px] w-[280px] rounded-full bg-cyan-500/12 blur-[120px]" />
        <div className="absolute right-[8%] top-[140px] h-[320px] w-[320px] rounded-full bg-violet-500/12 blur-[140px]" />
        <div className="absolute bottom-[-60px] left-1/3 h-[260px] w-[260px] rounded-full bg-fuchsia-500/10 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        {/* Hero */}
        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] backdrop-blur-2xl">
          <div className="grid gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-10 lg:py-12">
            <div>
              <div className="mb-4 flex flex-wrap gap-2">
                <FeaturePill icon={<Users size={13} />} label="Collectors" />
                <FeaturePill icon={<Sparkles size={13} />} label="Creators" />
                <FeaturePill icon={<Gem size={13} />} label="Public Profiles" />
              </div>

              <div className="max-w-3xl">
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Discover the
                  <span className="bg-gradient-to-r from-cyan-300 via-white to-violet-300 bg-clip-text text-transparent">
                    {" "}Aurora Network
                  </span>
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
                  Search collectors, creators, and public on-chain identities across Aurora NFT.
                  Find profiles, explore minted works, and see what wallets are building.
                </p>
              </div>

              <div className="mt-8 max-w-3xl">
                <PublicUserSearch />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <StatCard
                icon={<Search size={18} />}
                title="Search-first"
                text="Nothing loads by default. Results only appear when you start typing."
              />
              <StatCard
                icon={<ShieldCheck size={18} />}
                title="Public-only"
                text="Only public-facing profiles should be discoverable here."
              />
              <StatCard
                icon={<Gem size={18} />}
                title="Web3-native"
                text="Profiles lead into minted NFTs, collected works, and wallet identity."
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}