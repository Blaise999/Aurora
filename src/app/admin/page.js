'use client';
import { useState } from 'react';
import { Layers, DollarSign, Activity as ActivityIcon, BarChart3, RefreshCw } from 'lucide-react';
import AdminShell from '@/components/admin/AdminShell';
import AdminStatCard from '@/components/admin/AdminStatCard';
import SettingsForm from '@/components/admin/SettingsForm';
import UploadDropzone from '@/components/admin/UploadDropzone';
import ActivityLog from '@/components/admin/ActivityLog';
import NFTPriceManager from '@/components/admin/NFTPriceManager';
import AdminNFTManager from '@/components/admin/AdminNFTManager';
import VisitorTracker from '@/components/admin/VisitorTracker';
import SupportInbox from '@/components/admin/SupportInbox';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

function OverviewTab() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const handleSync = async () => {
    setSyncing(true); setSyncResult(null);
    try {
      const res = await fetch('/api/admin/nft/sync', { method: 'POST' });
      const data = await res.json();
      setSyncResult(data);
    } catch (e) { setSyncResult({ error: e.message }); }
    setSyncing(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <AdminStatCard label="Total Minted" value="4,237" sub="of 10,000" trend="+127 today" icon={<Layers size={18}/>} color="accent" />
        <AdminStatCard label="Mint Price" value="0.08 ETH" sub="approx $307.78" icon={<DollarSign size={18}/>} color="violet" />
        <AdminStatCard label="Sale State" value="Live" sub="Since Dec 1, 2024" icon={<ActivityIcon size={18}/>} color="success" />
        <AdminStatCard label="Revenue" value="338.96 ETH" sub="approx $1.30M" trend="+10.16 ETH" icon={<BarChart3 size={18}/>} color="warning" />
      </div>

      {/* Quick Sync Trigger */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-text">NFT Cache Sync</h3>
            <p className="text-xs text-muted mt-0.5">Quick sync from overview. For full management go to "NFTs & Sync" tab.</p>
          </div>
          <Button variant="primary" size="md" onClick={handleSync} disabled={syncing}>
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
        {syncResult && (
          <div className="mt-4 p-3 rounded-xl bg-surface2/50 text-sm">
            {syncResult.error ? (
              <p className="text-danger">Error: {syncResult.error}</p>
            ) : (
              <div className="flex items-center gap-3">
                <Badge color="success">{syncResult.totalInserted} NFTs cached</Badge>
                <Badge color="accent">{syncResult.seedsUsed} seeds</Badge>
                {syncResult.errors?.length > 0 && <Badge color="warning">{syncResult.errors.length} errors</Badge>}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="p-5 border-b border-border-light"><h3 className="font-display font-semibold text-text">Recent Mints</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border-light">
              <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Token ID</th>
              <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Minter</th>
              <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Price</th>
              <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Time</th>
            </tr></thead>
            <tbody>
              {[{ id: '#4237', minter: '0x7B2e...4f1A', price: '0.16 ETH', time: '3 min ago' },
                { id: '#4235', minter: '0xC9d3...2e7F', price: '0.08 ETH', time: '8 min ago' },
                { id: '#4234', minter: '0x1D4a...9b3E', price: '0.40 ETH', time: '14 min ago' },
              ].map((r,i) => (
                <tr key={i} className="border-b border-border-light last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3 font-mono text-accent">{r.id}</td>
                  <td className="px-5 py-3 font-mono text-text">{r.minter}</td>
                  <td className="px-5 py-3 font-mono text-text">{r.price}</td>
                  <td className="px-5 py-3 text-muted-dim">{r.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState('overview');
  const content = {
    overview: <OverviewTab />,
    nfts: <AdminNFTManager />,
    pricing: <NFTPriceManager />,
    settings: <SettingsForm />,
    visitors: <VisitorTracker />,
    support: <SupportInbox />,
    allowlist: <UploadDropzone />,
    activity: <ActivityLog />,
  };
  return <AdminShell activeTab={tab} onTabChange={setTab}>{content[tab] || <OverviewTab />}</AdminShell>;
}
