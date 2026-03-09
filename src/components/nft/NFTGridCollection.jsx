'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import NFTGrid from './NFTGrid';
import { normalizeUiNfts } from './normalizeUiNft';
import Button from '@/components/ui/Button';

export default function NFTGridCollection({ contractAddress }) {
  const [nfts, setNfts] = useState([]);
  const [nextToken, setNextToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState(null);
  const prevAddr = useRef(contractAddress);
  const fetchingRef = useRef(false);

  const fetchPage = useCallback(async (addr, startToken, append) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true); setError(null);
    try {
      const url = new URL('/api/nft/collection', window.location.origin);
      url.searchParams.set('contractAddress', addr);
      if (startToken) url.searchParams.set('startToken', startToken);
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
      setNextToken(data.nextToken || null);
    } catch (e) { setError(e.message || 'Failed'); }
    finally { setLoading(false); setInitialLoad(false); fetchingRef.current = false; }
  }, []);

  useEffect(() => {
    if (!contractAddress) return;
    if (prevAddr.current !== contractAddress) { setNfts([]); setNextToken(null); setInitialLoad(true); prevAddr.current = contractAddress; }
    fetchPage(contractAddress, null, false);
  }, [contractAddress, fetchPage]);

  return (
    <div>
      <NFTGrid nfts={nfts} loading={initialLoad} columns={4} />
      {error && !initialLoad && <div className="mt-4 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger text-center">{error}</div>}
      {!initialLoad && !loading && nfts.length === 0 && !error && (
        <div className="text-center py-20"><p className="text-muted text-sm">No NFTs found in this collection.</p></div>
      )}
      {nextToken && !initialLoad && (
        <div className="flex justify-center mt-10">
          <Button variant="secondary" size="lg" onClick={() => fetchPage(contractAddress, nextToken, true)} disabled={loading}>
            {loading ? 'Loading…' : 'Load More'}
          </Button>
        </div>
      )}
    </div>
  );
}
