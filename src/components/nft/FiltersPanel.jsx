'use client';
import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

const filterSections = [
  {
    label: 'Chain',
    key: 'chain',
    options: ['Ethereum', 'Polygon', 'Arbitrum', 'Base'],
  },
  {
    label: 'Rarity',
    key: 'rarity',
    options: ['Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'],
  },
  {
    label: 'Element',
    key: 'element',
    options: ['Fire', 'Water', 'Earth', 'Aether', 'Shadow', 'Light'],
  },
  {
    label: 'Background',
    key: 'background',
    options: ['Midnight', 'Nebula', 'Void', 'Aurora', 'Deep Ocean'],
  },
];

function FilterSection({ label, options }) {
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState([]);

  const toggle = (opt) => {
    setSelected(prev => prev.includes(opt) ? prev.filter(s => s !== opt) : [...prev, opt]);
  };

  return (
    <div className="border-b border-border-light pb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-2 text-sm font-medium text-text"
      >
        {label}
        {selected.length > 0 && (
          <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-pill mr-auto ml-2">
            {selected.length}
          </span>
        )}
        <ChevronDown size={16} className={`text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-1.5 mt-2">
          {options.map(opt => (
            <label key={opt} className="flex items-center gap-2.5 cursor-pointer group">
              <div className={`
                w-4 h-4 rounded border transition-all duration-200 flex items-center justify-center
                ${selected.includes(opt)
                  ? 'bg-accent border-accent'
                  : 'border-border hover:border-accent/40'
                }
              `}>
                {selected.includes(opt) && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#070A10" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
              </div>
              <span className="text-sm text-muted group-hover:text-text transition-colors">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FiltersPanel({ open = true, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-bg/60 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed lg:sticky top-0 left-0 h-screen lg:h-auto lg:top-24
        w-72 shrink-0 z-50 lg:z-auto
        bg-surface lg:bg-transparent
        border-r border-border-light lg:border-r-0
        transform transition-transform duration-300 lg:transform-none
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        overflow-y-auto
      `}>
        <div className="p-6 lg:p-0 space-y-4">
          <div className="flex items-center justify-between lg:hidden">
            <h3 className="font-display font-semibold text-text">Filters</h3>
            <button onClick={onClose} className="p-1 text-muted hover:text-text">
              <X size={20} />
            </button>
          </div>

          {/* Has media toggle */}
          <div className="flex items-center justify-between py-3 border-b border-border-light">
            <span className="text-sm text-text">Has media</span>
            <button className="w-10 h-5 rounded-full bg-accent/20 relative transition-colors duration-200 hover:bg-accent/30">
              <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-accent transition-transform duration-200" />
            </button>
          </div>

          {filterSections.map(section => (
            <FilterSection key={section.key} {...section} />
          ))}

          <button className="w-full py-2.5 text-sm text-muted hover:text-text text-center border border-border rounded-xl hover:border-accent/20 transition-colors duration-200">
            Clear all filters
          </button>
        </div>
      </aside>
    </>
  );
}
