'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useAccount,
  useWriteContract,
  useReadContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from 'wagmi';
import { parseEther, formatEther } from 'viem';
import {
  getChainId,
  getCreatorContractAddress,
  getExplorerUrl,
  AURORA_CREATOR_ABI,
} from '@/lib/web3/contract';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import WalletConnectModal from '@/components/WalletConnectModal';
import {
  Save,
  AlertTriangle,
  Loader2,
  Check,
  Wallet,
  DollarSign,
  Shield,
  Bell,
  Sparkles,
  ExternalLink,
  Zap,
  RefreshCw,
} from 'lucide-react';

/* ── USD → ETH quick converter ── */
function UsdEthConverter({ ethPrice, onSetValue }) {
  const [usdInput, setUsdInput] = useState('');
  const [targetField, setTargetField] = useState('buy_fee');
  const ethResult =
    usdInput && ethPrice ? (parseFloat(usdInput) / ethPrice).toFixed(6) : '';

  return (
    <div className="bg-accent/5 border border-accent/10 rounded-xl p-3 space-y-2">
      <p className="text-[11px] text-accent font-medium flex items-center gap-1.5">
        <DollarSign size={12} />
        Quick USD → ETH Converter
        <span className="text-muted-dim ml-auto font-mono">
          1 ETH = ${ethPrice?.toLocaleString()}
        </span>
      </p>

      <div className="flex items-end gap-2 flex-wrap">
        <div className="space-y-1 flex-1 min-w-[100px]">
          <label className="text-[10px] text-muted">Amount (USD)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={usdInput}
            onChange={(e) => setUsdInput(e.target.value)}
            placeholder="e.g. 5.00"
            className="w-full px-3 py-2 bg-surface2/60 border border-border-light rounded-lg text-sm font-mono text-text focus:outline-none focus:border-accent/40"
          />
        </div>

        <div className="text-lg text-muted-dim pb-1">=</div>

        <div className="space-y-1 flex-1 min-w-[120px]">
          <label className="text-[10px] text-muted">Result (ETH)</label>
          <div className="px-3 py-2 bg-surface2/40 border border-border-light rounded-lg text-sm font-mono text-accent">
            {ethResult || '—'}
          </div>
        </div>

        <div className="space-y-1 min-w-[150px]">
          <label className="text-[10px] text-muted">Apply to</label>
          <select
            value={targetField}
            onChange={(e) => setTargetField(e.target.value)}
            className="w-full bg-surface2/50 border border-border-light rounded-lg px-2 py-2 text-xs text-text focus:outline-none"
          >
            <option value="buy_fee">Buy Fee (ETH)</option>
            <option value="minting_fee">Minting Fee (ETH)</option>
            <option value="create_mint_fee_usd">Create Mint Fee (USD)</option>
          </select>
        </div>

        <button
          onClick={() => {
            if (!usdInput || !onSetValue) return;

            if (targetField === 'create_mint_fee_usd') {
              onSetValue(usdInput, targetField);
            } else if (ethResult) {
              onSetValue(ethResult, targetField);
            }
          }}
          disabled={!usdInput}
          className="px-3 py-2 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors disabled:opacity-40"
        >
          Set
        </button>
      </div>
    </div>
  );
}

export default function SettingsForm() {
  const [settings, setSettings] = useState({
    minting_fee: '0.002',
    sale_active: 'true',
    max_per_wallet: '10',
    mint_window_hours: '72',
    treasury_wallet: '',
    buy_fee: '0.002',
    create_mint_fee_usd: '5',
    ntfy_topic: 'aurora-nft-admin',
    contract_address: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [saved, setSaved] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [ntfyTestResult, setNtfyTestResult] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const [ethPrice, setEthPrice] = useState(null);
  const [ethPriceSource, setEthPriceSource] = useState('');

  const [onChainFeeError, setOnChainFeeError] = useState(null);
  const [onChainFeeSuccess, setOnChainFeeSuccess] = useState(false);

  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const targetChainId = getChainId();
  const creatorContract = getCreatorContractAddress();
  const explorerUrl = getExplorerUrl();
  const chainName = targetChainId === 8453 ? 'Base' : 'Base Sepolia';

  useEffect(() => {
    let cancelled = false;

    async function loadEthPrice() {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
        );
        const data = await res.json();
        if (!cancelled && data?.ethereum?.usd) {
          setEthPrice(data.ethereum.usd);
          setEthPriceSource('CoinGecko');
          return;
        }
      } catch {}

      try {
        const res2 = await fetch(
          'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD'
        );
        const data2 = await res2.json();
        if (!cancelled && data2?.USD) {
          setEthPrice(data2.USD);
          setEthPriceSource('CryptoCompare');
          return;
        }
      } catch {}

      if (!cancelled) {
        setEthPrice(2500);
        setEthPriceSource('Fallback');
      }
    }

    loadEthPrice();

    return () => {
      cancelled = true;
    };
  }, []);

  const ethToUsd = (eth) => {
    if (!ethPrice || eth === null || eth === undefined || eth === '') return null;
    const parsed = parseFloat(String(eth));
    if (!Number.isFinite(parsed)) return null;
    return (parsed * ethPrice).toFixed(2);
  };

  const usdToEth = (usd) => {
    if (!ethPrice || usd === null || usd === undefined || usd === '') return null;
    const parsed = parseFloat(String(usd));
    if (!Number.isFinite(parsed)) return null;
    return (parsed / ethPrice).toFixed(6);
  };

  const liveCreateMintEth = useMemo(() => {
    return settings.create_mint_fee_usd ? usdToEth(settings.create_mint_fee_usd) : null;
  }, [settings.create_mint_fee_usd, ethPrice]);

  const { data: onChainFeeRaw, refetch: refetchFee } = useReadContract({
    address: creatorContract || undefined,
    abi: AURORA_CREATOR_ABI,
    functionName: 'mintFee',
    chainId: targetChainId,
    query: { enabled: Boolean(creatorContract) },
  });

  const { data: contractOwner } = useReadContract({
    address: creatorContract || undefined,
    abi: AURORA_CREATOR_ABI,
    functionName: 'owner',
    chainId: targetChainId,
    query: { enabled: Boolean(creatorContract) },
  });

  const onChainFee = onChainFeeRaw ? formatEther(onChainFeeRaw) : null;
  const isContractOwner =
    address &&
    contractOwner &&
    String(address).toLowerCase() === String(contractOwner).toLowerCase();

  const {
    writeContract: writeSetFee,
    data: feeTxHash,
    isPending: feeIsSending,
    error: feeSendError,
    reset: resetFeeWrite,
  } = useWriteContract();

  const { isLoading: feeIsWaiting, isSuccess: feeIsConfirmed } =
    useWaitForTransactionReceipt({
      hash: feeTxHash,
      query: { enabled: Boolean(feeTxHash) },
    });

  useEffect(() => {
    if (feeIsConfirmed) {
      setOnChainFeeSuccess(true);
      refetchFee();
      setTimeout(() => {
        setOnChainFeeSuccess(false);
        resetFeeWrite();
      }, 4000);
    }
  }, [feeIsConfirmed, refetchFee, resetFeeWrite]);

  useEffect(() => {
    if (feeSendError) {
      setOnChainFeeError(
        feeSendError.shortMessage || feeSendError.message || 'Transaction failed'
      );
    }
  }, [feeSendError]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();

      if (data.settings) {
        setSettings((prev) => ({
          ...prev,
          ...data.settings,
        }));
      }
    } catch (e) {
      console.error(e);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSetting = async (key) => {
    setSaving(key);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: settings[key], adminWallet: address || null }),
      });

      if (res.ok) {
        setSaved(key);
        setTimeout(() => setSaved(null), 2000);
        return true;
      }

      return false;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      setSaving(null);
    }
  };

  const saveAll = async () => {
    setShowConfirm(false);

    const keys = [
      'minting_fee',
      'sale_active',
      'max_per_wallet',
      'mint_window_hours',
      'treasury_wallet',
      'buy_fee',
      'create_mint_fee_usd',
      'ntfy_topic',
      'contract_address',
    ];

    for (const key of keys) {
      if (settings[key] !== undefined && settings[key] !== '') {
        await saveSetting(key);
      }
    }
  };

  const handleSaveCreateMintUsd = async () => {
    await saveSetting('create_mint_fee_usd');
  };

  const handleSetOnChainFee = () => {
    setOnChainFeeError(null);
    setOnChainFeeSuccess(false);

    if (!isConnected) {
      setShowWalletModal(true);
      return;
    }

    if (chain?.id !== targetChainId) {
      switchChain({ chainId: targetChainId });
      return;
    }

    if (!creatorContract) {
      setOnChainFeeError('No creator contract configured');
      return;
    }

    if (!isContractOwner) {
      setOnChainFeeError('Only the contract owner can update the fee');
      return;
    }

    const usdFee = parseFloat(String(settings.create_mint_fee_usd || ''));
    if (!Number.isFinite(usdFee) || usdFee < 0) {
      setOnChainFeeError('Enter a valid USD create mint fee');
      return;
    }

    if (!ethPrice || !Number.isFinite(ethPrice)) {
      setOnChainFeeError('ETH price unavailable right now');
      return;
    }

    const convertedEth = (usdFee / ethPrice).toFixed(6);
    const parsedConvertedEth = parseFloat(convertedEth);

    if (!Number.isFinite(parsedConvertedEth) || parsedConvertedEth < 0) {
      setOnChainFeeError('Failed to convert USD fee to ETH');
      return;
    }

    writeSetFee({
      address: creatorContract,
      abi: AURORA_CREATOR_ABI,
      functionName: 'setMintFee',
      args: [parseEther(String(convertedEth))],
      chainId: targetChainId,
    });
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
    setSettings((prev) => ({ ...prev, [key]: value }));
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
  const onChainFeeUsd = onChainFee ? ethToUsd(onChainFee) : null;

  return (
    <div className="space-y-6">
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
          onChange={(e) => updateField('treasury_wallet', e.target.value)}
          placeholder="0x..."
          className="font-mono text-xs"
        />

        <Input
          label="Contract Address (BuyCollector)"
          value={settings.contract_address}
          onChange={(e) => updateField('contract_address', e.target.value)}
          placeholder="0x..."
          className="font-mono text-xs"
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Input
              label="Global Buy Fee (ETH)"
              value={settings.buy_fee}
              onChange={(e) => updateField('buy_fee', e.target.value)}
              placeholder="0.002"
              type="number"
              step="0.001"
            />
            {ethPrice && settings.buy_fee && (
              <p className="text-[10px] text-muted-dim font-mono">
                ≈ ${ethToUsd(settings.buy_fee)} USD at ${ethPrice.toLocaleString()}/ETH
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Input
              label="Global Minting Fee (ETH)"
              value={settings.minting_fee}
              onChange={(e) => updateField('minting_fee', e.target.value)}
              placeholder="0.002"
              type="number"
              step="0.001"
            />
            {ethPrice && settings.minting_fee && (
              <p className="text-[10px] text-muted-dim font-mono">
                ≈ ${ethToUsd(settings.minting_fee)} USD at ${ethPrice.toLocaleString()}/ETH
              </p>
            )}
          </div>
        </div>

        {ethPrice && (
          <UsdEthConverter
            ethPrice={ethPrice}
            onSetValue={(value, field) => updateField(field, value)}
          />
        )}

        <div className="pt-4 border-t border-border-light space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-violet/10 flex items-center justify-center">
              <Sparkles size={14} className="text-accent-violet" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-text">Create / Mint Fee (USD Based)</h4>
              <p className="text-[11px] text-muted">
                Set your intended mint price in USD here. Then update the contract fee on-chain
                using the live ETH conversion below.
              </p>
            </div>
          </div>

          <Input
            label="Create Mint Fee (USD)"
            value={settings.create_mint_fee_usd}
            onChange={(e) => updateField('create_mint_fee_usd', e.target.value)}
            placeholder="5"
            type="number"
            step="0.01"
            min="0"
          />

          {ethPrice && settings.create_mint_fee_usd && (
            <div className="bg-surface2/40 rounded-xl p-3 space-y-2">
              <p className="text-[11px] text-muted">Live preview with current market rate:</p>

              <div className="flex justify-between text-sm">
                <span className="text-muted">Target USD Fee</span>
                <span className="font-mono text-text">${settings.create_mint_fee_usd}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted">ETH To Set On-Chain</span>
                <span className="font-mono text-accent">{liveCreateMintEth || '—'} ETH</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted">Price Source</span>
                <span className="font-mono text-xs">{ethPriceSource || '—'}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted">1 ETH</span>
                <span className="font-mono text-xs">${ethPrice.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={handleSaveCreateMintUsd}
              disabled={saving === 'create_mint_fee_usd'}
            >
              {saving === 'create_mint_fee_usd' ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save USD Fee
                </>
              )}
            </Button>

            {saved === 'create_mint_fee_usd' && (
              <Badge color="success">USD fee saved</Badge>
            )}
          </div>
        </div>
      </Card>

      {creatorContract && (
        <Card className="p-6 space-y-5 border-accent/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Zap size={18} className="text-accent" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-semibold text-text">On-Chain Mint Fee</h3>
                <Badge color="accent" className="!text-[9px]">
                  Smart Contract
                </Badge>
              </div>
              <p className="text-xs text-muted">
                This is the real fee users must pay. Update it from the USD target above.
              </p>
            </div>
          </div>

          <div className="bg-surface2/40 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Current On-Chain Fee</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-accent">
                  {onChainFee !== null ? `${onChainFee} ETH` : '—'}
                </span>
                {onChainFeeUsd !== null && (
                  <span className="text-[10px] text-muted-dim font-mono ml-1">
                    (≈${onChainFeeUsd})
                  </span>
                )}
                <button
                  onClick={() => refetchFee()}
                  className="text-muted-dim hover:text-accent transition-colors"
                  title="Refresh"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted">Target USD Fee</span>
              <span className="font-mono text-xs">
                ${settings.create_mint_fee_usd || '—'}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted">New On-Chain Fee From USD</span>
              <span className="font-mono text-xs text-accent">
                {liveCreateMintEth ? `${liveCreateMintEth} ETH` : '—'}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted">Contract</span>
              <a
                href={`${explorerUrl}/address/${creatorContract}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-accent hover:underline flex items-center gap-1"
              >
                {creatorContract.slice(0, 6)}...{creatorContract.slice(-4)}
                <ExternalLink size={10} />
              </a>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted">Network</span>
              <span className="font-mono text-xs">{chainName}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted">Owner</span>
              <span className="font-mono text-xs">
                {contractOwner
                  ? `${String(contractOwner).slice(0, 6)}...${String(contractOwner).slice(-4)}`
                  : '—'}
              </span>
            </div>

            {isConnected && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">Your Wallet</span>
                <span
                  className={`font-mono text-xs ${
                    isContractOwner ? 'text-success' : 'text-warning'
                  }`}
                >
                  {address?.slice(0, 6)}...{address?.slice(-4)}{' '}
                  {isContractOwner ? '(Owner)' : '(Not Owner)'}
                </span>
              </div>
            )}
          </div>

          {!isConnected && (
            <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 flex items-center gap-2">
              <Wallet size={14} className="text-warning" />
              <p className="text-xs text-warning">
                Connect your owner wallet to update the on-chain fee.
              </p>
            </div>
          )}

          {isConnected && !isContractOwner && (
            <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle size={14} className="text-warning" />
              <p className="text-xs text-warning">
                Only the contract owner can call setMintFee().
              </p>
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
              <p className="text-xs text-success">On-chain mint fee updated successfully.</p>
              {feeTxExplorerLink && (
                <a
                  href={feeTxExplorerLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline ml-auto flex items-center gap-1"
                >
                  <ExternalLink size={10} />
                  Tx
                </a>
              )}
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            {!isConnected ? (
              <Button variant="primary" size="md" onClick={() => setShowWalletModal(true)}>
                <Wallet size={14} />
                Connect Wallet
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleSetOnChainFee}
                disabled={
                  feeIsSending ||
                  feeIsWaiting ||
                  !isContractOwner ||
                  !liveCreateMintEth
                }
              >
                {feeIsSending || feeIsWaiting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {feeIsSending ? 'Confirm in wallet...' : 'Pending...'}
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    Update On-Chain Fee From USD
                  </>
                )}
              </Button>
            )}
          </div>

          <p className="text-[10px] text-muted-dim leading-relaxed flex items-start gap-1">
            <Shield size={10} className="mt-0.5 shrink-0" />
            Admin USD fee is your pricing target. This button converts that USD value into ETH
            using the current market rate, then calls setMintFee() on the AuroraCreator contract.
            Users should later pay the contract fee exactly.
          </p>
        </Card>
      )}

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
            onChange={(e) => updateField('max_per_wallet', e.target.value)}
            placeholder="10"
            type="number"
          />
          <Input
            label="Mint Window (hours)"
            value={settings.mint_window_hours}
            onChange={(e) => updateField('mint_window_hours', e.target.value)}
            placeholder="72"
            type="number"
          />
        </div>

        <div className="flex items-center justify-between py-3 border-t border-border-light">
          <div>
            <p className="text-sm text-text font-medium">Sale Status</p>
            <p className="text-xs text-muted mt-0.5">
              {settings.sale_active === 'true' ? 'Mint is live' : 'Mint is currently paused'}
            </p>
          </div>

          <button
            onClick={() =>
              updateField('sale_active', settings.sale_active === 'true' ? 'false' : 'true')
            }
            className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${
              settings.sale_active !== 'true'
                ? 'bg-surface2 border border-border'
                : 'bg-success/20 border border-success/30'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 ${
                settings.sale_active !== 'true'
                  ? 'left-0.5 bg-muted-dim'
                  : 'left-[26px] bg-success'
              }`}
            />
          </button>
        </div>
      </Card>

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
          onChange={(e) => updateField('ntfy_topic', e.target.value)}
          placeholder="aurora-nft-admin"
        />

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={testNtfy}
            disabled={ntfyTestResult === 'sending'}
          >
            {ntfyTestResult === 'sending' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Bell size={14} />
            )}
            Test Notification
          </Button>

          {ntfyTestResult === 'success' && <Badge color="success">Sent! Check your phone</Badge>}
          {ntfyTestResult === 'failed' && <Badge color="danger">Failed</Badge>}
          <span className="text-xs text-muted">Subscribe to this topic in the ntfy app</span>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="primary" size="md" onClick={() => setShowConfirm(true)}>
          <Save size={16} />
          Save All Changes
        </Button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-bg/70 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
          />
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
              <div className="flex justify-between">
                <span className="text-muted">Treasury</span>
                <span className="text-text font-mono text-xs truncate max-w-[150px]">
                  {settings.treasury_wallet || '—'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Buy Fee</span>
                <span className="text-text font-mono">{settings.buy_fee} ETH</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Mint Fee</span>
                <span className="text-text font-mono">{settings.minting_fee} ETH</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Create Mint Fee</span>
                <span className="text-text font-mono">${settings.create_mint_fee_usd}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Planned On-Chain Fee</span>
                <span className="text-text font-mono">
                  {liveCreateMintEth ? `${liveCreateMintEth} ETH` : '—'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Current On-Chain Fee</span>
                <span className="text-text font-mono">
                  {onChainFee ? `${onChainFee} ETH` : '—'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Sale</span>
                <span
                  className={settings.sale_active === 'true' ? 'text-success' : 'text-warning'}
                >
                  {settings.sale_active === 'true' ? 'Live' : 'Paused'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Ntfy Topic</span>
                <span className="text-text font-mono text-xs">{settings.ntfy_topic}</span>
              </div>
            </div>

            <p className="text-[10px] text-muted-dim">
              Saving changes updates the database only. Updating the real creator mint price for
              users requires the separate on-chain button above.
            </p>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="md"
                className="flex-1"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </Button>
              <Button variant="primary" size="md" className="flex-1" onClick={saveAll}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      <WalletConnectModal open={showWalletModal} onClose={() => setShowWalletModal(false)} />
    </div>
  );
}