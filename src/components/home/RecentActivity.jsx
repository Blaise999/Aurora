'use client';
import { useState, useEffect, useCallback } from 'react';
import { Activity, Zap, Sparkles } from 'lucide-react';

const POLL_INTERVAL = 15000; // 15 seconds – real-time feel (you can change to 600000 for 10 min if you want)

const SEEDED_NFTS = [
  {
    id: 59206,
    nft_name: "re:gen #2",
    total_value_eth: "10.619",
  },
  {
    id: 59207,
    nft_name: "Bored Ape #0",
    total_value_eth: "10.9712",
  },
  {
    id: 59208,
    nft_name: "Pudgy Penguin #2",
    total_value_eth: "11.9053",
  },
  {
    id: 59209,
    nft_name: "Kemonokaki #3",
    total_value_eth: "16.1127",
  },
  {
    id: 12,
    nft_name: "Milady 4",
    total_value_eth: "0.004",
  },
  {
    id: 13,
    nft_name: "Milady 3",
    total_value_eth: "0.004",
  },
  {
    id: 16,
    nft_name: "XOOB #3",
    total_value_eth: "0.004",
  },
  {
    id: 15,
    nft_name: "XOOB #4",
    total_value_eth: "0.004",
  },
  {
    id: 18,
    nft_name: "Wrapped Punk #5",
    total_value_eth: "0.7532",
  },
  {
    id: 19,
    nft_name: "Lil Pudgy #1",
    total_value_eth: "0.2426",
  },
];

const WALLETS = [
  "0x00da...d873",
  "0xfa3b...6873",
  "0xb7f7...f6",
  "0x524c...a048",
  "0x26c4...8188",
];

const RECENT_TIMES = [
  "just now",
  "1m ago",
  "2m ago",
  "3m ago",
  "4m ago",
  "5m ago",
  "8m ago",
];

export default function RecentActivity() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

  const generateSeededEvents = (count) => {
    const shuffledSeeded = shuffle(SEEDED_NFTS).slice(0, count);
    const shuffledWallets = shuffle(WALLETS);
    const shuffledTimes = shuffle(RECENT_TIMES);

    return shuffledSeeded.map((nft, i) => ({
      id: `seeded-${nft.id}-${Date.now()}`,
      wallet: shuffledWallets[i % shuffledWallets.length],
      action: "minted", // seeded are always from user_listed (mint style)
      nft: nft.nft_name,
      amount: `${nft.total_value_eth} ETH`,
      time: shuffledTimes[i % shuffledTimes.length],
    }));
  };

  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch('/api/activity/live', { cache: 'no-store' });
      const data = res.ok ? await res.json() : { events: [] };

      // Live events come first (real mints + purchases from your DB)
      let liveEvents = (data?.events || []).slice(0, 5);

      // Calculate how many seeded events we need to mix in (always keep it lively)
      const seededCount = Math.max(8 - liveEvents.length, 3);

      // Generate fresh seeded events with new "live" timestamps every poll
      const seededEvents = generateSeededEvents(seededCount);

      // Mix them together + shuffle so it feels organic
      let mixed = [...liveEvents, ...seededEvents];
      mixed = shuffle(mixed).slice(0, 8);

      setEvents(mixed);
    } catch (err) {
      console.error("Live activity fetch failed, falling back to seeded only");
      // Still show seeded if API is down or empty
      const fallback = generateSeededEvents(8);
      setEvents(fallback);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchActivity();
    const id = setInterval(fetchActivity, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchActivity]);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  if (loading && events.length === 0) {
    return (
      <section className="py-16">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-success/20 to-success/5 border border-success/20 flex items-center justify-center">
              <Activity size={16} className="text-success" />
            </div>
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-text">Live Activity</h2>
              <p className="text-[11px] text-muted-dim mt-0.5 font-mono tracking-wide">Loading live mints &amp; buys...</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-white/[0.02] border border-white/[0.06] animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (events.length === 0) return null;

  return (
    <section className="py-16 relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-success/20 to-success/5 border border-success/20 flex items-center justify-center">
              <Activity size={16} className="text-success" />
            </div>
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-text">Live Activity</h2>
              <p className="text-[11px] text-muted-dim mt-0.5 font-mono tracking-wide">
                Real-time mints &amp; purchases • seeded mixed live
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-success/10 border border-success/20">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-[11px] font-mono text-success font-medium">LIVE • updates every 15s</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {events.map((evt, i) => (
            <div
              key={evt.id || i}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.10] transition-all duration-500 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                evt.action === 'minted'
                  ? 'bg-accent/10 text-accent'
                  : 'bg-accent-violet/10 text-accent-violet'
              }`}>
                {evt.action === 'minted' ? <Sparkles size={16} /> : <Zap size={16} />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-text truncate">
                  <span className="font-mono text-muted">{evt.wallet}</span>{' '}
                  <span className={evt.action === 'minted' ? 'text-accent' : 'text-accent-violet'}>
                    {evt.action}
                  </span>{' '}
                  <span className="font-semibold">{evt.nft}</span>
                </p>
                <p className="text-[10px] text-muted-dim mt-0.5">{evt.time}</p>
              </div>

              {evt.amount && (
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono font-semibold text-text">{evt.amount}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}