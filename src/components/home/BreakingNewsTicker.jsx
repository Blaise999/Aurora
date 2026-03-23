'use client';
import { useState, useEffect, useCallback } from 'react';

const POLL_INTERVAL = 20000;

export default function BreakingNewsTicker() {
  const [headlines, setHeadlines] = useState([]);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/activity/live', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.events?.length) {
        setHeadlines(
          data.events.slice(0, 12).map((evt) => {
            const verb = evt.action === 'minted' ? 'minted' : 'purchased';
            return `${evt.wallet} ${verb} ${evt.nft}${evt.amount ? ` for ${evt.amount}` : ''} · ${evt.time}`;
          })
        );
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchActivity();
    const id = setInterval(fetchActivity, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchActivity]);

  // Show nothing until we have real data
  if (headlines.length === 0) return null;

  const doubled = [...headlines, ...headlines];

  return (
    <div className="relative w-full bg-white/[0.02] border-y border-white/[0.04] overflow-hidden z-10">
      <div className="max-w-[1400px] mx-auto flex items-center h-10">
        <div className="shrink-0 flex items-center gap-2.5 pl-6 md:pl-8 pr-4 h-full border-r border-white/[0.06] bg-bg/50 relative z-10">
          <span className="text-[10px] font-mono font-semibold tracking-wider text-muted-dim uppercase">
            Feed
          </span>
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-pill bg-success/10 border border-success/20">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[9px] font-semibold text-success uppercase tracking-wide">Live</span>
          </span>
        </div>
        <div
          className="flex-1 overflow-hidden relative h-full flex items-center"
          style={{
            maskImage:
              'linear-gradient(to right, transparent 0%, black 48px, black calc(100% - 48px), transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, black 48px, black calc(100% - 48px), transparent 100%)',
          }}
        >
          <div className="flex items-center gap-0 animate-marquee whitespace-nowrap">
            {doubled.map((text, i) => (
              <span key={i} className="flex items-center shrink-0">
                <span className="text-[12px] text-muted hover:text-text transition-colors duration-200 cursor-default">
                  {text}
                </span>
                <span className="mx-5 w-1 h-1 rounded-full bg-accent/30 shrink-0" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
