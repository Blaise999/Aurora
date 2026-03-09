'use client';
import { useState, useEffect, useCallback } from 'react';
import { Globe, MapPin, Monitor, Clock, RefreshCw, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { getSupabaseBrowser } from '@/lib/db/supabase-browser';

export default function VisitorTracker() {
  const [visitors, setVisitors] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [liveCount, setLiveCount] = useState(0);
  const limit = 20;

  const fetchVisitors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/visitors?limit=' + limit + '&offset=' + (page * limit));
      const data = await res.json();
      if (data.visitors) setVisitors(data.visitors);
      if (data.total != null) setTotal(data.total);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchVisitors(); }, [fetchVisitors]);

  // Realtime new visitor subscription
  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) return;

    const channel = sb.channel('admin-visitors')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'visitor_logs',
      }, (payload) => {
        if (page === 0) {
          setVisitors(prev => [payload.new, ...prev].slice(0, limit));
          setTotal(prev => prev + 1);
        }
        setLiveCount(prev => prev + 1);
      })
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [page]);

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Globe size={18} className="text-accent" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-text">{total}</p>
              <p className="text-xs text-muted">Total Visitors</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-text">{liveCount}</p>
              <p className="text-xs text-muted">Live (this session)</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-violet/10 flex items-center justify-center">
              <MapPin size={18} className="text-accent-violet" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-text">
                {new Set(visitors.map(v => v.country).filter(Boolean)).size}
              </p>
              <p className="text-xs text-muted">Countries</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Visitor table */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b border-border-light flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-display font-semibold text-text">Visitor Log</h3>
            <Badge color="success" dot>Live</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchVisitors}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 size={24} className="animate-spin text-accent mx-auto" />
          </div>
        ) : visitors.length === 0 ? (
          <div className="p-12 text-center text-muted text-sm">No visitors yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">IP Address</th>
                  <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Location</th>
                  <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">ISP</th>
                  <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Page</th>
                  <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((v) => (
                  <tr key={v.id} className="border-b border-border-light last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-mono text-accent text-xs">{v.ip_address}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-muted-dim" />
                        <span className="text-text">{[v.city, v.region, v.country].filter(Boolean).join(', ') || 'Unknown'}</span>
                      </div>
                      {v.latitude && v.longitude && (
                        <p className="text-[10px] text-muted-dim font-mono mt-0.5">{v.latitude}, {v.longitude}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted">{v.isp || '—'}</td>
                    <td className="px-5 py-3">
                      <Badge color="default">{v.page_path || '/'}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 text-muted-dim">
                        <Clock size={12} />
                        <span className="text-xs">{timeAgo(v.visited_at)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border-light flex items-center justify-between">
            <p className="text-xs text-muted-dim">Page {page + 1} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg text-muted hover:text-text hover:bg-white/[0.04] disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg text-muted hover:text-text hover:bg-white/[0.04] disabled:opacity-30 transition-colors"
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
