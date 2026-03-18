'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Save, Loader2, Check, X, Edit3, Tag, ToggleLeft, ToggleRight,
  Layers, DollarSign, ArrowRight, AlertTriangle, RefreshCw,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';

export default function NFTPriceManager() {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ price_eth: '', minting_fee_eth: '', is_listed: true });
  const [saving, setSaving] = useState(null);
  const [successId, setSuccessId] = useState(null);
  const [error, setError] = useState('');

  // Global fee
  const [globalFee, setGlobalFee] = useState('0.002');
  const [globalFeeUsd, setGlobalFeeUsd] = useState('');
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [ethPrice, setEthPrice] = useState(null);
  const [loadingEthPrice, setLoadingEthPrice] = useState(true);

  // Bulk scale
  const [bulkMin, setBulkMin] = useState('0.002');
  const [bulkMax, setBulkMax] = useState('0.01');
  const [bulkFee, setBulkFee] = useState('0.001');
  const [bulkListed, setBulkListed] = useState(true);
  const [savingBulk, setSavingBulk] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState(null);

  // Fetch ETH price
  const fetchEthPrice = useCallback(async () => {
    setLoadingEthPrice(true);
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', { next: { revalidate: 120 } });
      const data = await res.json();
      if (data?.ethereum?.usd) setEthPrice(data.ethereum.usd);
    } catch {
      // Fallback: try alternative
      try {
        const res2 = await fetch('https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD');
        const data2 = await res2.json();
        if (data2?.USD) setEthPrice(data2.USD);
      } catch { /* silent */ }
    }
    setLoadingEthPrice(false);
  }, []);

  const usdToEth = (usd) => {
    if (!ethPrice || !usd) return '';
    return (parseFloat(usd) / ethPrice).toFixed(6);
  };
  const ethToUsd = (eth) => {
    if (!ethPrice || !eth) return '';
    return (parseFloat(eth) * ethPrice).toFixed(2);
  };

  const fetchPrices = useCallback(async () => {
    try {
      setError('');
      const res = await fetch('/api/admin/nft-prices', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`);
      setPrices(Array.isArray(data.prices) ? data.prices : []);
    } catch (e) { setError(e?.message || 'Failed to load prices'); }
    finally { setLoading(false); }
  }, []);

  const fetchGlobalFee = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings', { cache: 'no-store' });
      const data = await res.json();
      if (data.settings?.minting_fee != null) setGlobalFee(String(data.settings.minting_fee));
    } catch {}
  }, []);

  useEffect(() => { fetchPrices(); fetchGlobalFee(); fetchEthPrice(); }, [fetchPrices, fetchGlobalFee, fetchEthPrice]);

  // Sync USD field when global fee changes
  useEffect(() => { if (ethPrice && globalFee) setGlobalFeeUsd(ethToUsd(globalFee)); }, [ethPrice, globalFee]);

  const handleEdit = (nft) => {
    setError(''); setEditingId(nft.nft_id);
    setEditValues({ price_eth: nft.price_eth, minting_fee_eth: nft.minting_fee_eth, is_listed: nft.is_listed });
  };

  const handleSave = async (nftId) => {
    setSaving(nftId); setError('');
    try {
      const nft = prices.find(p => p.nft_id === nftId);
      const res = await fetch('/api/admin/nft-prices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nft_id: nftId, cached_nft_id: nft?.cached_nft_id,
          chain_id: nft?.chain_id || 8453, contract_address: nft?.contract_address,
          token_id: nft?.token_id,
          price_eth: Number(editValues.price_eth), minting_fee_eth: Number(editValues.minting_fee_eth),
          is_listed: !!editValues.is_listed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Save failed (${res.status})`);
      await fetchPrices(); setSuccessId(nftId); setEditingId(null);
      setTimeout(() => setSuccessId(null), 2000);
    } catch (e) { setError(e?.message || 'Failed to save'); }
    finally { setSaving(null); }
  };

  const handleSaveGlobalFee = async () => {
    setSavingGlobal(true); setError('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'minting_fee', value: globalFee }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d?.error || 'Failed'); }
      await fetchGlobalFee();
    } catch (e) { setError(e?.message || 'Failed to save'); }
    finally { setSavingGlobal(false); }
  };

  const handleBulkApply = async () => {
    setSavingBulk(true); setError(''); setBulkSuccess(null);
    try {
      const res = await fetch('/api/admin/nft-prices', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulk: true, min_price: bulkMin, max_price: bulkMax,
          mint_fee: bulkFee, is_listed: bulkListed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Bulk update failed');
      setBulkSuccess(`Updated ${data.updated || 0} NFTs`);
      await fetchPrices();
      setTimeout(() => setBulkSuccess(null), 4000);
    } catch (e) { setError(e?.message || 'Bulk update failed'); }
    finally { setSavingBulk(false); }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />{error}
        </div>
      )}

      {/* ── GLOBAL MINT FEE (with USD conversion) ── */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><Tag size={18} className="text-accent" /></div>
          <div className="flex-1">
            <h3 className="font-display font-semibold text-text">Global Minting Fee</h3>
            <p className="text-xs text-muted">Default fee applied to all new mints</p>
          </div>
          {ethPrice && (
            <div className="text-right">
              <p className="text-xs text-muted-dim">ETH Price</p>
              <div className="flex items-center gap-1">
                <span className="text-sm font-mono font-medium text-accent">${ethPrice.toLocaleString()}</span>
                <button onClick={fetchEthPrice} className="text-muted-dim hover:text-accent transition-colors" title="Refresh"><RefreshCw size={10} /></button>
              </div>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted">Fee in USD ($)</label>
            <div className="relative">
              <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-dim" />
              <input type="number" step="0.01" min="0" value={globalFeeUsd}
                onChange={(e) => { setGlobalFeeUsd(e.target.value); if (ethPrice && e.target.value) setGlobalFee(usdToEth(e.target.value)); }}
                placeholder={loadingEthPrice ? 'Loading...' : '5.00'}
                disabled={!ethPrice}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-surface2/60 border border-border-light text-text placeholder:text-muted-dim focus:outline-none focus:border-accent/50 text-sm font-mono"
              />
            </div>
            {!ethPrice && !loadingEthPrice && <p className="text-[10px] text-warning">Could not fetch ETH price</p>}
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted">Fee in ETH</label>
            <div className="flex gap-2">
              <input type="number" step="0.001" min="0" value={globalFee}
                onChange={(e) => { setGlobalFee(e.target.value); if (ethPrice && e.target.value) setGlobalFeeUsd(ethToUsd(e.target.value)); }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-surface2/60 border border-border-light text-text focus:outline-none focus:border-accent/50 text-sm font-mono"
              />
              <Button variant="primary" size="md" onClick={handleSaveGlobalFee} disabled={savingGlobal}>
                {savingGlobal ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
              </Button>
            </div>
          </div>
        </div>
        {ethPrice && globalFee && (
          <p className="text-[11px] text-muted-dim mt-2">
            {globalFee} ETH ≈ ${ethToUsd(globalFee)} USD at current rate
          </p>
        )}
      </Card>

      {/* ── BULK SCALE PRICING ── */}
      <Card className="p-6 border-accent-violet/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent-violet/10 flex items-center justify-center"><Layers size={18} className="text-accent-violet" /></div>
          <div>
            <h3 className="font-display font-semibold text-text">Bulk Price Scale</h3>
            <p className="text-xs text-muted">Set all NFT prices to a range at once (e.g. 4–10 ETH)</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted">Min Price (ETH)</label>
            <input type="number" step="0.001" min="0" value={bulkMin} onChange={(e) => setBulkMin(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-surface2/60 border border-border-light text-text focus:outline-none focus:border-accent-violet/50 text-sm font-mono" />
            {ethPrice && <p className="text-[10px] text-muted-dim">≈ ${ethToUsd(bulkMin)}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted">Max Price (ETH)</label>
            <input type="number" step="0.001" min="0" value={bulkMax} onChange={(e) => setBulkMax(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-surface2/60 border border-border-light text-text focus:outline-none focus:border-accent-violet/50 text-sm font-mono" />
            {ethPrice && <p className="text-[10px] text-muted-dim">≈ ${ethToUsd(bulkMax)}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted">Mint Fee (ETH)</label>
            <input type="number" step="0.001" min="0" value={bulkFee} onChange={(e) => setBulkFee(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-surface2/60 border border-border-light text-text focus:outline-none focus:border-accent-violet/50 text-sm font-mono" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-muted">Listed</label>
            <button onClick={() => setBulkListed(!bulkListed)} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface2/60 border border-border-light w-full">
              {bulkListed ? <ToggleRight size={20} className="text-success" /> : <ToggleLeft size={20} className="text-muted-dim" />}
              <span className="text-sm">{bulkListed ? 'Yes' : 'No'}</span>
            </button>
          </div>
        </div>

        <div className="mt-4 bg-surface2/30 rounded-xl p-3 text-xs text-muted">
          Each NFT will get a random price between <span className="font-mono text-accent">{bulkMin}</span> and <span className="font-mono text-accent">{bulkMax}</span> ETH.
          {bulkMin === bulkMax && <span className="text-warning ml-1">(Same min/max = fixed price for all)</span>}
          {ethPrice && <span className="ml-1">Range: ${ethToUsd(bulkMin)} – ${ethToUsd(bulkMax)} USD</span>}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <Button variant="primary" size="md" onClick={handleBulkApply} disabled={savingBulk}>
            {savingBulk ? <><Loader2 size={14} className="animate-spin" /> Applying...</> : <><Layers size={14} /> Apply to All NFTs</>}
          </Button>
          {bulkSuccess && <Badge color="success">{bulkSuccess}</Badge>}
        </div>
      </Card>

      {/* ── PER-NFT PRICING TABLE ── */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b border-border-light flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-text">Individual NFT Pricing</h3>
            <p className="text-xs text-muted mt-0.5">Fine-tune price per NFT</p>
          </div>
          <Badge color="accent">{prices.length} NFTs</Badge>
        </div>

        {loading ? (
          <div className="p-12 text-center"><Loader2 size={24} className="animate-spin text-accent mx-auto" /><p className="text-sm text-muted mt-3">Loading prices...</p></div>
        ) : prices.length === 0 ? (
          <div className="p-12 text-center"><Tag size={28} className="mx-auto mb-3 text-muted-dim" /><p className="text-sm text-muted">No NFTs found. Sync NFTs first.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">NFT</th>
                  <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Price (ETH)</th>
                  <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Mint Fee</th>
                  <th className="text-left text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Listed</th>
                  <th className="text-right text-[11px] text-muted-dim font-medium px-5 py-3 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((nft) => (
                  <tr key={nft.nft_id} className={`border-b border-border-light last:border-0 hover:bg-white/[0.02] transition-colors ${successId === nft.nft_id ? 'bg-success/5' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {nft.image_url && <div className="w-8 h-8 rounded-lg overflow-hidden bg-surface2 shrink-0"><img src={nft.image_url} alt="" className="w-full h-full object-cover" /></div>}
                        <div><p className="text-text font-medium truncate max-w-[180px]">{nft.name}</p><p className="text-[10px] text-muted-dim truncate max-w-[160px]">{nft.collection_name}</p></div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {editingId === nft.nft_id ? (
                        <div>
                          <input type="number" step="0.001" value={editValues.price_eth}
                            onChange={(e) => setEditValues((v) => ({ ...v, price_eth: e.target.value }))}
                            className="w-24 bg-surface2/80 border border-accent/30 rounded-lg px-2.5 py-1.5 text-xs font-mono text-text focus:outline-none" />
                          {ethPrice && <p className="text-[9px] text-muted-dim mt-0.5">≈ ${ethToUsd(editValues.price_eth)}</p>}
                        </div>
                      ) : (
                        <div><span className="font-mono text-accent">{Number(nft.price_eth).toFixed(4)}</span>
                          {ethPrice && <p className="text-[9px] text-muted-dim">≈ ${ethToUsd(nft.price_eth)}</p>}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {editingId === nft.nft_id ? (
                        <input type="number" step="0.001" value={editValues.minting_fee_eth}
                          onChange={(e) => setEditValues((v) => ({ ...v, minting_fee_eth: e.target.value }))}
                          className="w-24 bg-surface2/80 border border-accent/30 rounded-lg px-2.5 py-1.5 text-xs font-mono text-text focus:outline-none" />
                      ) : (<span className="font-mono text-muted">{Number(nft.minting_fee_eth).toFixed(4)}</span>)}
                    </td>
                    <td className="px-5 py-3">
                      {editingId === nft.nft_id ? (
                        <button onClick={() => setEditValues((v) => ({ ...v, is_listed: !v.is_listed }))} className="flex items-center gap-1.5">
                          {editValues.is_listed ? <ToggleRight size={20} className="text-success" /> : <ToggleLeft size={20} className="text-muted-dim" />}
                        </button>
                      ) : (<Badge color={nft.is_listed ? 'success' : 'default'}>{nft.is_listed ? 'Listed' : 'Hidden'}</Badge>)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {editingId === nft.nft_id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => handleSave(nft.nft_id)} disabled={saving === nft.nft_id} className="p-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors">
                            {saving === nft.nft_id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          </button>
                          <button onClick={() => { setEditingId(null); setError(''); }} className="p-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors"><X size={14} /></button>
                        </div>
                      ) : (
                        <button onClick={() => handleEdit(nft)} className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-colors"><Edit3 size={14} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
