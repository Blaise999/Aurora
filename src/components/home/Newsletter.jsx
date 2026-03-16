'use client';
import { useState } from 'react';
import { Mail, ArrowRight, Check, Sparkles } from 'lucide-react';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    // In production, POST to your newsletter API
    setSubmitted(true);
  };

  return (
    <section className="py-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8">
        <div className="max-w-xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-pill bg-accent/10 border border-accent/20 mb-6">
            <Sparkles size={14} className="text-accent" />
            <span className="text-xs font-display font-semibold text-accent uppercase tracking-wider">Stay in the loop</span>
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-bold text-text mb-3">
            Get Early Access to Drops
          </h2>
          <p className="text-[13px] text-muted leading-relaxed mb-8">
            Join the inner circle. Get notified before public mints, exclusive airdrops, and alpha on upcoming collections.
          </p>

          {submitted ? (
            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-success/10 border border-success/20">
              <Check size={20} className="text-success" />
              <span className="text-sm font-medium text-success">You&apos;re in! Watch your inbox.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
              <div className="flex-1 relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-dim" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm text-text placeholder:text-muted-dim/40 focus:outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/20 transition-all"
                />
              </div>
              <button
                type="submit"
                className="shrink-0 px-6 py-3.5 rounded-xl font-display font-semibold text-sm text-bg bg-gradient-to-r from-accent to-accent-violet hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                Join <ArrowRight size={14} />
              </button>
            </form>
          )}

          <p className="text-[10px] text-muted-dim mt-4">No spam. Unsubscribe anytime.</p>
        </div>
      </div>
    </section>
  );
}
