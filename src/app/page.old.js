'use client';
import PageShell from '@/components/layout/PageShell';
import MintPanel from '@/components/mint/MintPanel';
import Badge from '@/components/ui/Badge';
import { heroNFTs } from '@/lib/mock/nfts';

export default function MintPage() {
  return (
    <PageShell>
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-bold text-text">Mint</h1>
          <p className="text-sm text-muted mt-2">Mint from the AuroraNft collection on Base</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Left: Collection Preview */}
          <div className="lg:col-span-3 space-y-6">
            <div className="glass-card rounded-card overflow-hidden">
              <div className="aspect-[16/9] w-full relative overflow-hidden">
                <img
                  src="/pictures/mint-hero.svg"
                  alt="AuroraNft Collection"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <Badge color="success" dot className="mb-3">Minting Live</Badge>
                  <h2 className="font-display text-2xl font-bold text-text">AuroraNft</h2>
                  <p className="text-sm text-muted mt-1">A generative collection of 10,000 unique digital artifacts on Base</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {heroNFTs.map((nft, i) => (
                <div key={i} className="glass-card rounded-card overflow-hidden">
                  <div className="aspect-square overflow-hidden">
                    <img src={nft.normalized_metadata?.image} alt={nft.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-muted truncate">{nft.name}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-card rounded-card p-6 space-y-4">
              <h3 className="font-display font-semibold text-text">About the Collection</h3>
              <p className="text-sm text-muted leading-relaxed">
                AuroraNft is a curated collection of 10,000 algorithmically generated digital artifacts
                deployed on Base. Each piece features unique trait combinations spanning six categories,
                with provenance permanently recorded on-chain. Payment is held in the smart contract
                and withdrawable by the owner to the treasury address.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border-light">
                <div>
                  <p className="text-xs text-muted-dim">Items</p>
                  <p className="text-lg font-display font-semibold text-text">10,000</p>
                </div>
                <div>
                  <p className="text-xs text-muted-dim">Chain</p>
                  <p className="text-lg font-display font-semibold text-text">Base</p>
                </div>
                <div>
                  <p className="text-xs text-muted-dim">Standard</p>
                  <p className="text-lg font-display font-semibold text-text">ERC-721</p>
                </div>
                <div>
                  <p className="text-xs text-muted-dim">Currency</p>
                  <p className="text-lg font-display font-semibold text-text">ETH</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Mint Panel */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-24">
              <MintPanel />
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
