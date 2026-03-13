'use client'

import { TrendingUp } from 'lucide-react'

export default function PortfolioValueCard({ value }) {

  return (

    <div className="p-6 rounded-2xl border border-border bg-card">

      <div className="flex items-center justify-between mb-3">

        <span className="text-sm text-muted">
          Portfolio Value
        </span>

        <TrendingUp size={16} className="text-accent" />

      </div>

      <h2 className="text-3xl font-bold">
        {value.toFixed(2)} ETH
      </h2>

    </div>

  )

}