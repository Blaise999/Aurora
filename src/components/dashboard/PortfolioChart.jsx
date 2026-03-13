'use client'

import {
  LineChart,
  Line,
  XAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

export default function PortfolioChart({ data }) {

  return (

    <div className="h-[240px] w-full">

      <ResponsiveContainer>

        <LineChart data={data}>

          <XAxis dataKey="day" />

          <Tooltip />

          <Line
            type="monotone"
            dataKey="value"
            stroke="#7c3aed"
            strokeWidth={3}
            dot={false}
          />

        </LineChart>

      </ResponsiveContainer>

    </div>

  )

}