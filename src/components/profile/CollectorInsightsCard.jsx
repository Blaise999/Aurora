'use client'

import { Gem, Layers3, Sparkles, TrendingUp } from 'lucide-react'

export default function CollectorInsightsCard({
  totalNfts,
  uniqueCollections,
  rareCount,
  portfolioValue
}) {
  return (
    <div className="rounded-[28px] border border-border-light bg-card/70 backdrop-blur-xl p-6">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-dim mb-2">
          Insights
        </p>
        <h3 className="text-xl font-semibold">Collector Metrics</h3>
      </div>

      <div className="space-y-3">
        <InsightRow icon={<Sparkles size={16} />} label="Assets Held" value={String(totalNfts)} />
        <InsightRow icon={<Layers3 size={16} />} label="Collections" value={String(uniqueCollections)} />
        <InsightRow icon={<Gem size={16} />} label="Rare Assets" value={String(rareCount)} />
        <InsightRow icon={<TrendingUp size={16} />} label="Vault Value" value={`${portfolioValue.toFixed(2)} ETH`} />
      </div>
    </div>
  )
}

function InsightRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border-light bg-surface2/40 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="text-accent">{icon}</div>
        <span className="text-sm text-muted">{label}</span>
      </div>
      <span className="font-semibold">{value}</span>
    </div>
  )
}