"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { LOCAL_NFTS } from "@/lib/constants";
import { shuffle } from "@/lib/utils";

export function useNfts(endpoint, fallbackCount = 12) {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error("fail");
        const d = await res.json();
        if (!c && (d.nfts?.length || d.length)) setNfts(d.nfts || d);
        else if (!c) setNfts(shuffle(LOCAL_NFTS).slice(0, fallbackCount));
      } catch (e) { if (!c) { setError(e.message); setNfts(shuffle(LOCAL_NFTS).slice(0, fallbackCount)); } }
      finally { if (!c) setLoading(false); }
    })();
    return () => { c = true; };
  }, [endpoint, fallbackCount]);
  return { nfts, loading, error };
}

export function useTrendingNfts(limit = 12) { return useCachedNfts(limit); }

/**
 * Infinite-scroll capable NFT fetcher
 * Returns { nfts, loading, error, hasMore, loadMore }
 */
export function useCachedNftsInfinite(pageSize = 50, collection = null) {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const initialLoad = useRef(true);

  const fetchPage = useCallback(async (pageOffset, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      let url = `/api/nft/cached?limit=${pageSize}&offset=${pageOffset}&shuffle=${pageOffset === 0 ? 'true' : 'false'}`;
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
  }, [pageSize, collection]);

  useEffect(() => {
    initialLoad.current = true;
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

export function useCachedNfts(limit = 50, collection = null) {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        let url = `/api/nft/cached?limit=${limit}&shuffle=true`;
        if (collection) url += `&collection=${encodeURIComponent(collection)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("fail");
        const d = await res.json();
        if (!c && d.nfts?.length) setNfts(d.nfts);
        else if (!c) setNfts(shuffle(LOCAL_NFTS).slice(0, limit));
      } catch (e) { if (!c) { setError(e.message); setNfts(shuffle(LOCAL_NFTS).slice(0, limit)); } }
      finally { if (!c) setLoading(false); }
    })();
    return () => { c = true; };
  }, [limit, collection]);
  return { nfts, loading, error };
}

export function useCachedNft(contractAddress, tokenId) {
  const [nft, setNft] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!contractAddress || !tokenId) { setLoading(false); return; }
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/nft/cached?contract=${contractAddress}&tokenId=${tokenId}`);
        const d = await res.json();
        if (!c && d.nft) setNft(d.nft);
      } catch {} finally { if (!c) setLoading(false); }
    })();
    return () => { c = true; };
  }, [contractAddress, tokenId]);
  return { nft, loading };
}

export function useCollectionNfts(addr, limit = 20) {
  return useNfts(`/api/nft/cached?contract=${addr || ""}&limit=${limit}&shuffle=false`, limit);
}

export function useWalletNfts(wallet) {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!wallet) return;
    let c = false;
    (async () => {
      setLoading(true);
      try { const r = await fetch(`/api/nft/owner?wallet=${wallet}`); const d = await r.json(); if (!c) setNfts(d.nfts || []); }
      catch { if (!c) setNfts([]); } finally { if (!c) setLoading(false); }
    })();
    return () => { c = true; };
  }, [wallet]);
  return { nfts, loading };
}

export function useSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let c = false;
    (async () => {
      try { const r = await fetch("/api/settings"); const d = await r.json(); if (!c) setSettings(d); }
      catch { if (!c) setSettings({ minting_fee: "0.002", buy_fee: "0.002", sale_active: "true", max_per_wallet: "10", treasury_wallet: "", contract_address: "" }); }
      finally { if (!c) setLoading(false); }
    })();
    return () => { c = true; };
  }, []);
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
