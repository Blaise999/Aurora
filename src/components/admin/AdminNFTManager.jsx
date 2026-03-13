'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Search, Filter, Check, X, Edit3,
  Loader2, ChevronLeft, ChevronRight, Star, Eye, EyeOff,
  AlertCircle, CheckCircle2, Clock, Image as ImageIcon
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

const CHAIN_LABELS = { 1: 'Ethereum', 8453: 'Base', 84532: 'Base Sepolia', 137: 'Polygon' };

export default function AdminNFTManager() {
  /* ── State ────────────────────────────────────────── */
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 200;

  /* Filters */
  const [search, setSearch] = useState('');
  const [chainFilter, setChainFilter] = useState('');
  const [featuredFilter, setFeaturedFilter] = useState('');
  const [listedFilter, setListedFilter] = useState('');

  /* Sync */
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  /* Editing */
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [saving, setSaving] = useState(null);
  const [successId, setSuccessId] = useState(null);

  /* ── Fetch NFTs ───────────────────────────────────── */
  const fetchNfts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set('search', search);
      if (chainFilter) params.set('chain', chainFilter);
      if (featuredFilter) params.set('featured', featuredFilter);
      if (listedFilter) params.set('listed', listedFilter);

      const res = await fetch(`/api/admin/nft/pricing?${params}`);
      const data = await res.json();
      if (data.nfts) setNfts(data.nfts);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (e) {
      console.error('Failed to fetch NFTs:', e);
    }
    setLoading(false);
  }, [page, search, chainFilter, featuredFilter, listedFilter]);

  /* ── Fetch last sync log ──────────────────────────── */
  const fetchLastSync = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/nft/sync-log');
      const data = await res.json();
      if (data.logs?.length) setLastSync(data.logs[0]);
    } catch {}
  }, []);

  useEffect(() => { fetchNfts(); }, [fetchNfts]);
  useEffect(() => { fetchLastSync(); }, [fetchLastSync]);

  /* ── Sync handler ─────────────────────────────────── */
  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/admin/nft/sync', { method: 'POST' });
      const data = await res.json();
      setSyncResult(data);
      if (data.ok) {
        setPage(1);
        await fetchNfts();
        await fetchLastSync();
      }
    } catch (e) {
      setSyncResult({ error: e.message });
    }
    setSyncing(false);
  };

  /* ── Edit handlers ────────────────────────────────── */
  const startEdit = (nft) => {
    setEditingId(nft.id);
    setEditValues({
      mint_price_eth: nft.mint_price_eth,
      mint_fee_eth: nft.mint_fee_eth,
      is_featured: nft.is_featured,
      is_listed: nft.is_listed,
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditValues({}); };

  const saveEdit = async (nft) => {
    setSaving(nft.id);
    try {
      const res = await fetch('/api/admin/nft/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cached_nft_id: nft.id,
          chain_id: nft.chain_id,
          contract_address: nft.contract_address,
          token_id: nft.token_id,
          mint_price_eth: editValues.mint_price_eth,
          mint_fee_eth: editValues.mint_fee_eth,
          is_featured: editValues.is_featured,
          is_listed: editValues.is_listed,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setNfts(prev =>
          prev.map(n =>
            n.id === nft.id
              ? {
                  ...n,
                  mint_price_eth: editValues.mint_price_eth,
                  mint_fee_eth: editValues.mint_fee_eth,
                  is_featured: editValues.is_featured,
                  is_listed: editValues.is_listed,
                }
              : n
          )
        );
        setSuccessId(nft.id);
        setTimeout(() => setSuccessId(null), 2000);
      }
    } catch (e) {
      console.error('Save failed:', e);
    }
    setSaving(null);
    setEditingId(null);
    setEditValues({});
  };

  /* ── Quick toggles ────────────────────────────────── */
  const quickToggle = async (nft, field) => {
    const newVal = !nft[field];
    try {
      const res = await fetch('/api/admin/nft/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cached_nft_id: nft.id,
          chain_id: nft.chain_id,
          contract_address: nft.contract_address,
          token_id: nft.token_id,
          mint_price_eth: nft.mint_price_eth,
          mint_fee_eth: nft.mint_fee_eth,
          is_featured: field === 'is_featured' ? newVal : nft.is_featured,
          is_listed: field === 'is_listed' ? newVal : nft.is_listed,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setNfts(prev => prev.map(n => n.id === nft.id ? { ...n, [field]: newVal } : n));
      }
    } catch (e) { console.error(e); }
  };

  /* ── Debounced search ─────────────────────────────── */
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const shortAddr = (addr) => addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '—';
  const chainLabel = (id) => CHAIN_LABELS[id] || `Chain ${id}`;

  return (
    <div className="space-y-6">
      {/* ═══ SYNC CARD ═══════════════════════════════════ */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-display font-semibold text-text text-lg">Reload NFTs from Alchemy</h3>
            <p className="text-xs text-muted mt-1">
              Fetches all active seed sources from <code className="text-accent/80">nft_seed_sources</code>, syncs metadata via Alchemy,
              upserts into <code className="text-accent/80">cached_nfts</code> and ensures pricing rows exist.
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={handleSync}
            disabled={syncing}
            className="shrink-0 min-w-[180px] !py-3 !text-base font-bold"
          >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Reload NFTs'}
          </Button>
        </div>

        {/* Sync result */}
        {syncResult && (
          <div className={`mt-4 p-4 rounded-xl border ${syncResult.error ? 'bg-danger/5 border-danger/20' : 'bg-success/5 border-success/20'}`}>
            {syncResult.error ? (
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-danger mt-0.5 shrink-0" />
                <p className="text-sm text-danger">{syncResult.error}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-success" />
                  <span className="text-sm font-medium text-success">Sync completed successfully</span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted">
                  <span>Seeds: <strong className="text-text">{syncResult.seedsUsed}</strong></span>
                  <span>NFTs synced: <strong className="text-text">{syncResult.totalInserted}</strong></span>
                  <span>Errors: <strong className={syncResult.errors?.length ? 'text-warning' : 'text-text'}>{syncResult.errors?.length || 0}</strong></span>
                  <span className="font-mono text-muted-dim">Batch: {syncResult.batchId}</span>
                </div>
                {syncResult.errors?.length > 0 && (
                  <div className="mt-2 p-2 rounded-lg bg-warning/5 border border-warning/10">
                    <p className="text-[11px] text-warning font-medium mb-1">Errors:</p>
                    {syncResult.errors.map((err, i) => (
                      <p key={i} className="text-[11px] text-muted-dim font-mono">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Last sync info */}
        {lastSync && (
          <div className="mt-3 flex items-center gap-3 text-xs text-muted">
            <Clock size={12} />
            <span>
              Last sync: <strong className="text-text">{new Date(lastSync.started_at).toLocaleString()}</strong>
              {' — '}
              <Badge color={lastSync.status === 'completed' ? 'success' : lastSync.status === 'running' ? 'warning' : 'danger'} className="!text-[10px]">
                {lastSync.status}
              </Badge>
              {' — '}
              {lastSync.nfts_inserted || 0} NFTs, {lastSync.seeds_total || 0} seeds
            </span>
          </div>
        )}
      </Card>

      {/* ═══ FILTERS ═════════════════════════════════════ */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-dim" />
            <input
              type="text"
              placeholder="Search name, collection, contract, token ID…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface2/50 border border-border-light rounded-xl text-sm text-text placeholder:text-muted-dim focus:outline-none focus:border-accent/40"
            />
          </div>

          {/* Chain filter */}
          <select
            value={chainFilter}
            onChange={(e) => { setChainFilter(e.target.value); setPage(1); }}
            className="bg-surface2/50 border border-border-light rounded-xl px-3 py-2 text-sm text-text focus:outline-none"
          >
            <option value="">All Chains</option>
            <option value="8453">Base</option>
            <option value="1">Ethereum</option>
            <option value="84532">Base Sepolia</option>
          </select>

          {/* Featured filter */}
          <select
            value={featuredFilter}
            onChange={(e) => { setFeaturedFilter(e.target.value); setPage(1); }}
            className="bg-surface2/50 border border-border-light rounded-xl px-3 py-2 text-sm text-text focus:outline-none"
          >
            <option value="">Featured: All</option>
            <option value="true">Featured Only</option>
            <option value="false">Not Featured</option>
          </select>

          {/* Listed filter */}
          <select
            value={listedFilter}
            onChange={(e) => { setListedFilter(e.target.value); setPage(1); }}
            className="bg-surface2/50 border border-border-light rounded-xl px-3 py-2 text-sm text-text focus:outline-none"
          >
            <option value="">Listed: All</option>
            <option value="true">Listed Only</option>
            <option value="false">Hidden Only</option>
          </select>

          <Badge color="accent" className="shrink-0">{total} total</Badge>
        </div>
      </Card>

      {/* ═══ NFT TABLE ═══════════════════════════════════ */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 size={28} className="animate-spin text-accent mx-auto" />
            <p className="text-sm text-muted mt-3">Loading NFTs…</p>
          </div>
        ) : nfts.length === 0 ? (
          <div className="p-16 text-center">
            <ImageIcon size={32} className="text-muted-dim mx-auto mb-3" />
            <p className="text-sm text-muted">No NFTs found. Try syncing or adjusting filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light bg-surface/50">
                  <th className="text-left text-[10px] text-muted-dim font-medium px-4 py-2.5 uppercase tracking-wider w-10"></th>
                  <th className="text-left text-[10px] text-muted-dim font-medium px-4 py-2.5 uppercase tracking-wider">Name</th>
                  <th className="text-left text-[10px] text-muted-dim font-medium px-4 py-2.5 uppercase tracking-wider hidden lg:table-cell">Collection</th>
                  <th className="text-left text-[10px] text-muted-dim font-medium px-4 py-2.5 uppercase tracking-wider hidden md:table-cell">Chain</th>
                  <th className="text-left text-[10px] text-muted-dim font-medium px-4 py-2.5 uppercase tracking-wider hidden xl:table-cell">Contract</th>
                  <th className="text-left text-[10px] text-muted-dim font-medium px-4 py-2.5 uppercase tracking-wider">Token ID</th>
                  <th className="text-left text-[10px] text-muted-dim font-medium px-4 py-2.5 uppercase tracking-wider">Price</th>
                  <th className="text-left text-[10px] text-muted-dim font-medium px-4 py-2.5 uppercase tracking-wider">Fee</th>
                  <th className="text-center text-[10px] text-muted-dim font-medium px-4 py-2.5 uppercase tracking-wider">Featured</th>
                  <th className="text-center text-[10px] text-muted-dim font-medium px-4 py-2.5 uppercase tracking-wider">Listed</th>
                  <th className="text-left text-[10px] text-muted-dim font-medium px-4 py-2.5 uppercase tracking-wider hidden xl:table-cell">Synced</th>
                  <th className="text-right text-[10px] text-muted-dim font-medium px-4 py-2.5 uppercase tracking-wider w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {nfts.map((nft) => {
                  const isEditing = editingId === nft.id;
                  const isSuccess = successId === nft.id;
                  return (
                    <tr
                      key={nft.id}
                      className={`border-b border-border-light last:border-0 hover:bg-white/[0.02] transition-colors ${isSuccess ? 'bg-success/5' : ''}`}
                    >
                      {/* Image */}
                      <td className="px-4 py-2">
                        {nft.image_url ? (
                          <img
                            src={nft.image_url}
                            alt=""
                            className="w-9 h-9 rounded-lg object-cover bg-surface2"
                            loading="lazy"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-surface2 flex items-center justify-center">
                            <ImageIcon size={14} className="text-muted-dim" />
                          </div>
                        )}
                      </td>

                      {/* Name */}
                      <td className="px-4 py-2">
                        <p className="text-text font-medium truncate max-w-[180px]">{nft.name || '—'}</p>
                      </td>

                      {/* Collection */}
                      <td className="px-4 py-2 hidden lg:table-cell">
                        <p className="text-muted truncate max-w-[140px]">{nft.collection_name || '—'}</p>
                      </td>

                      {/* Chain */}
                      <td className="px-4 py-2 hidden md:table-cell">
                        <Badge color={nft.chain_id === 8453 ? 'accent' : nft.chain_id === 1 ? 'violet' : 'default'} className="!text-[10px]">
                          {chainLabel(nft.chain_id)}
                        </Badge>
                      </td>

                      {/* Contract */}
                      <td className="px-4 py-2 hidden xl:table-cell">
                        <span className="font-mono text-[11px] text-muted-dim">{shortAddr(nft.contract_address)}</span>
                      </td>

                      {/* Token ID */}
                      <td className="px-4 py-2">
                        <span className="font-mono text-[11px] text-muted">{nft.token_id?.length > 8 ? nft.token_id.slice(0, 8) + '…' : nft.token_id}</span>
                      </td>

                      {/* Mint Price */}
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.001"
                            value={editValues.mint_price_eth}
                            onChange={(e) => setEditValues(v => ({ ...v, mint_price_eth: e.target.value }))}
                            className="w-20 bg-surface2/80 border border-accent/30 rounded-lg px-2 py-1 text-xs font-mono text-text focus:outline-none focus:border-accent"
                          />
                        ) : (
                          <span className="font-mono text-accent text-xs">{Number(nft.mint_price_eth).toFixed(4)}</span>
                        )}
                      </td>

                      {/* Mint Fee */}
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.001"
                            value={editValues.mint_fee_eth}
                            onChange={(e) => setEditValues(v => ({ ...v, mint_fee_eth: e.target.value }))}
                            className="w-20 bg-surface2/80 border border-accent/30 rounded-lg px-2 py-1 text-xs font-mono text-text focus:outline-none focus:border-accent"
                          />
                        ) : (
                          <span className="font-mono text-muted text-xs">{Number(nft.mint_fee_eth).toFixed(4)}</span>
                        )}
                      </td>

                      {/* Featured toggle */}
                      <td className="px-4 py-2 text-center">
                        {isEditing ? (
                          <button onClick={() => setEditValues(v => ({ ...v, is_featured: !v.is_featured }))}>
                            <Star size={16} className={editValues.is_featured ? 'text-warning fill-warning' : 'text-muted-dim'} />
                          </button>
                        ) : (
                          <button onClick={() => quickToggle(nft, 'is_featured')}>
                            <Star size={16} className={nft.is_featured ? 'text-warning fill-warning' : 'text-muted-dim hover:text-warning/50'} />
                          </button>
                        )}
                      </td>

                      {/* Listed toggle */}
                      <td className="px-4 py-2 text-center">
                        {isEditing ? (
                          <button onClick={() => setEditValues(v => ({ ...v, is_listed: !v.is_listed }))}>
                            {editValues.is_listed ? <Eye size={16} className="text-success" /> : <EyeOff size={16} className="text-muted-dim" />}
                          </button>
                        ) : (
                          <button onClick={() => quickToggle(nft, 'is_listed')}>
                            {nft.is_listed ? <Eye size={16} className="text-success hover:text-success/70" /> : <EyeOff size={16} className="text-muted-dim hover:text-muted" />}
                          </button>
                        )}
                      </td>

                      {/* Synced at */}
                      <td className="px-4 py-2 hidden xl:table-cell">
                        <span className="text-[11px] text-muted-dim">
                          {nft.synced_at ? new Date(nft.synced_at).toLocaleDateString() : '—'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => saveEdit(nft)}
                              disabled={saving === nft.id}
                              className="p-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                            >
                              {saving === nft.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(nft)}
                            className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                          >
                            <Edit3 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border-light">
            <p className="text-xs text-muted">
              Page {page} of {totalPages} · {total} NFTs
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg text-muted hover:text-text disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {/* Page buttons */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p;
                if (totalPages <= 5) p = i + 1;
                else if (page <= 3) p = i + 1;
                else if (page >= totalPages - 2) p = totalPages - 4 + i;
                else p = page - 2 + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      p === page ? 'bg-accent/10 text-accent' : 'text-muted hover:text-text hover:bg-white/[0.04]'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg text-muted hover:text-text disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
