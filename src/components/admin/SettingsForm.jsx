"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  useAccount,
  useWriteContract,
  useReadContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import {
  getChainId,
  getCreatorContractAddress,
  getExplorerUrl,
  AURORA_CREATOR_ABI,
} from "@/lib/web3/contract";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import WalletConnectModal from "@/components/WalletConnectModal";
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
} from "lucide-react";

function formatUsd(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: num % 1 === 0 ? 0 : 2,
  }).format(num);
}

function formatEth(value, digits = 6) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num.toFixed(digits).replace(/\.?0+$/, "");
}

function safeNum(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/* ── USD → ETH quick converter ── */
function UsdEthConverter({ ethPrice, onSetValue }) {
  const [usdInput, setUsdInput] = useState("");
  const [targetField, setTargetField] = useState("buy_fee");

  const ethResult =
    usdInput && ethPrice ? formatEth(parseFloat(usdInput) / ethPrice) : "";

  return (
    <div className="space-y-2 rounded-xl border border-accent/10 bg-accent/5 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-accent">
        <DollarSign size={12} />
        Quick USD → ETH Converter
        <span className="ml-auto font-mono text-muted-dim">
          1 ETH = {ethPrice ? formatUsd(ethPrice) : "—"}
        </span>
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[100px] flex-1 space-y-1">
          <label className="text-[10px] text-muted">Amount (USD)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={usdInput}
            onChange={(e) => setUsdInput(e.target.value)}
            placeholder="e.g. 5.00"
            className="w-full rounded-lg border border-border-light bg-surface2/60 px-3 py-2 text-sm font-mono text-text focus:border-accent/40 focus:outline-none"
          />
        </div>

        <div className="pb-1 text-lg text-muted-dim">=</div>

        <div className="min-w-[120px] flex-1 space-y-1">
          <label className="text-[10px] text-muted">Result (ETH)</label>
          <div className="rounded-lg border border-border-light bg-surface2/40 px-3 py-2 text-sm font-mono text-accent">
            {ethResult || "—"}
          </div>
        </div>

        <div className="min-w-[170px] space-y-1">
          <label className="text-[10px] text-muted">Apply to</label>
          <select
            value={targetField}
            onChange={(e) => setTargetField(e.target.value)}
            className="w-full rounded-lg border border-border-light bg-surface2/50 px-2 py-2 text-xs text-text focus:outline-none"
          >
            <option value="buy_fee">Buy Fee (ETH)</option>
            <option value="minting_fee">Minting Fee (ETH)</option>
            <option value="create_mint_fee_usd">Create Mint Fee (USD)</option>
          </select>
        </div>

        <button
          onClick={() => {
            if (!usdInput || !onSetValue) return;

            if (targetField === "create_mint_fee_usd") {
              onSetValue(usdInput, targetField);
            } else if (ethResult) {
              onSetValue(ethResult, targetField);
            }
          }}
          disabled={!usdInput}
          className="rounded-lg bg-accent/10 px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-40"
        >
          Set
        </button>
      </div>
    </div>
  );
}

export default function SettingsForm() {
  const [settings, setSettings] = useState({
    minting_fee: "0.002",
    sale_active: "true",
    max_per_wallet: "10",
    mint_window_hours: "72",
    treasury_wallet: "",
    buy_fee: "0.002",
    mint_price_eth: "0.005",
    create_mint_fee_usd: "5",
    contract_address: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [saved, setSaved] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pushTestResult, setPushTestResult] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const [ethPrice, setEthPrice] = useState(null);
  const [ethPriceSource, setEthPriceSource] = useState("");
  const [ethPriceUpdatedAt, setEthPriceUpdatedAt] = useState("");
  const [ethPriceLoading, setEthPriceLoading] = useState(false);
  const [ethPriceError, setEthPriceError] = useState(null);

  const [onChainFeeError, setOnChainFeeError] = useState(null);
  const [onChainFeeSuccess, setOnChainFeeSuccess] = useState(false);

  const { address, isConnected, chain } = useAccount();
  const { switchChain } = useSwitchChain();
  const targetChainId = getChainId();
  const creatorContract = getCreatorContractAddress();
  const explorerUrl = getExplorerUrl();
  const chainName = targetChainId === 8453 ? "Base" : "Base Sepolia";

  const loadEthPrice = useCallback(async () => {
    setEthPriceLoading(true);
    setEthPriceError(null);

    try {
      const res = await fetch("/api/pricing/eth-usd", {
        method: "GET",
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to load ETH price");
      }

      const usd = Number(data.usd);
      if (!Number.isFinite(usd) || usd <= 0) {
        throw new Error("Invalid ETH price received");
      }

      setEthPrice(usd);
      setEthPriceSource(data.source || "server");
      setEthPriceUpdatedAt(data.fetchedAt || new Date().toISOString());
    } catch (err) {
      setEthPriceError(err?.message || "Failed to load ETH price");
      setEthPrice(null);
      setEthPriceSource("");
      setEthPriceUpdatedAt("");
    } finally {
      setEthPriceLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEthPrice();

    const id = setInterval(() => {
      loadEthPrice();
    }, 30000);

    return () => clearInterval(id);
  }, [loadEthPrice]);

  const ethToUsd = useCallback(
    (eth) => {
      if (!ethPrice || eth === null || eth === undefined || eth === "") return null;
      const parsed = parseFloat(String(eth));
      if (!Number.isFinite(parsed)) return null;
      return (parsed * ethPrice).toFixed(2);
    },
    [ethPrice]
  );

  const usdToEth = useCallback(
    (usd) => {
      if (!ethPrice || usd === null || usd === undefined || usd === "") return null;
      const parsed = parseFloat(String(usd));
      if (!Number.isFinite(parsed)) return null;
      return formatEth(parsed / ethPrice);
    },
    [ethPrice]
  );

  const targetUsdNumber = safeNum(settings.create_mint_fee_usd);

  const liveCreateMintEth = useMemo(() => {
    return targetUsdNumber !== null ? usdToEth(targetUsdNumber) : null;
  }, [targetUsdNumber, usdToEth]);

  const { data: onChainFeeRaw, refetch: refetchFee } = useReadContract({
    address: creatorContract || undefined,
    abi: AURORA_CREATOR_ABI,
    functionName: "mintFee",
    chainId: targetChainId,
    query: { enabled: Boolean(creatorContract) },
  });

  const { data: contractOwner } = useReadContract({
    address: creatorContract || undefined,
    abi: AURORA_CREATOR_ABI,
    functionName: "owner",
    chainId: targetChainId,
    query: { enabled: Boolean(creatorContract) },
  });

  const onChainFee = onChainFeeRaw != null ? formatEther(onChainFeeRaw) : null;
  const onChainFeeUsd = onChainFee ? ethToUsd(onChainFee) : null;

  const onChainFeeUsdNumber = safeNum(onChainFeeUsd);

  const feeDriftUsd = useMemo(() => {
    if (targetUsdNumber === null || onChainFeeUsdNumber === null) return null;
    return onChainFeeUsdNumber - targetUsdNumber;
  }, [targetUsdNumber, onChainFeeUsdNumber]);

  const feeDriftPercent = useMemo(() => {
    if (targetUsdNumber === null || targetUsdNumber <= 0 || feeDriftUsd === null) return null;
    return (feeDriftUsd / targetUsdNumber) * 100;
  }, [targetUsdNumber, feeDriftUsd]);

  const feeDriftTone = useMemo(() => {
    if (feeDriftPercent === null) return "default";
    const abs = Math.abs(feeDriftPercent);
    if (abs <= 3) return "success";
    if (abs <= 10) return "warning";
    return "danger";
  }, [feeDriftPercent]);

  const feeDriftLabel = useMemo(() => {
    if (feeDriftPercent === null) return "No comparison";
    if (feeDriftPercent === 0) return "Perfect match";
    const abs = Math.abs(feeDriftPercent).toFixed(1);
    return feeDriftPercent > 0 ? `${abs}% above target` : `${abs}% below target`;
  }, [feeDriftPercent]);

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
      setOnChainFeeError(null);
      refetchFee();

      const timer = setTimeout(() => {
        setOnChainFeeSuccess(false);
        resetFeeWrite();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [feeIsConfirmed, refetchFee, resetFeeWrite]);

  useEffect(() => {
    if (feeSendError) {
      setOnChainFeeError(
        feeSendError.shortMessage || feeSendError.message || "Transaction failed"
      );
    }
  }, [feeSendError]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();

      if (data.settings) {
        setSettings((prev) => ({
          ...prev,
          ...data.settings,
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSetting = async (key) => {
    setSaving(key);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      "minting_fee",
      "sale_active",
      "max_per_wallet",
      "mint_window_hours",
      "treasury_wallet",
      "buy_fee",
      "mint_price_eth",
      "create_mint_fee_usd",
      "contract_address",
    ];

    for (const key of keys) {
      if (settings[key] !== undefined && settings[key] !== "") {
        await saveSetting(key);
      }
    }
  };

  const handleSaveCreateMintUsd = async () => {
    setSaving("create_mint_fee_usd");

    try {
      // 1. Save USD reference
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "create_mint_fee_usd", value: settings.create_mint_fee_usd, adminWallet: address || null }),
      });

      // 2. Convert USD → ETH at current rate and lock the ETH price
      const usdVal = parseFloat(String(settings.create_mint_fee_usd || "0"));
      if (ethPrice && ethPrice > 0 && usdVal > 0) {
        const ethVal = (usdVal / ethPrice).toFixed(8).replace(/\.?0+$/, "");

        await fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "mint_price_eth", value: ethVal, adminWallet: address || null }),
        });

        updateField("mint_price_eth", ethVal);
      }

      setSaved("create_mint_fee_usd");
      setTimeout(() => setSaved(null), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(null);
    }
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
      setOnChainFeeError("No creator contract configured");
      return;
    }

    if (!isContractOwner) {
      setOnChainFeeError("Only the contract owner can update the fee");
      return;
    }

    const usdFee = parseFloat(String(settings.create_mint_fee_usd || ""));
    if (!Number.isFinite(usdFee) || usdFee < 0) {
      setOnChainFeeError("Enter a valid USD create mint fee");
      return;
    }

    if (!ethPrice || !Number.isFinite(ethPrice)) {
      setOnChainFeeError("ETH price unavailable right now");
      return;
    }

    const convertedEth = formatEth(usdFee / ethPrice);
    const parsedConvertedEth = parseFloat(String(convertedEth));

    if (!Number.isFinite(parsedConvertedEth) || parsedConvertedEth < 0) {
      setOnChainFeeError("Failed to convert USD fee to ETH");
      return;
    }

    writeSetFee({
      address: creatorContract,
      abi: AURORA_CREATOR_ABI,
      functionName: "setMintFee",
      args: [parseEther(String(convertedEth))],
      chainId: targetChainId,
    });
  };

  const testPushover = async () => {
    setPushTestResult("sending");

    try {
      const res = await fetch("/api/admin/notifications/test", { method: "POST" });
      setPushTestResult(res.ok ? "success" : "failed");
    } catch {
      setPushTestResult("failed");
    }

    setTimeout(() => setPushTestResult(null), 3000);
  };

  const updateField = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <Loader2 size={24} className="mx-auto animate-spin text-accent" />
        <p className="mt-3 text-sm text-muted">Loading settings...</p>
      </div>
    );
  }

  const feeTxExplorerLink = feeTxHash ? `${explorerUrl}/tx/${feeTxHash}` : null;

  return (
    <div className="space-y-6">
      <Card className="space-y-5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
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
          onChange={(e) => updateField("treasury_wallet", e.target.value)}
          placeholder="0x..."
          className="font-mono text-xs"
        />

        <Input
          label="Contract Address (BuyCollector)"
          value={settings.contract_address}
          onChange={(e) => updateField("contract_address", e.target.value)}
          placeholder="0x..."
          className="font-mono text-xs"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Input
              label="Global Buy Fee (ETH)"
              value={settings.buy_fee}
              onChange={(e) => updateField("buy_fee", e.target.value)}
              placeholder="0.002"
              type="number"
              step="0.001"
            />
            {ethPrice && settings.buy_fee && (
              <p className="font-mono text-[10px] text-muted-dim">
                ≈ ${ethToUsd(settings.buy_fee)} USD at {formatUsd(ethPrice)}/ETH
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Input
              label="Global Minting Fee (ETH)"
              value={settings.minting_fee}
              onChange={(e) => updateField("minting_fee", e.target.value)}
              placeholder="0.002"
              type="number"
              step="0.001"
            />
            {ethPrice && settings.minting_fee && (
              <p className="font-mono text-[10px] text-muted-dim">
                ≈ ${ethToUsd(settings.minting_fee)} USD at {formatUsd(ethPrice)}/ETH
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

        <div className="space-y-3 border-t border-border-light pt-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-violet/10">
              <Sparkles size={14} className="text-accent-violet" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-text">Create / Mint Price</h4>
              <p className="text-[11px] text-muted">
                Set your price in USD. When you click Save, the current ETH equivalent is
                locked as the mint price. It stays fixed until you save again — no fluctuation.
                If the locked price is below the on-chain contract fee, the contract fee is used instead.
              </p>
            </div>
          </div>

          <Input
            label="Mint Price (USD)"
            value={settings.create_mint_fee_usd}
            onChange={(e) => updateField("create_mint_fee_usd", e.target.value)}
            placeholder="5"
            type="number"
            step="0.01"
            min="0"
          />

          <div className="rounded-xl bg-surface2/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] text-muted">Preview — will be locked on save:</p>
              <button
                onClick={loadEthPrice}
                className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
                disabled={ethPriceLoading}
              >
                {ethPriceLoading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                Refresh rate
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">You set</span>
                <span className="font-mono text-text">
                  {formatUsd(settings.create_mint_fee_usd) || `$${settings.create_mint_fee_usd || "0"}`}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted">ETH rate</span>
                <span className="font-mono text-xs">{ethPrice ? `1 ETH = ${formatUsd(ethPrice)}` : "Loading..."}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted">ETH to lock</span>
                <span className="font-mono font-semibold text-accent">{liveCreateMintEth || "—"} ETH</span>
              </div>

              {settings.mint_price_eth && (
                <div className="flex justify-between text-sm border-t border-border-light pt-2">
                  <span className="text-muted">Currently locked</span>
                  <span className="font-mono text-success">{settings.mint_price_eth} ETH</span>
                </div>
              )}
            </div>

            {ethPriceError && (
              <div className="mt-3 rounded-lg border border-warning/20 bg-warning/10 p-3 text-[11px] text-warning">
                {ethPriceError}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={handleSaveCreateMintUsd}
              disabled={saving === "create_mint_fee_usd" || !ethPrice}
            >
              {saving === "create_mint_fee_usd" ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Locking price...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save & Lock ETH Price
                </>
              )}
            </Button>

            {saved === "create_mint_fee_usd" && (
              <Badge color="success">
                Locked at {settings.mint_price_eth || liveCreateMintEth} ETH
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {creatorContract && (
        <Card className="space-y-5 border-accent/20 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Zap size={18} className="text-accent" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display font-semibold text-text">On-Chain Mint Fee</h3>
                <Badge color="accent" className="!text-[9px]">
                  Smart Contract
                </Badge>
              </div>
              <p className="text-xs text-muted">
                This is the real fee users will pay on the create page.
              </p>
            </div>
          </div>

          <div className="space-y-2 rounded-xl bg-surface2/40 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Current On-Chain Fee</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-accent">
                  {onChainFee !== null ? `${onChainFee} ETH` : "—"}
                </span>
                {onChainFeeUsd !== null && (
                  <span className="ml-1 font-mono text-[10px] text-muted-dim">
                    (≈{formatUsd(onChainFeeUsd)})
                  </span>
                )}
                <button
                  onClick={() => refetchFee()}
                  className="text-muted-dim transition-colors hover:text-accent"
                  title="Refresh"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted">Target USD Fee</span>
              <span className="font-mono text-xs">
                {formatUsd(settings.create_mint_fee_usd) || `$${settings.create_mint_fee_usd || "—"}`}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted">New On-Chain Fee From USD</span>
              <span className="font-mono text-xs text-accent">
                {liveCreateMintEth ? `${liveCreateMintEth} ETH` : "—"}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted">Current On-Chain USD</span>
              <span className="font-mono text-xs">
                {onChainFeeUsd ? formatUsd(onChainFeeUsd) : "—"}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted">Target Match</span>
              <Badge color={feeDriftTone} className="!text-[10px]">
                {feeDriftLabel}
              </Badge>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted">Contract</span>
              <a
                href={`${explorerUrl}/address/${creatorContract}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-xs text-accent hover:underline"
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
                  : "—"}
              </span>
            </div>

            {isConnected && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">Your Wallet</span>
                <span
                  className={`font-mono text-xs ${
                    isContractOwner ? "text-success" : "text-warning"
                  }`}
                >
                  {address?.slice(0, 6)}...{address?.slice(-4)}{" "}
                  {isContractOwner ? "(Owner)" : "(Not Owner)"}
                </span>
              </div>
            )}
          </div>

          {!isConnected && (
            <div className="flex items-center gap-2 rounded-xl border border-warning/20 bg-warning/10 p-3">
              <Wallet size={14} className="text-warning" />
              <p className="text-xs text-warning">
                Connect your owner wallet to update the on-chain fee.
              </p>
            </div>
          )}

          {isConnected && !isContractOwner && (
            <div className="flex items-center gap-2 rounded-xl border border-warning/20 bg-warning/10 p-3">
              <AlertTriangle size={14} className="text-warning" />
              <p className="text-xs text-warning">
                Only the contract owner can call setMintFee().
              </p>
            </div>
          )}

          {onChainFeeError && (
            <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/10 p-3">
              <AlertTriangle size={14} className="mt-0.5 text-danger" />
              <p className="break-all text-xs text-danger">{onChainFeeError}</p>
            </div>
          )}

          {onChainFeeSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-success/20 bg-success/10 p-3">
              <Check size={14} className="text-success" />
              <p className="text-xs text-success">On-chain mint fee updated successfully.</p>
              {feeTxExplorerLink && (
                <a
                  href={feeTxExplorerLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  <ExternalLink size={10} />
                  Tx
                </a>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
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
                disabled={feeIsSending || feeIsWaiting || !isContractOwner || !liveCreateMintEth}
              >
                {feeIsSending || feeIsWaiting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {feeIsSending ? "Confirm in wallet..." : "Pending..."}
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

          <p className="flex items-start gap-1 text-[10px] leading-relaxed text-muted-dim">
            <Shield size={10} className="mt-0.5 shrink-0" />
            The create page should use the contract fee as the real payable amount. The USD setting
            is your pricing target, and this button converts that target into ETH and pushes it
            on-chain.
          </p>
        </Card>
      )}

      <Card className="space-y-5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-violet/10">
            <DollarSign size={18} className="text-accent-violet" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-text">Mint Configuration</h3>
            <p className="text-xs text-muted">Controls for minting behaviour</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Max Per Wallet"
            value={settings.max_per_wallet}
            onChange={(e) => updateField("max_per_wallet", e.target.value)}
            placeholder="10"
            type="number"
          />
          <Input
            label="Mint Window (hours)"
            value={settings.mint_window_hours}
            onChange={(e) => updateField("mint_window_hours", e.target.value)}
            placeholder="72"
            type="number"
          />
        </div>

        <div className="flex items-center justify-between border-t border-border-light py-3">
          <div>
            <p className="text-sm font-medium text-text">Sale Status</p>
            <p className="mt-0.5 text-xs text-muted">
              {settings.sale_active === "true" ? "Mint is live" : "Mint is currently paused"}
            </p>
          </div>

          <button
            onClick={() =>
              updateField("sale_active", settings.sale_active === "true" ? "false" : "true")
            }
            className={`relative h-6 w-12 rounded-full transition-colors duration-300 ${
              settings.sale_active !== "true"
                ? "border border-border bg-surface2"
                : "border border-success/30 bg-success/20"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full transition-all duration-300 ${
                settings.sale_active !== "true"
                  ? "left-0.5 bg-muted-dim"
                  : "left-[26px] bg-success"
              }`}
            />
          </button>
        </div>
      </Card>

      <Card className="space-y-5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
            <Bell size={18} className="text-warning" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-text">Push Notifications</h3>
            <p className="text-xs text-muted">Pushover notifications to your phone</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={testPushover}
            disabled={pushTestResult === "sending"}
          >
            {pushTestResult === "sending" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Bell size={14} />
            )}
            Test Notification
          </Button>

          {pushTestResult === "success" && <Badge color="success">Sent! Check your phone</Badge>}
          {pushTestResult === "failed" && <Badge color="danger">Failed — check Pushover keys in env</Badge>}
          <span className="text-xs text-muted">Set PUSHOVER_USER_KEY and PUSHOVER_APP_TOKEN in .env</span>
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
          <div className="relative mx-4 w-full max-w-sm space-y-4 rounded-2xl p-6 glass-strong">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                <AlertTriangle size={20} className="text-warning" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-text">Confirm Changes</h3>
                <p className="text-xs text-muted">This will update all database settings.</p>
              </div>
            </div>

            <div className="max-h-60 space-y-2 overflow-y-auto rounded-xl bg-surface2/50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Treasury</span>
                <span className="max-w-[150px] truncate font-mono text-xs text-text">
                  {settings.treasury_wallet || "—"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Buy Fee</span>
                <span className="font-mono text-text">{settings.buy_fee} ETH</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Mint Fee</span>
                <span className="font-mono text-text">{settings.minting_fee} ETH</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Create Mint Fee</span>
                <span className="font-mono text-text">
                  {formatUsd(settings.create_mint_fee_usd) || `$${settings.create_mint_fee_usd}`}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Planned On-Chain Fee</span>
                <span className="font-mono text-text">
                  {liveCreateMintEth ? `${liveCreateMintEth} ETH` : "—"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Current On-Chain Fee</span>
                <span className="font-mono text-text">
                  {onChainFee ? `${onChainFee} ETH` : "—"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Current On-Chain USD</span>
                <span className="font-mono text-text">
                  {onChainFeeUsd ? formatUsd(onChainFeeUsd) : "—"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Target Match</span>
                <span className="font-mono text-text">{feeDriftLabel}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Sale</span>
                <span className={settings.sale_active === "true" ? "text-success" : "text-warning"}>
                  {settings.sale_active === "true" ? "Live" : "Paused"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted">Locked Mint Price</span>
                <span className="font-mono text-xs text-text">{settings.mint_price_eth || "—"} ETH</span>
              </div>
            </div>

            <p className="text-[10px] text-muted-dim">
              Saving changes updates the database only. Updating the real creator mint price users
              pay still requires the on-chain button above.
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