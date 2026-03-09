"use client";

import { useEffect, useState } from "react";
import NFTGrid from "./NFTGrid";

export default function NFTGridAlchemy({ owner }) {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!owner) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/nft/owner?owner=${encodeURIComponent(owner)}`);
        const data = await res.json();
        if (!cancelled) setNfts(data?.nfts || []);
      } catch (e) {
        if (!cancelled) setNfts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [owner]);

  return <NFTGrid nfts={nfts} loading={loading} columns={4} />;
}