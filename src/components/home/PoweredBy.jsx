export default function PoweredBy() {
  const techs = [
    { name: 'Base', emoji: '🔵' },
    { name: 'Ethereum', emoji: '⟠' },
    { name: 'IPFS', emoji: '📦' },
    { name: 'Supabase', emoji: '⚡' },
    { name: 'Next.js', emoji: '▲' },
    { name: 'Vercel', emoji: '🚀' },
  ];

  return (
    <section className="py-12 border-y border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8">
        <p className="text-center text-[10px] font-display font-semibold uppercase tracking-[0.3em] text-muted-dim mb-6">
          Powered by
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {techs.map((t) => (
            <div key={t.name} className="flex items-center gap-2 text-muted hover:text-text transition-colors duration-300">
              <span className="text-lg">{t.emoji}</span>
              <span className="text-sm font-display font-medium tracking-wide">{t.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
