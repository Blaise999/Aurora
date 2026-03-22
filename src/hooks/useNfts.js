"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { LOCAL_NFTS } from "@/lib/constants";
import { shuffle } from "@/lib/utils";

/* ─── In-memory cache shared across all hook instances ─── */
const _cache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes for pagination/detail pages
const SHUFFLE_CACHE_TTL = 5 * 1000; // 5 seconds for shuffled landing pages

function getCached(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  const ttl = key.includes('shuffle') || key.includes('infinite:') ? SHUFFLE_CACHE_TTL : CACHE_TTL;
  if (Date.now() - entry.ts > ttl) { _cache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) {
  _cache.set(key, { data, ts: Date.now() });
}

/* ─── Generic NFT fetcher ─── */
export function useNfts(endpoint, fallbackCount = 12) {
  const cached = getCached(endpoint);
  const [nfts, setNfts] = useState(cached || []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);

  useEffect(() => {
    let c = false;
    (async () => {
      if (!cached) setLoading(true);
      try {
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error("fail");
        const d = await res.json();
        const list = d.nfts?.length ? d.nfts : d.length ? d : null;
        if (!c && list) { setNfts(list); setCache(endpoint, list); }
        else if (!c && !cached) setNfts(shuffle(LOCAL_NFTS).slice(0, fallbackCount));
      } catch (e) {
        if (!c) { setError(e.message); if (!cached) setNfts(shuffle(LOCAL_NFTS).slice(0, fallbackCount)); }
      } finally { if (!c) setLoading(false); }
    })();
    return () => { c = true; };
  }, [endpoint, fallbackCount]); // eslint-disable-line react-hooks/exhaustive-deps

  return { nfts, loading, error };
}

export function useTrendingNfts(limit = 12) { return useCachedNfts(limit); }

/* ─── Infinite-scroll capable NFT fetcher ─── */
export function useCachedNftsInfinite(pageSize = 50, collection = null) {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchPage = useCallback(async (pageOffset, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      let url = `/api/nft/cached?limit=${pageSize}&offset=${pageOffset}&shuffle=${pageOffset === 0 ? 'true' : 'false'}`;
      if (pageOffset === 0) url += `&_t=${Date.now()}`;
      if (collection) url += `&collection=${encodeURIComponent(collection)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("fail");
      const d = await res.json();
      const newNfts = d.nfts || [];
      setTotal(d.total || 0);
      setHasMore(d.hasMore ?? newNfts.length === pageSize);
      if (append) {
        setNfts(prev => [...prev, ...newNfts]);
      } else {
        setNfts(newNfts);
      }
    } catch (e) {
      setError(e.message);
      if (!append) setNfts(shuffle(LOCAL_NFTS).slice(0, pageSize));
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
  }, [pageSize, collection]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setOffset(0);
    fetchPage(0, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const newOffset = offset + pageSize;
    setOffset(newOffset);
    fetchPage(newOffset, true);
  }, [offset, pageSize, loadingMore, hasMore, fetchPage]);

  return { nfts, loading, loadingMore, error, hasMore, total, loadMore };
}

/* ─── Simple cached NFTs with SWR pattern ─── */
export function useCachedNfts(limit = 50, collection = null) {
  const cacheKey = `cached:${limit}:${collection || "all"}`;

  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let c = false;
    setLoading(true);
    (async () => {
      try {
        let url = `/api/nft/cached?limit=${limit}&shuffle=true&_t=${Date.now()}`;
        if (collection) url += `&collection=${encodeURIComponent(collection)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("fail");
        const d = await res.json();
        if (!c && d.nfts?.length) {
          setNfts(d.nfts);
        } else if (!c) {
          setNfts(shuffle(LOCAL_NFTS).slice(0, limit));
        }
      } catch (e) {
        if (!c) { setError(e.message); setNfts(shuffle(LOCAL_NFTS).slice(0, limit)); }
      } finally { if (!c) setLoading(false); }
    })();
    return () => { c = true; };
  }, [limit, collection]); // eslint-disable-line react-hooks/exhaustive-deps

  return { nfts, loading, error };
}

export function useCachedNft(contractAddress, tokenId) {
  const cacheKey = contractAddress && tokenId ? `nft:${contractAddress}:${tokenId}` : null;
  const cached = cacheKey ? getCached(cacheKey) : null;

  const [nft, setNft] = useState(cached || null);
  const [loading, setLoading] = useState(!cached && !!(contractAddress && tokenId));

  useEffect(() => {
    if (!contractAddress || !tokenId) { setLoading(false); return; }
    let c = false;
    (async () => {
      if (!cached) setLoading(true);
      try {
        const res = await fetch(`/api/nft/cached?contract=${contractAddress}&tokenId=${tokenId}`);
        const d = await res.json();
        if (!c && d.nft) {
          setNft(d.nft);
          if (cacheKey) setCache(cacheKey, d.nft);
        }
      } catch {} finally { if (!c) setLoading(false); }
    })();
    return () => { c = true; };
  }, [contractAddress, tokenId, cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { nft, loading };
}

export function useCollectionNfts(addr, limit = 20) {
  return useNfts(`/api/nft/cached?contract=${addr || ""}&limit=${limit}&shuffle=false`, limit);
}

export function useWalletNfts(wallet) {
  const cacheKey = wallet ? `wallet:${wallet}` : null;
  const cached = cacheKey ? getCached(cacheKey) : null;

  const [nfts, setNfts] = useState(cached || []);
  const [loading, setLoading] = useState(!cached && !!wallet);

  useEffect(() => {
    if (!wallet) return;
    let c = false;
    (async () => {
      if (!cached) setLoading(true);
      try {
        const r = await fetch(`/api/nft/owner?wallet=${wallet}`);
        const d = await r.json();
        if (!c) { setNfts(d.nfts || []); if (cacheKey) setCache(cacheKey, d.nfts || []); }
      } catch { if (!c) setNfts([]); }
      finally { if (!c) setLoading(false); }
    })();
    return () => { c = true; };
  }, [wallet, cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { nfts, loading };
}

export function useSettings() {
  const cacheKey = "settings";
  const cached = getCached(cacheKey);

  const [settings, setSettings] = useState(cached || null);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let c = false;
    (async () => {
      if (!cached) setLoading(true);
      try {
        const r = await fetch("/api/settings");
        const d = await r.json();
        // API returns { settings: { key: value } } — unwrap the inner object
        const resolved = d?.settings || d;
        if (!c) { setSettings(resolved); setCache(cacheKey, resolved); }
      } catch {
        if (!c && !cached) setSettings({
          minting_fee: "0.002", buy_fee: "0.002", create_mint_fee_usd: "5", sale_active: "true",
          max_per_wallet: "10", treasury_wallet: "", contract_address: ""
        });
      } finally { if (!c) setLoading(false); }
    })();
    return () => { c = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { settings, loading };
}

export function useNftMetadata(contractAddress, tokenId, nftId) {
  const [nft, setNft] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        if (contractAddress && tokenId) {
          const r = await fetch(`/api/nft/cached?contract=${contractAddress}&tokenId=${tokenId}`);
          const d = await r.json();
          if (!c && d.nft) { setNft(d.nft); return; }
        }
        if (nftId) {
          const local = LOCAL_NFTS.find(n => n.nftId === nftId);
          if (local) { if (!c) setNft(local); return; }
        }
        const p = new URLSearchParams();
        if (contractAddress) p.set("contract", contractAddress);
        if (tokenId) p.set("tokenId", tokenId);
        if (nftId) p.set("nftId", nftId);
        const r = await fetch(`/api/nft/metadata?${p}`);
        const d = await r.json();
        if (!c && d.nft) setNft(d.nft);
      } catch {} finally { if (!c) setLoading(false); }
    })();
    return () => { c = true; };
  }, [contractAddress, tokenId, nftId]);
  return { nft, loading };
}
