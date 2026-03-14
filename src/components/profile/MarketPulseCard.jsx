'use client'

export default function MarketPulseCard({ items = [] }) {
  return (
    <div className="rounded-[28px] border border-border-light bg-card/70 backdrop-blur-xl p-6">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-dim mb-2">
          Pulse
        </p>
        <h3 className="text-xl font-semibold">Market Signal</h3>
      </div>

      <div className="space-y-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-2xl border border-border-light bg-surface2/40 px-4 py-3"
          >
            <span className="text-sm text-muted">{item.label}</span>
            <span className="text-sm font-semibold">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}