'use client';
import { useState } from 'react';
import Badge from '@/components/ui/Badge';

export default function CollectionCard({ collection, index = 0 }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group rounded-2xl overflow-hidden bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.10] transition-all duration-400 cursor-pointer animate-fade-in"
      style={{ animationDelay: `${index * 80}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="h-32 relative overflow-hidden">
        <img
          src={collection.image}
          alt={collection.name}
          className={`w-full h-full object-cover transition-transform duration-700 ease-out ${isHovered ? 'scale-[1.06]' : 'scale-100'}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
      </div>
      <div className="p-5 space-y-3 -mt-6 relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display font-semibold text-text group-hover:text-accent transition-colors duration-200">
              {collection.name}
            </h3>
            <p className="text-[11px] text-muted-dim mt-0.5 font-mono">{collection.items.toLocaleString()} items</p>
          </div>
          <Badge color={collection.positive ? 'bullish' : 'bearish'} className="!text-[10px]">
            {collection.change}
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/[0.06]">
          <div>
            <p className="text-[9px] text-muted-dim uppercase tracking-wider">Floor</p>
            <p className="text-sm text-text font-mono font-medium mt-0.5">{collection.floor}</p>
          </div>
          <div>
            <p className="text-[9px] text-muted-dim uppercase tracking-wider">Volume</p>
            <p className="text-sm text-text font-mono font-medium mt-0.5">{collection.volume}</p>
          </div>
          <div>
            <p className="text-[9px] text-muted-dim uppercase tracking-wider">Owners</p>
            <p className="text-sm text-text font-mono font-medium mt-0.5">{collection.owners.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
