'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Save,
  Loader2,
  Check,
  X,
  Edit3,
  Tag,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';

export default function NFTPriceManager() {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({
    price_eth: '',
    minting_fee_eth: '',
    is_listed: true,
  });
  const [saving, setSaving] = useState(null);
  const [globalFee, setGlobalFee] = useState('0.002');
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [successId, setSuccessId] = useState(null);
  const [error, setError] = useState('');

  const fetchPrices = useCallback(async () => {
    try {
      setError('');

      const res = await fetch('/api/admin/nft-prices', {
        method: 'GET',
        cache: 'no-store',
      });

      const text = await res.text();
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Invalid JSON from /api/admin/nft-prices: ${text}`);
      }

      if (!res.ok) {
        throw new Error(data?.error || `Failed to load prices (${res.status})`);
      }

      setPrices(Array.isArray(data.prices) ? data.prices : []);
    } catch (e) {
      console.error('fetchPrices error:', e);
      setError(e?.message || 'Failed to load prices');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGlobalFee = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'GET',
        cache: 'no-store',
      });

      const text = await res.text();
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Invalid JSON from /api/admin/settings: ${text}`);
      }

      if (!res.ok) {
        throw new Error(data?.error || `Failed to load settings (${res.status})`);
      }

      if (data.settings?.minting_fee != null) {
        setGlobalFee(String(data.settings.minting_fee));
      }
    } catch (e) {
      console.error('fetchGlobalFee error:', e);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    fetchGlobalFee();
  }, [fetchPrices, fetchGlobalFee]);

  const handleEdit = (nft) => {
    setError('');
    setEditingId(nft.nft_id);
    setEditValues({
      price_eth: nft.price_eth,
      minting_fee_eth: nft.minting_fee_eth,
      is_listed: nft.is_listed,
    });
  };

  const handleSave = async (nftId) => {
    setSaving(nftId);
    setError('');

    try {
      const payload = {
        nft_id: nftId,
        price_eth: Number(editValues.price_eth),
        minting_fee_eth: Number(editValues.minting_fee_eth),
        is_listed: !!editValues.is_listed,
      };

      console.log('Saving NFT price payload:', payload);

      const res = await fetch('/api/admin/nft-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Invalid JSON from POST /api/admin/nft-prices: ${text}`);
      }

      console.log('POST /api/admin/nft-prices response:', res.status, data);

      if (!res.ok) {
        throw new Error(data?.error || `Save failed (${res.status})`);
      }

      await fetchPrices();
      setSuccessId(nftId);
      setEditingId(null);
      setTimeout(() => setSuccessId(null), 2000);
    } catch (e) {
      console.error('handleSave error:', e);
      setError(e?.message || 'Failed to save NFT price');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveGlobalFee = async () => {
    setSavingGlobal(true);
    setError('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          key: 'minting_fee',
          value: globalFee,
        }),
      });

      const text = await res.text();
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Invalid JSON from POST /api/admin/settings: ${text}`);
      }

      console.log('POST /api/admin/settings response:', res.status, data);

      if (!res.ok) {
        throw new Error(data?.error || `Global fee save failed (${res.status})`);
      }

      await fetchGlobalFee();
    } catch (e) {
      console.error('handleSaveGlobalFee error:', e);
      setError(e?.message || 'Failed to save global fee');
    } finally {
      setSavingGlobal(false);
    }
  };

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Tag size={18} className="text-accent" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-text">Global Minting Fee</h3>
            <p className="text-xs text-muted">Default fee applied to all new mints</p>
          </div>
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <Input
              label="Fee (ETH)"
              type="number"
              step="0.001"
              value={globalFee}
              onChange={(e) => setGlobalFee(e.target.value)}
            />
          </div>

          <Button variant="primary" size="md" onClick={handleSaveGlobalFee} disabled={savingGlobal}>
            {savingGlobal ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-5 border-b border-border-light flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-text">NFT Pricing</h3>
            <p className="text-xs text-muted mt-0.5">Set price and minting fee for each NFT</p>
          </div>
          <Badge color="accent">{prices.length} NFTs</Badge>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 size={24} className="animate-spin text-accent mx-auto" />
            <p className="text-sm text-muted mt-3">Loading prices...</p>
          </div>
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
                  <tr
                    key={nft.nft_id}
                    className={`border-b border-border-light last:border-0 hover:bg-white/[0.02] transition-colors ${
                      successId === nft.nft_id ? 'bg-success/5' : ''
                    }`}
                  >
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-text font-medium truncate max-w-[200px]">{nft.name}</p>
                        <p className="text-[10px] text-muted-dim font-mono">ID: {nft.nft_id}</p>
                      </div>
                    </td>

                    <td className="px-5 py-3">
                      {editingId === nft.nft_id ? (
                        <input
                          type="number"
                          step="0.001"
                          value={editValues.price_eth}
                          onChange={(e) =>
                            setEditValues((v) => ({ ...v, price_eth: e.target.value }))
                          }
                          className="w-24 bg-surface2/80 border border-accent/30 rounded-lg px-2.5 py-1.5 text-xs font-mono text-text focus:outline-none"
                        />
                      ) : (
                        <span className="font-mono text-accent">
                          {Number(nft.price_eth).toFixed(3)}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3">
                      {editingId === nft.nft_id ? (
                        <input
                          type="number"
                          step="0.001"
                          value={editValues.minting_fee_eth}
                          onChange={(e) =>
                            setEditValues((v) => ({ ...v, minting_fee_eth: e.target.value }))
                          }
                          className="w-24 bg-surface2/80 border border-accent/30 rounded-lg px-2.5 py-1.5 text-xs font-mono text-text focus:outline-none"
                        />
                      ) : (
                        <span className="font-mono text-muted">
                          {Number(nft.minting_fee_eth).toFixed(3)}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3">
                      {editingId === nft.nft_id ? (
                        <button
                          onClick={() =>
                            setEditValues((v) => ({ ...v, is_listed: !v.is_listed }))
                          }
                          className="flex items-center gap-1.5"
                        >
                          {editValues.is_listed ? (
                            <ToggleRight size={20} className="text-success" />
                          ) : (
                            <ToggleLeft size={20} className="text-muted-dim" />
                          )}
                        </button>
                      ) : (
                        <Badge color={nft.is_listed ? 'success' : 'default'}>
                          {nft.is_listed ? 'Listed' : 'Hidden'}
                        </Badge>
                      )}
                    </td>

                    <td className="px-5 py-3 text-right">
                      {editingId === nft.nft_id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSave(nft.nft_id)}
                            disabled={saving === nft.nft_id}
                            className="p-1.5 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                          >
                            {saving === nft.nft_id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Check size={14} />
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setEditingId(null);
                              setError('');
                            }}
                            className="p-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(nft)}
                          className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                        >
                          <Edit3 size={14} />
                        </button>
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