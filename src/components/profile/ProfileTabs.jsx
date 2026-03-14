'use client'

export default function ProfileTabs({ tab, setTab, tabs }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-4">
      {tabs.map((item) => {
        const active = tab === item.key
        return (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all ${
              active
                ? 'bg-accent text-white shadow-lg'
                : 'bg-surface2/50 text-muted hover:text-text border border-border-light'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}