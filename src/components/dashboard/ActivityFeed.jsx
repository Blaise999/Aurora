'use client'

import { Activity } from 'lucide-react'

export default function ActivityFeed({ activity }) {

  return (

    <div className="p-6 rounded-2xl border border-border bg-card">

      <div className="flex items-center gap-2 mb-4">

        <Activity size={18} />

        <h3 className="font-semibold">
          Portfolio Activity
        </h3>

      </div>

      <div className="space-y-3">

        {activity.map((item, i) => (

          <div
            key={i}
            className="flex justify-between text-sm"
          >

            <span>{item.action}</span>

            <span className="text-muted">
              {item.time}
            </span>

          </div>

        ))}

      </div>

    </div>

  )

}