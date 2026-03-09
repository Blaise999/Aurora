'use client';
import { Minus, Plus } from 'lucide-react';

export default function QuantityStepper({ value = 1, onChange, max = 5, min = 1 }) {
  return (
    <div className="flex items-center gap-0 border border-border rounded-xl overflow-hidden w-fit">
      <button
        onClick={() => onChange?.(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-11 h-11 flex items-center justify-center text-muted hover:text-text hover:bg-white/[0.04]
          disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
      >
        <Minus size={16} />
      </button>
      <div className="w-14 h-11 flex items-center justify-center text-text font-mono font-semibold text-base border-x border-border">
        {value}
      </div>
      <button
        onClick={() => onChange?.(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-11 h-11 flex items-center justify-center text-muted hover:text-text hover:bg-white/[0.04]
          disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
