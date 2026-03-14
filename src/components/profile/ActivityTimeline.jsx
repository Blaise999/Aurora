'use client'

import { BadgeCheck } from 'lucide-react'

export default function ActivityTimeline({ items = [] }) {
  return (
    <div className="rounded-[28px] border border-border-light bg-card/70 backdrop-blur-xl p-6">
      <div className="mb-5">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-dim mb-2">
          Activity
        </p>
        <h3 className="text-xl font-semibold">Recent Moves</h3>
      </div>

      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={item.id || idx} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <BadgeCheck size={16} />
                </div>
                {idx !== items.length - 1 && (
                  <div className="w-px flex-1 bg-border-light mt-2" />
                )}
              </div>

              <div className="pb-4">
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted">{item.subtitle}</p>
                <p className="text-xs text-muted-dim mt-1">
                  {new Date(item.time).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border-light bg-surface2/40 p-4 text-sm text-muted">
          No recent activity yet.
        </div>
      )}
    </div>
  )
}