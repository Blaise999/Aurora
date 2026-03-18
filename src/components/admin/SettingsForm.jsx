'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { getChainId, getCreatorContractAddress, getExplorerUrl, AURORA_CREATOR_ABI } from '@/lib/web3/contract';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import WalletConnectModal from '@/components/WalletConnectModal';
import { Save, AlertTriangle, Loader2, Check, Wallet, DollarSign, Shield, Bell, Sparkles, ExternalLink, Zap, RefreshCw } from 'lucide-react';

export default function SettingsForm() {
  const [settings, setSettings] = useState({
    minting_fee: '0.002',
    sale_active: 'true',
    max_per_wallet: '10',
    mint_window_hours: '72',
    treasury_wallet: '',
    buy_fee: '0.002',
    create_mint_fee: '0.005',
    ntfy_topic: 'aurora-nft-admin',
    contract_address: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [saved, setSaved] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [ntfyTestResult, setNtfyTestResult] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // ── Wagmi hooks for on-chain mint fee ──
  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const targetChainId = getChainId();
  const creatorContract = getCreatorContractAddress();
  const explorerUrl = getExplorerUrl();
  const chainName = targetChainId === 8453 ? 'Base' : 'Base Sepolia';

  // Read current on-chain fee
  const { data: onChainFeeRaw, refetch: refetchFee } = useReadContract({
    address: creatorContract || undefined,
    abi: AURORA_CREATOR_ABI,
    functionName: 'mintFee',
    chainId: targetChainId,
    query: { enabled: Boolean(creatorContract) },
  });

  // Read contract owner
  const { data: contractOwner } = useReadContract({
    address: creatorContract || undefined,
    abi: AURORA_CREATOR_ABI,
    functionName: 'owner',
    chainId: targetChainId,
    query: { enabled: Boolean(creatorContract) },
  });

  const onChainFee = onChainFeeRaw ? formatEther(onChainFeeRaw) : null;
  const isContractOwner = address && contractOwner && address.toLowerCase() === contractOwner.toLowerCase();

  // Write: setMintFee on-chain
  const [newOnChainFee, setNewOnChainFee] = useState('');
  const [onChainFeeError, setOnChainFeeError] = useState(null);
  const [onChainFeeSuccess, setOnChainFeeSuccess] = useState(false);

  const { writeContract: writeSetFee, data: feeTxHash, isPending: feeIsSending, error: feeSendError, reset: resetFeeWrite } = useWriteContract();
  const { isLoading: feeIsWaiting, isSuccess: feeIsConfirmed } = useWaitForTransactionReceipt({ hash: feeTxHash, query: { enabled: Boolean(feeTxHash) } });

  // Sync newOnChainFee input with current on-chain value
  useEffect(() => {
    if (onChainFee && !newOnChainFee) setNewOnChainFee(onChainFee);
  }, [onChainFee]);

  // Handle fee tx confirmation
  useEffect(() => {
    if (feeIsConfirmed) {
      setOnChainFeeSuccess(true);
      refetchFee();
      setTimeout(() => { setOnChainFeeSuccess(false); resetFeeWrite(); }, 4000);
    }
  }, [feeIsConfirmed, refetchFee, resetFeeWrite]);

  useEffect(() => {
    if (feeSendError) {
      setOnChainFeeError(feeSendError.shortMessage || feeSendError.message || 'Transaction failed');
    }
  }, [feeSendError]);

  const handleSetOnChainFee = () => {
    setOnChainFeeError(null);
    setOnChainFeeSuccess(false);

    if (!isConnected) { setShowWalletModal(true); return; }
    if (chain?.id !== targetChainId) { switchChain({ chainId: targetChainId }); return; }
    if (!creatorContract) { setOnChainFeeError('No creator contract configured'); return; }
    if (!isContractOwner) { setOnChainFeeError('Only the contract owner can update the fee'); return; }

    const feeVal = parseFloat(newOnChainFee);
    if (isNaN(feeVal) || feeVal < 0) { setOnChainFeeError('Enter a valid fee amount'); return; }

    writeSetFee({
      address: creatorContract,
      abi: AURORA_CREATOR_ABI,
      functionName: 'setMintFee',
      args: [parseEther(String(feeVal))],
      chainId: targetChainId,
    });
  };

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
    const keys = ['minting_fee', 'sale_active', 'max_per_wallet', 'mint_window_hours', 'treasury_wallet', 'buy_fee', 'create_mint_fee', 'ntfy_topic', 'contract_address'];
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

  const feeTxExplorerLink = feeTxHash ? `${explorerUrl}/tx/${feeTxHash}` : null;

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

        {/* ── Create Mint Fee: DB fallback ── */}
        <div className="pt-4 border-t border-border-light space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-violet/10 flex items-center justify-center">
              <Sparkles size={14} className="text-accent-violet" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-text">Create / Mint Fee (DB Fallback)</h4>
              <p className="text-[11px] text-muted">Used when the on-chain fee can&apos;t be read. The on-chain value always takes priority.</p>
            </div>
          </div>
          <Input
            label="Create Mint Fee (ETH) — DB Fallback"
            value={settings.create_mint_fee}
            onChange={e => updateField('create_mint_fee', e.target.value)}
            placeholder="0.005"
            type="number"
            step="0.001"
            min="0"
          />
        </div>
      </Card>

      {/* ══ ON-CHAIN MINT FEE (contract interaction) ══ */}
      {creatorContract && (
        <Card className="p-6 space-y-5 border-accent/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Zap size={18} className="text-accent" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-semibold text-text">On-Chain Mint Fee</h3>
                <Badge color="accent" className="!text-[9px]">Smart Contract</Badge>
              </div>
              <p className="text-xs text-muted">
                Update the fee directly on the AuroraCreator contract via setMintFee()
              </p>
            </div>
          </div>

          {/* Current on-chain value */}
          <div className="bg-surface2/40 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Current On-Chain Fee</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-accent">{onChainFee !== null ? `${onChainFee} ETH` : '—'}</span>
                <button onClick={() => refetchFee()} className="text-muted-dim hover:text-accent transition-colors" title="Refresh"><RefreshCw size={12} /></button>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Contract</span>
              <a href={`${explorerUrl}/address/${creatorContract}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-accent hover:underline flex items-center gap-1">{creatorContract.slice(0,6)}...{creatorContract.slice(-4)} <ExternalLink size={10} /></a>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Network</span>
              <span className="font-mono text-xs">{chainName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Owner</span>
              <span className="font-mono text-xs">{contractOwner ? `${contractOwner.slice(0,6)}...${contractOwner.slice(-4)}` : '—'}</span>
            </div>
            {isConnected && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">Your Wallet</span>
                <span className={`font-mono text-xs ${isContractOwner ? 'text-success' : 'text-warning'}`}>
                  {address?.slice(0,6)}...{address?.slice(-4)} {isContractOwner ? '(Owner)' : '(Not Owner)'}
                </span>
              </div>
            )}
          </div>

          {/* Update form */}
          <div className="space-y-3">
            <Input
              label="New Mint Fee (ETH)"
              value={newOnChainFee}
              onChange={e => { setNewOnChainFee(e.target.value); setOnChainFeeError(null); }}
              placeholder="0.005"
              type="number"
              step="0.001"
              min="0"
            />

            {!isConnected && (
              <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 flex items-center gap-2">
                <Wallet size={14} className="text-warning" />
                <p className="text-xs text-warning">Connect your wallet (contract owner) to update the on-chain fee.</p>
              </div>
            )}

            {isConnected && !isContractOwner && (
              <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-warning" />
                <p className="text-xs text-warning">Only the contract owner can call setMintFee(). Connect with the owner wallet.</p>
              </div>
            )}

            {onChainFeeError && (
              <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle size={14} className="text-danger mt-0.5" />
                <p className="text-xs text-danger break-all">{onChainFeeError}</p>
              </div>
            )}

            {onChainFeeSuccess && (
              <div className="bg-success/10 border border-success/20 rounded-xl p-3 flex items-center gap-2">
                <Check size={14} className="text-success" />
                <p className="text-xs text-success">Mint fee updated on-chain!</p>
                {feeTxExplorerLink && (
                  <a href={feeTxExplorerLink} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline ml-auto flex items-center gap-1"><ExternalLink size={10} /> Tx</a>
                )}
              </div>
            )}

            <div className="flex gap-3">
              {!isConnected ? (
                <Button variant="primary" size="md" onClick={() => setShowWalletModal(true)}>
                  <Wallet size={14} /> Connect Wallet
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSetOnChainFee}
                  disabled={feeIsSending || feeIsWaiting || !isContractOwner}
                >
                  {(feeIsSending || feeIsWaiting) ? (
                    <><Loader2 size={14} className="animate-spin" /> {feeIsSending ? 'Confirm in wallet...' : 'Pending...'}</>
                  ) : (
                    <><Zap size={14} /> Update On-Chain Fee</>
                  )}
                </Button>
              )}
            </div>

            <p className="text-[10px] text-muted-dim leading-relaxed flex items-start gap-1">
              <Shield size={10} className="mt-0.5 shrink-0" />
              This sends a transaction to the AuroraCreator contract calling setMintFee(). Gas fees apply. The new fee takes effect immediately for all future mints.
            </p>
          </div>
        </Card>
      )}

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
                <p className="text-xs text-muted">This will update all database settings.</p>
              </div>
            </div>
            <div className="bg-surface2/50 rounded-xl p-3 space-y-2 text-sm max-h-60 overflow-y-auto">
              <div className="flex justify-between"><span className="text-muted">Treasury</span><span className="text-text font-mono text-xs truncate max-w-[150px]">{settings.treasury_wallet || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted">Buy Fee</span><span className="text-text font-mono">{settings.buy_fee} ETH</span></div>
              <div className="flex justify-between"><span className="text-muted">Mint Fee</span><span className="text-text font-mono">{settings.minting_fee} ETH</span></div>
              <div className="flex justify-between"><span className="text-muted">Create Mint Fee (DB)</span><span className="text-text font-mono">{settings.create_mint_fee} ETH</span></div>
              <div className="flex justify-between"><span className="text-muted">Sale</span><span className={settings.sale_active === 'true' ? 'text-success' : 'text-warning'}>{settings.sale_active === 'true' ? 'Live' : 'Paused'}</span></div>
              <div className="flex justify-between"><span className="text-muted">Ntfy Topic</span><span className="text-text font-mono text-xs">{settings.ntfy_topic}</span></div>
            </div>
            <p className="text-[10px] text-muted-dim">Note: To update the on-chain mint fee, use the &quot;On-Chain Mint Fee&quot; section above — that requires a wallet transaction.</p>
            <div className="flex gap-3">
              <Button variant="ghost" size="md" className="flex-1" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button variant="primary" size="md" className="flex-1" onClick={saveAll}>Confirm</Button>
            </div>
          </div>
        </div>
      )}

      <WalletConnectModal open={showWalletModal} onClose={() => setShowWalletModal(false)} />
    </div>
  );
}
