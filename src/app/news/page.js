'use client';
import PageShell from '@/components/layout/PageShell';
import NewsFeed from '@/components/news/NewsFeed';
import TickerSidebarCard from '@/components/news/TickerSidebarCard';
import Card from '@/components/ui/Card';
import { mockNews, topTickers } from '@/lib/mock/news';
import { Radio } from 'lucide-react';

export default function NewsPage() {
  return (
    <PageShell>
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <h1 className="font-display text-4xl font-bold text-text">News</h1>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-success/10 border border-success/20">
              <Radio size={12} className="text-success animate-pulse" />
              <span className="text-[11px] text-success font-mono">Live</span>
            </span>
          </div>
          <p className="text-sm text-muted">Crypto and NFT market intelligence, powered by community sentiment</p>
        </div>

        <div className="flex gap-8">
          {/* Main feed */}
          <div className="flex-1 min-w-0">
            <NewsFeed news={mockNews} />
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-24 space-y-5">
              {/* Top Tickers */}
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-text mb-3">Top Tickers</h3>
                <div>
                  {topTickers.map(ticker => (
                    <TickerSidebarCard key={ticker.symbol} ticker={ticker} />
                  ))}
                </div>
              </Card>

              {/* Quick stats */}
              <Card className="p-5 space-y-3">
                <h3 className="text-sm font-semibold text-text">Market Overview</h3>
                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Total Market Cap</span>
                    <span className="text-text font-mono">$3.42T</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">24h Volume</span>
                    <span className="text-text font-mono">$142B</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">BTC Dominance</span>
                    <span className="text-text font-mono">52.3%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Fear & Greed</span>
                    <span className="text-success font-mono">71 Greed</span>
                  </div>
                </div>
              </Card>
            </div>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
