'use client';
import { useState } from 'react';
import { Quote, RefreshCw } from 'lucide-react';

const quotes = [
  { text: "We're all gonna make it.", tag: "wagmi", emoji: "🚀" },
  { text: "Not your keys, not your crypto.", tag: "self-custody", emoji: "🔐" },
  { text: "Ape in responsibly.", tag: "degen wisdom", emoji: "🦍" },
  { text: "The best time to mint was yesterday. The second best is now.", tag: "no regrets", emoji: "⏰" },
  { text: "1 of 1s hit different.", tag: "art appreciator", emoji: "🎨" },
  { text: "Diamond hands don't fold.", tag: "hodl", emoji: "💎" },
  { text: "GM to everyone except paper hands.", tag: "gm", emoji: "☀️" },
  { text: "Probably nothing.", tag: "alpha", emoji: "👀" },
  { text: "If you know, you know.", tag: "iykyk", emoji: "🧠" },
  { text: "Floor is lava. And it's rising.", tag: "bullish", emoji: "🔥" },
  { text: "In a world of copies, be an original.", tag: "1/1", emoji: "✨" },
  { text: "The metaverse isn't coming. It's already here.", tag: "based", emoji: "🌐" },
];

export default function Web3Culture() {
  const [idx, setIdx] = useState(0);
  const q = quotes[idx];

  const next = () => setIdx((prev) => (prev + 1) % quotes.length);

  return (
    <section className="py-16">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-8 sm:p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-accent/[0.03] via-transparent to-accent-violet/[0.03] pointer-events-none" />

            <div className="relative">
              <span className="text-4xl mb-4 block">{q.emoji}</span>

              <blockquote className="font-display text-xl sm:text-2xl font-bold text-text leading-snug mb-4">
                &ldquo;{q.text}&rdquo;
              </blockquote>

              <div className="flex items-center justify-center gap-2 mb-6">
                <span className="px-3 py-1 rounded-pill bg-accent/10 border border-accent/20 text-[11px] font-mono text-accent">
                  #{q.tag}
                </span>
              </div>

              <button
                onClick={next}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-muted hover:text-text hover:border-white/[0.12] transition-all duration-300"
              >
                <RefreshCw size={14} />
                Next vibe
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
