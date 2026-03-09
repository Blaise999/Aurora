'use client';
import { Flame, TrendingUp, ArrowUpCircle, ArrowDownCircle, Star } from 'lucide-react';

const chips = [
  { id: 'all', label: 'All', icon: null },
  { id: 'Hot', label: 'Hot', icon: <Flame size={13} />, color: 'text-hot' },
  { id: 'Rising', label: 'Rising', icon: <TrendingUp size={13} />, color: 'text-rising' },
  { id: 'Bullish', label: 'Bullish', icon: <ArrowUpCircle size={13} />, color: 'text-bullish' },
  { id: 'Bearish', label: 'Bearish', icon: <ArrowDownCircle size={13} />, color: 'text-bearish' },
  { id: 'Important', label: 'Important', icon: <Star size={13} />, color: 'text-warning' },
];

export default function NewsFilterChips({ active = 'all', onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(chip => (
        <button
          key={chip.id}
          onClick={() => onChange?.(chip.id)}
          className={`
            flex items-center gap-1.5 px-3.5 py-2 rounded-pill text-sm font-medium
            transition-all duration-200 border
            ${active === chip.id
              ? 'bg-white/[0.08] border-accent/20 text-text'
              : 'bg-transparent border-border-light text-muted hover:text-text hover:border-border'
            }
          `}
        >
          {chip.icon && <span className={chip.color}>{chip.icon}</span>}
          {chip.label}
        </button>
      ))}
    </div>
  );
}
