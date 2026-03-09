import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import NewsCard from '@/components/news/NewsCard';
import { mockNews } from '@/lib/mock/news';

export default function MarketPulse() {
  return (
    <section className="py-20">
      <div className="max-w-[1400px] mx-auto px-6 md:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-text">Market Pulse</h2>
            <p className="text-[13px] text-muted mt-1">Latest from the crypto and NFT ecosystem</p>
          </div>
          <Link href="/news" className="hidden sm:flex items-center gap-1 text-[13px] text-muted hover:text-accent transition-colors group">
            View all <ArrowUpRight size={13} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {mockNews.slice(0, 4).map((item, i) => (
            <NewsCard key={item.id} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
