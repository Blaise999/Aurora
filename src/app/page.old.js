'use client';
import { useState } from 'react';
import { Layers, DollarSign, Activity as ActivityIcon, BarChart3 } from 'lucide-react';
import AdminShell from '@/components/admin/AdminShell';
import AdminStatCard from '@/components/admin/AdminStatCard';
import SettingsForm from '@/components/admin/SettingsForm';
import UploadDropzone from '@/components/admin/UploadDropzone';
import ActivityLog from '@/components/admin/ActivityLog';
import NFTPriceManager from '@/components/admin/NFTPriceManager';
import VisitorTracker from '@/components/admin/VisitorTracker';
import SupportInbox from '@/components/admin/SupportInbox';
import Card from '@/components/ui/Card';

function OverviewTab() {
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <AdminStatCard label="Total Minted" value="4,237" sub="of 10,000" trend="+127 today" icon={<Layers size={18} />} color="accent" />
        <AdminStatCard label="Mint Price" value="0.08 ETH" sub="approx $307.78" icon={<DollarSign size={18} />} color="violet" />
        <AdminStatCard label="Sale State" value="Live" sub="Since Dec 1, 2024" icon={<ActivityIcon size={18} />} color="success" />
        <AdminStatCard label="Revenue" value="338.96 ETH" sub="approx $1.30M" trend="+10.16 ETH" icon={<BarChart3 size={18} />} color="warning" />
      </div>

      <Card className="overflow-hidden">
        <div className="p-5 border-b border-border-light">
          <h3 className="font-display font-semibold text-text">Recent Mints</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light">
                <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Token ID</th>
                <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Minter</th>
                <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Qty</th>
                <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Price</th>
                <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: '#4237', minter: '0x7B2e...4f1A', qty: 2, price: '0.16 ETH', time: '3 min ago' },
                { id: '#4235', minter: '0xC9d3...2e7F', qty: 1, price: '0.08 ETH', time: '8 min ago' },
                { id: '#4234', minter: '0x1D4a...9b3E', qty: 5, price: '0.40 ETH', time: '14 min ago' },
                { id: '#4229', minter: '0x8E7f...2c1B', qty: 3, price: '0.24 ETH', time: '21 min ago' },
                { id: '#4226', minter: '0xA3f1...8c2D', qty: 1, price: '0.08 ETH', time: '35 min ago' },
                { id: '#4225', minter: '0xF2b7...1d3C', qty: 2, price: '0.16 ETH', time: '42 min ago' },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border-light last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 font-mono text-accent">{row.id}</td>
                  <td className="px-5 py-3 font-mono text-text">{row.minter}</td>
                  <td className="px-5 py-3 font-mono text-muted">{row.qty}</td>
                  <td className="px-5 py-3 font-mono text-text">{row.price}</td>
                  <td className="px-5 py-3 text-muted-dim">{row.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-display font-semibold text-text">Mint Velocity</h3>
        <div className="h-48 flex items-end gap-1.5">
          {Array.from({ length: 24 }).map((_, i) => {
            const h = 15 + Math.random() * 85;
            return (
              <div key={i} className="flex-1 flex flex-col justify-end">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-accent/60 to-accent/20 transition-all duration-300 hover:from-accent hover:to-accent/40"
                  style={{ height: h + '%' }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-muted-dim font-mono">
          <span>24h ago</span>
          <span>12h ago</span>
          <span>Now</span>
        </div>
      </Card>
    </div>
  );
}

function AnalyticsTab() {
  return (
    <div className="space-y-6">
      <Card className="p-5 space-y-4">
        <h3 className="font-display font-semibold text-text">Cumulative Mints</h3>
        <div className="h-56 relative">
          <svg viewBox="0 0 400 160" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00E5FF" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
              <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,140 C30,135 60,120 100,100 C140,80 180,85 220,60 C260,35 300,30 340,20 C370,12 390,8 400,5" fill="none" stroke="url(#lineGrad)" strokeWidth="2" />
            <path d="M0,140 C30,135 60,120 100,100 C140,80 180,85 220,60 C260,35 300,30 340,20 C370,12 390,8 400,5 L400,160 L0,160 Z" fill="url(#areaGrad)" />
          </svg>
        </div>
      </Card>
      <Card className="p-5 space-y-4">
        <h3 className="font-display font-semibold text-text">Mints by Day</h3>
        <div className="h-40 flex items-end gap-2">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day) => {
            const h = 25 + Math.random() * 75;
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full rounded-lg bg-accent-violet/40 hover:bg-accent-violet/60 transition-colors" style={{ height: h + '%' }} />
                <span className="text-[10px] text-muted-dim">{day}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState('overview');

  const content = {
    overview: <OverviewTab />,
    pricing: <NFTPriceManager />,
    settings: <SettingsForm />,
    visitors: <VisitorTracker />,
    support: <SupportInbox />,
    allowlist: <UploadDropzone />,
    analytics: <AnalyticsTab />,
    activity: <ActivityLog />,
  };

  return (
    <AdminShell activeTab={tab} onTabChange={setTab}>
      {content[tab] || <OverviewTab />}
    </AdminShell>
  );
}
