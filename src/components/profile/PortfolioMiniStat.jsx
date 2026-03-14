'use client'

export default function PortfolioMiniStat({ icon, label, value, hint }) {
  return (
    <div className="rounded-[24px] border border-border-light bg-card/70 backdrop-blur-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
          {icon}
        </div>
      </div>
      <p className="text-xs uppercase tracking-[0.2em] text-muted-dim mb-2">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted mt-2">{hint}</p>
    </div>
  )
}