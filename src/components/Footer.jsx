import Link from 'next/link';

const footerLinks = {
  Platform: [
    { label: 'Explore', href: '/explore' },
    { label: 'Drops', href: '/mint' },
    { label: 'Rankings', href: '/explore?sort=trending' },
  ],
  Resources: [
    { label: 'Documentation', href: '#' },
    { label: 'API', href: '#' },
    { label: 'Smart Contracts', href: '#' },
  ],
  Community: [
    { label: 'Discord', href: '#' },
    { label: 'Twitter', href: '#' },
    { label: 'GitHub', href: '#' },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.04] pb-20 md:pb-0">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <img
                src="/logo.png"
                alt="AuroraNft Logo"
                className="h-10 w-auto object-contain"
                style={{ maxHeight: '40px' }}
              />
              
            </div>
            <p className="text-[13px] text-muted leading-relaxed max-w-[240px]">
              A curated NFT experience on Base. Browse, mint, and collect digital artifacts with verifiable provenance.
            </p>
          </div>
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-muted-dim mb-4">{heading}</h4>
              <ul className="space-y-2.5">
                {links.map(link => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-[13px] text-muted hover:text-text transition-colors duration-200">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-white/[0.04]">
          <p className="text-[11px] text-muted-dim">&copy; 2025 AuroraNft. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[11px] text-muted-dim font-mono">Base</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
