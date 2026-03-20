import PublicUserSearch from "@/components/profile/PublicUserSearch";

export const metadata = {
  title: "People | Aurora NFT",
  description: "Search Aurora NFT users and view public profiles.",
};

export default function PeoplePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold md:text-4xl">People</h1>
          <p className="mt-2 text-sm text-zinc-400 md:text-base">
            Search collectors and creators on Aurora NFT.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-950 p-4 md:p-6">
          <PublicUserSearch />
        </div>
      </section>
    </main>
  );
}