'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import NFTGrid from './NFTGrid';
import { normalizeUiNfts } from './normalizeUiNft';
import Button from '@/components/ui/Button';

export default function NFTGridAlchemy({ owner }) {
  const [nfts, setNfts] = useState([]);
  const [pageKey, setPageKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState(null);
  const prevOwner = useRef(owner);
  const fetchingRef = useRef(false);

  const fetchPage = useCallback(async (ownerAddr, cursor, append) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true); setError(null);
    try {
      const url = new URL('/api/nft/owner', window.location.origin);
      url.searchParams.set('owner', ownerAddr);
      if (cursor) url.searchParams.set('pageKey', cursor);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const normalized = normalizeUiNfts(data.nfts || []);
      setNfts(prev => {
        const combined = append ? [...prev, ...normalized] : normalized;
        const seen = new Set();
        return combined.filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true; });
      });
      setPageKey(data.pageKey || null);
      if (!append) preloadImages(normalized.slice(0, 4));
    } catch (e) { setError(e.message || 'Failed to load NFTs'); }
    finally { setLoading(false); setInitialLoad(false); fetchingRef.current = false; }
  }, []);

  useEffect(() => {
    if (!owner) return;
    if (prevOwner.current !== owner) { setNfts([]); setPageKey(null); setInitialLoad(true); prevOwner.current = owner; }
    fetchPage(owner, null, false);
  }, [owner, fetchPage]);

  const handleLoadMore = useCallback(() => {
    if (!pageKey || loading) return;
    fetchPage(owner, pageKey, true);
  }, [owner, pageKey, loading, fetchPage]);

  return (
    <div>
      <NFTGrid nfts={nfts} loading={initialLoad} columns={4} />
      {error && !initialLoad && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger text-center animate-fade-in">
          {error}
        </div>
      )}
      {!initialLoad && !loading && nfts.length === 0 && !error && (
        <div className="text-center py-20 animate-fade-in">
          <p className="text-muted text-sm">No NFTs found for this wallet.</p>
          <p className="text-muted-dim text-xs mt-2">Try another wallet address or check the connected network.</p>
        </div>
      )}
      {pageKey && !initialLoad && (
        <div className="flex justify-center mt-10">
          <Button variant="secondary" size="lg" onClick={handleLoadMore} disabled={loading}>
            {loading ? 'Loading…' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
}

function preloadImages(nfts) {
  if (typeof document === 'undefined') return;
  nfts.forEach(nft => {
    const src = nft.normalized_metadata?.image;
    if (!src || src.startsWith('linear-gradient')) return;
    const link = document.createElement('link');
    link.rel = 'preload'; link.as = 'image'; link.href = src;
    document.head.appendChild(link);
  });
}
