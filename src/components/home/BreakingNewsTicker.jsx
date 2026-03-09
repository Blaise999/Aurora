'use client';

const headlines = [
  'ETH Layer 2 activity surges to all-time high as gas fees drop below 5 gwei',
  'Major NFT marketplace announces zero-fee trading for verified collections',
  'Bitcoin mining difficulty reaches new record — hash rate climbs 12% MoM',
  'Polygon zkEVM upgrade unlocks 10x throughput improvement for DeFi protocols',
  'SEC commissioner signals potential regulatory framework for digital assets',
  'Solana DeFi TVL crosses $12B amid memecoin rally and institutional inflows',
  'Art Blocks curated drops new generative series from award-winning artist',
  'Avalanche Foundation deploys $100M ecosystem fund for gaming + entertainment',
];

export default function BreakingNewsTicker() {
  const doubled = [...headlines, ...headlines];

  return (
    <div className="relative w-full bg-white/[0.02] border-y border-white/[0.04] overflow-hidden z-10">
      <div className="max-w-[1400px] mx-auto flex items-center h-10">
        <div className="shrink-0 flex items-center gap-2.5 pl-6 md:pl-8 pr-4 h-full border-r border-white/[0.06] bg-bg/50 relative z-10">
          <span className="text-[10px] font-mono font-semibold tracking-wider text-muted-dim uppercase">
            Feed
          </span>
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-pill bg-danger/10 border border-danger/20">
            <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
            <span className="text-[9px] font-semibold text-danger uppercase tracking-wide">Live</span>
          </span>
        </div>
        <div className="flex-1 overflow-hidden relative h-full flex items-center"
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, black 48px, black calc(100% - 48px), transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 48px, black calc(100% - 48px), transparent 100%)',
          }}
        >
          <div className="flex items-center gap-0 animate-marquee whitespace-nowrap">
            {doubled.map((text, i) => (
              <span key={i} className="flex items-center shrink-0">
                <span className="text-[12px] text-muted hover:text-text transition-colors duration-200 cursor-pointer">
                  {text}
                </span>
                <span className="mx-5 w-1 h-1 rounded-full bg-accent/30 shrink-0" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
