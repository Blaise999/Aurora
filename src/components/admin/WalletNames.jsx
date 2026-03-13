'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Users, Wallet, Copy, Check, ExternalLink } from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { getExplorerUrl } from '@/lib/web3/contract';

export default function WalletNames() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(null);
  const explorerUrl = getExplorerUrl();

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/wallet-names');
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const handleCopy = (addr, id) => {
    navigator.clipboard.writeText(addr);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const filtered = profiles.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.first_name?.toLowerCase().includes(s)) ||
           (p.username?.toLowerCase().includes(s)) ||
           (p.email?.toLowerCase().includes(s)) ||
           (p.wallet_address?.toLowerCase().includes(s));
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg text-text flex items-center gap-2">
            <Users size={18} className="text-accent" /> Wallet Names
          </h2>
          <p className="text-xs text-muted mt-0.5">{profiles.length} registered users</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-dim" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, username, email, or wallet..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface2 border border-border-light text-text placeholder:text-muted-dim/50 focus:outline-none focus:border-accent/40 text-sm"
        />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light">
                <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">User</th>
                <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Username</th>
                <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Email</th>
                <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Wallet Address</th>
                <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Stats</th>
                <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12"><Loader2 size={20} className="animate-spin text-accent mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted">No users found</td></tr>
              ) : filtered.map((p) => (
                <tr key={p.id} className="border-b border-border-light last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent/20 to-accent-violet/20 flex items-center justify-center shrink-0">
                        <span className="font-display font-bold text-xs text-accent">{p.first_name?.[0]?.toUpperCase() || '?'}</span>
                      </div>
                      <span className="font-medium text-text">{p.first_name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {p.username ? <span className="font-mono text-accent text-xs">@{p.username}</span> : <span className="text-muted-dim">—</span>}
                  </td>
                  <td className="px-5 py-3 text-muted text-xs">{p.email || '—'}</td>
                  <td className="px-5 py-3">
                    {p.wallet_address ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-text">{p.wallet_address.slice(0, 6)}...{p.wallet_address.slice(-4)}</span>
                        <button onClick={() => handleCopy(p.wallet_address, p.id)} className="text-muted-dim hover:text-text">
                          {copied === p.id ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                        </button>
                        <a href={`${explorerUrl}/address/${p.wallet_address}`} target="_blank" rel="noopener noreferrer" className="text-muted-dim hover:text-accent">
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    ) : <span className="text-muted-dim text-xs">Not connected</span>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <Badge color="accent">{p.collectionCount || 0} NFTs</Badge>
                      <Badge color="violet">{p.mintCount || 0} mints</Badge>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-dim text-xs">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
