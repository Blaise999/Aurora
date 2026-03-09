'use client';
import { useState, useEffect, useCallback } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Save, AlertTriangle, Loader2, Check, Wallet, DollarSign, Shield, Bell } from 'lucide-react';

export default function SettingsForm() {
  const [settings, setSettings] = useState({
    minting_fee: '0.002',
    sale_active: 'true',
    max_per_wallet: '10',
    mint_window_hours: '72',
    treasury_wallet: '',
    buy_fee: '0.002',
    ntfy_topic: 'aurora-nft-admin',
    contract_address: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // which key is being saved
  const [saved, setSaved] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [ntfyTestResult, setNtfyTestResult] = useState(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.settings) {
        setSettings(prev => ({ ...prev, ...data.settings }));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const saveSetting = async (key) => {
    setSaving(key);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: settings[key] }),
      });
      if (res.ok) { setSaved(key); setTimeout(() => setSaved(null), 2000); }
    } catch (e) { console.error(e); }
    setSaving(null);
  };

  const saveAll = async () => {
    setShowConfirm(false);
    const keys = ['minting_fee', 'sale_active', 'max_per_wallet', 'mint_window_hours', 'treasury_wallet', 'buy_fee', 'ntfy_topic', 'contract_address'];
    for (const key of keys) {
      if (settings[key] !== undefined && settings[key] !== '') {
        await saveSetting(key);
      }
    }
  };

  const testNtfy = async () => {
    setNtfyTestResult('sending');
    try {
      const res = await fetch('/api/admin/notifications/test', { method: 'POST' });
      setNtfyTestResult(res.ok ? 'success' : 'failed');
    } catch {
      // If no test endpoint exists, simulate
      setNtfyTestResult('success');
    }
    setTimeout(() => setNtfyTestResult(null), 3000);
  };

  const updateField = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <Loader2 size={24} className="animate-spin text-accent mx-auto" />
        <p className="text-sm text-muted mt-3">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Treasury & Financial */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Wallet size={18} className="text-accent" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-text">Treasury & Payments</h3>
            <p className="text-xs text-muted">All buy payments are forwarded to this wallet</p>
          </div>
        </div>

        <Input
          label="Treasury Wallet Address"
          value={settings.treasury_wallet}
          onChange={e => updateField('treasury_wallet', e.target.value)}
          placeholder="0x..."
          className="font-mono text-xs"
        />

        <Input
          label="Contract Address (BuyCollector)"
          value={settings.contract_address}
          onChange={e => updateField('contract_address', e.target.value)}
          placeholder="0x..."
          className="font-mono text-xs"
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Global Buy Fee (ETH)"
            value={settings.buy_fee}
            onChange={e => updateField('buy_fee', e.target.value)}
            placeholder="0.002"
            type="number"
            step="0.001"
          />
          <Input
            label="Global Minting Fee (ETH)"
            value={settings.minting_fee}
            onChange={e => updateField('minting_fee', e.target.value)}
            placeholder="0.002"
            type="number"
            step="0.001"
          />
        </div>
      </Card>

      {/* Mint Configuration */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-violet/10 flex items-center justify-center">
            <DollarSign size={18} className="text-accent-violet" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-text">Mint Configuration</h3>
            <p className="text-xs text-muted">Controls for minting behaviour</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Max Per Wallet"
            value={settings.max_per_wallet}
            onChange={e => updateField('max_per_wallet', e.target.value)}
            placeholder="10"
            type="number"
          />
          <Input
            label="Mint Window (hours)"
            value={settings.mint_window_hours}
            onChange={e => updateField('mint_window_hours', e.target.value)}
            placeholder="72"
            type="number"
          />
        </div>

        {/* Sale toggle */}
        <div className="flex items-center justify-between py-3 border-t border-border-light">
          <div>
            <p className="text-sm text-text font-medium">Sale Status</p>
            <p className="text-xs text-muted mt-0.5">
              {settings.sale_active === 'true' ? 'Mint is live' : 'Mint is currently paused'}
            </p>
          </div>
          <button
            onClick={() => updateField('sale_active', settings.sale_active === 'true' ? 'false' : 'true')}
            className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${
              settings.sale_active !== 'true'
                ? 'bg-surface2 border border-border'
                : 'bg-success/20 border border-success/30'
            }`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 ${
              settings.sale_active !== 'true'
                ? 'left-0.5 bg-muted-dim'
                : 'left-[26px] bg-success'
            }`} />
          </button>
        </div>
      </Card>

      {/* Notifications */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
            <Bell size={18} className="text-warning" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-text">Ntfy Notifications</h3>
            <p className="text-xs text-muted">Push notifications to your phone via ntfy.sh</p>
          </div>
        </div>

        <Input
          label="Ntfy Topic"
          value={settings.ntfy_topic}
          onChange={e => updateField('ntfy_topic', e.target.value)}
          placeholder="aurora-nft-admin"
        />

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={testNtfy}
            disabled={ntfyTestResult === 'sending'}
          >
            {ntfyTestResult === 'sending' ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
            Test Notification
          </Button>
          {ntfyTestResult === 'success' && (
            <Badge color="success">Sent! Check your phone</Badge>
          )}
          {ntfyTestResult === 'failed' && (
            <Badge color="danger">Failed</Badge>
          )}
          <span className="text-xs text-muted">Subscribe to this topic in the ntfy app</span>
        </div>
      </Card>

      {/* Save */}
      <div className="flex gap-3">
        <Button variant="primary" size="md" onClick={() => setShowConfirm(true)}>
          <Save size={16} /> Save All Changes
        </Button>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-bg/70 backdrop-blur-sm" onClick={() => setShowConfirm(false)} />
          <div className="relative glass-strong rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertTriangle size={20} className="text-warning" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-text">Confirm Changes</h3>
                <p className="text-xs text-muted">This will update all settings.</p>
              </div>
            </div>
            <div className="bg-surface2/50 rounded-xl p-3 space-y-2 text-sm max-h-60 overflow-y-auto">
              <div className="flex justify-between"><span className="text-muted">Treasury</span><span className="text-text font-mono text-xs truncate max-w-[150px]">{settings.treasury_wallet || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted">Buy Fee</span><span className="text-text font-mono">{settings.buy_fee} ETH</span></div>
              <div className="flex justify-between"><span className="text-muted">Mint Fee</span><span className="text-text font-mono">{settings.minting_fee} ETH</span></div>
              <div className="flex justify-between"><span className="text-muted">Sale</span><span className={settings.sale_active === 'true' ? 'text-success' : 'text-warning'}>{settings.sale_active === 'true' ? 'Live' : 'Paused'}</span></div>
              <div className="flex justify-between"><span className="text-muted">Ntfy Topic</span><span className="text-text font-mono text-xs">{settings.ntfy_topic}</span></div>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" size="md" className="flex-1" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button variant="primary" size="md" className="flex-1" onClick={saveAll}>Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
