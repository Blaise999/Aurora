'use client';
import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import NFTGrid from '@/components/nft/NFTGrid';
import FiltersPanel from '@/components/nft/FiltersPanel';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { mockNFTs } from '@/lib/mock/nfts';
import { normalizeUiNfts } from '@/components/nft/normalizeUiNft';

const sortOptions = [
  { value: 'recent', label: 'Recently Listed' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
];

export default function ExplorePage() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  const allNfts = useMemo(() => normalizeUiNfts(mockNFTs), []);

  const handleLoadMore = () => {
    setLoading(true);
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + 8, allNfts.length));
      setLoading(false);
    }, 800);
  };

  const filtered = search
    ? allNfts.filter(n => n.name.toLowerCase().includes(search.toLowerCase()))
    : allNfts;

  return (
    <PageShell>
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold text-text">Explore</h1>
          <p className="text-sm text-muted mt-2">Discover unique digital artifacts across collections</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <Input placeholder="Search by name, collection, or trait..." icon={<Search size={16} />} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <Select options={sortOptions} className="w-48" />
            <button onClick={() => setFiltersOpen(!filtersOpen)} className="lg:hidden flex items-center gap-2 px-4 py-3 rounded-xl glass border border-border text-sm text-muted hover:text-text transition-colors">
              <SlidersHorizontal size={16} /> Filters
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted">{filtered.length} items</p>
        </div>
        <div className="flex gap-8">
          <div className="hidden lg:block"><FiltersPanel open={true} /></div>
          <FiltersPanel open={filtersOpen} onClose={() => setFiltersOpen(false)} />
          <div className="flex-1 min-w-0">
            <NFTGrid nfts={filtered.slice(0, visibleCount)} loading={loading} />
            {visibleCount < filtered.length && (
              <div className="flex justify-center mt-10">
                <Button variant="secondary" size="lg" onClick={handleLoadMore} disabled={loading}>
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
