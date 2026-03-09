'use client';
import { useState } from 'react';

export default function Tabs({ tabs = [], defaultTab, className = '' }) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.id);

  return (
    <div className={className}>
      <div className="flex gap-1 p-1 bg-surface2/50 rounded-xl border border-border-light w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`
              px-4 py-2 text-sm font-medium rounded-lg transition-all duration-250
              ${active === tab.id
                ? 'bg-white/[0.08] text-text shadow-sm'
                : 'text-muted hover:text-text hover:bg-white/[0.03]'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tabs.find(t => t.id === active)?.content}
      </div>
    </div>
  );
}
