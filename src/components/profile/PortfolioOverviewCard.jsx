'use client'

export default function PortfolioOverviewCard({
  title,
  value,
  subtitle,
  rightSlot,
  children
}) {
  return (
    <div className="rounded-[28px] border border-border-light bg-card/70 backdrop-blur-xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-dim mb-2">
            Overview
          </p>
          <h3 className="text-2xl font-semibold">{title}</h3>
          <p className="text-3xl font-bold mt-3">{value}</p>
          <p className="text-sm text-muted mt-2">{subtitle}</p>
        </div>
        {rightSlot}
      </div>

      {children}
    </div>
  )
}